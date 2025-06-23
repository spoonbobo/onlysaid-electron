import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { DBTABLES } from '@/../../constants/db';
import { getUserFromStore } from '@/utils/user';
import { OSSwarmExecution, ExecutionUpdateData } from './types';

interface ExecutionState {
  // Current execution
  currentExecution: OSSwarmExecution | null;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createExecution: (taskDescription: string, chatId?: string, workspaceId?: string) => Promise<string>;
  updateExecutionStatus: (executionId: string, status: OSSwarmExecution['status'], result?: string, error?: string) => Promise<void>;
  setCurrentExecution: (execution: OSSwarmExecution | null) => void;
  clearCurrentExecution: () => void;
  deleteExecution: (executionId: string) => Promise<void>;
  forceDeleteExecution: (executionId: string) => Promise<void>;
  
  // Real-time updates
  handleExecutionUpdate: (data: ExecutionUpdateData) => void;
}

export const useExecutionStore = create<ExecutionState>()(
  persist(
    (set, get) => ({
      currentExecution: null,
      isLoading: false,
      error: null,

      createExecution: async (taskDescription: string, chatId?: string, workspaceId?: string) => {
        const executionId = uuidv4();
        const currentUser = getUserFromStore();
        const now = new Date().toISOString();

        const execution: OSSwarmExecution = {
          id: executionId,
          task_description: taskDescription,
          status: 'pending',
          created_at: now,
          user_id: currentUser?.id,
          chat_id: chatId,
          workspace_id: workspaceId,
          total_agents: 0,
          total_tasks: 0,
          total_tool_executions: 0
        };

        try {
          set({ isLoading: true, error: null });
          
          await window.electron.db.query({
            query: `
              INSERT INTO ${DBTABLES.OSSWARM_EXECUTIONS}
              (id, task_description, status, created_at, user_id, chat_id, workspace_id, total_agents, total_tasks, total_tool_executions)
              VALUES (@id, @task_description, @status, @created_at, @user_id, @chat_id, @workspace_id, @total_agents, @total_tasks, @total_tool_executions)
            `,
            params: {
              id: executionId,
              task_description: taskDescription,
              status: 'pending',
              created_at: now,
              user_id: currentUser?.id || null,
              chat_id: chatId || null,
              workspace_id: workspaceId || null,
              total_agents: 0,
              total_tasks: 0,
              total_tool_executions: 0
            }
          });

          set({ currentExecution: execution, isLoading: false });
          
          return executionId;
        } catch (error: any) {
          console.error('[ExecutionStore] Error creating execution:', error);
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateExecutionStatus: async (executionId: string, status: OSSwarmExecution['status'], result?: string, error?: string) => {
        const now = new Date().toISOString();
        const updates: any = { status };
        
        if (status === 'running' && !get().currentExecution?.started_at) {
          updates.started_at = now;
        } else if ((status === 'completed' || status === 'failed') && !get().currentExecution?.completed_at) {
          updates.completed_at = now;
        }
        
        if (result) updates.result = result;
        if (error) updates.error = error;

        try {
          const setClause = Object.keys(updates).map(key => `${key} = @${key}`).join(', ');
          
          await window.electron.db.query({
            query: `UPDATE ${DBTABLES.OSSWARM_EXECUTIONS} SET ${setClause} WHERE id = @id`,
            params: { ...updates, id: executionId }
          });

          set(state => ({
            currentExecution: state.currentExecution?.id === executionId 
              ? { ...state.currentExecution, ...updates }
              : state.currentExecution
          }));
        } catch (error: any) {
          console.error('[ExecutionStore] Error updating execution status:', error);
          set({ error: error.message });
          throw error;
        }
      },

      setCurrentExecution: (execution: OSSwarmExecution | null) => {
        set({ currentExecution: execution });
      },

      clearCurrentExecution: () => {
        set({ currentExecution: null });
      },

      deleteExecution: async (executionId: string) => {
        try {
          await window.electron.db.query({
            query: 'BEGIN TRANSACTION',
            params: {}
          });

          try {
            const currentUser = getUserFromStore();
            const executionCheck = await window.electron.db.query({
              query: `SELECT id, user_id FROM ${DBTABLES.OSSWARM_EXECUTIONS} WHERE id = @id`,
              params: { id: executionId }
            });

            if (!executionCheck || executionCheck.length === 0) {
              throw new Error('Execution not found');
            }

            if (executionCheck[0].user_id !== currentUser?.id) {
              throw new Error('Not authorized to delete this execution');
            }

            // Delete in reverse dependency order
            await window.electron.db.query({
              query: `DELETE FROM ${DBTABLES.OSSWARM_LOGS} WHERE execution_id = @id`,
              params: { id: executionId }
            });

            await window.electron.db.query({
              query: `DELETE FROM ${DBTABLES.OSSWARM_TOOL_EXECUTIONS} WHERE execution_id = @id`,
              params: { id: executionId }
            });

            await window.electron.db.query({
              query: `DELETE FROM ${DBTABLES.OSSWARM_TASKS} WHERE execution_id = @id`,
              params: { id: executionId }
            });

            await window.electron.db.query({
              query: `DELETE FROM ${DBTABLES.OSSWARM_AGENTS} WHERE execution_id = @id`,
              params: { id: executionId }
            });

            await window.electron.db.query({
              query: `DELETE FROM ${DBTABLES.OSSWARM_EXECUTIONS} WHERE id = @id`,
              params: { id: executionId }
            });

            await window.electron.db.query({
              query: 'COMMIT',
              params: {}
            });

            set(state => ({
              currentExecution: state.currentExecution?.id === executionId ? null : state.currentExecution
            }));

            console.log(`[ExecutionStore] Successfully deleted execution: ${executionId}`);
          } catch (error) {
            await window.electron.db.query({
              query: 'ROLLBACK',
              params: {}
            });
            throw error;
          }
        } catch (error: any) {
          console.error('[ExecutionStore] Error deleting execution:', error);
          set({ error: error.message });
          throw error;
        }
      },

      forceDeleteExecution: async (executionId: string) => {
        console.log(`[ExecutionStore] Force deleting execution: ${executionId}`);

        // Optimistic UI update
        set(state => ({
          currentExecution: state.currentExecution?.id === executionId ? null : state.currentExecution
        }));

        try {
          await window.electron.db.query({ query: 'PRAGMA foreign_keys = OFF', params: {} });
          await window.electron.db.query({ query: 'BEGIN TRANSACTION', params: {} });

          // Delete children then parent
          await window.electron.db.query({
            query: `DELETE FROM ${DBTABLES.OSSWARM_LOGS} WHERE execution_id = @id`,
            params: { id: executionId }
          });
          await window.electron.db.query({
            query: `DELETE FROM ${DBTABLES.OSSWARM_TOOL_EXECUTIONS} WHERE execution_id = @id`,
            params: { id: executionId }
          });
          await window.electron.db.query({
            query: `DELETE FROM ${DBTABLES.OSSWARM_TASKS} WHERE execution_id = @id`,
            params: { id: executionId }
          });
          await window.electron.db.query({
            query: `DELETE FROM ${DBTABLES.OSSWARM_AGENTS} WHERE execution_id = @id`,
            params: { id: executionId }
          });
          await window.electron.db.query({
            query: `DELETE FROM ${DBTABLES.OSSWARM_EXECUTIONS} WHERE id = @id`,
            params: { id: executionId }
          });

          await window.electron.db.query({ query: 'COMMIT', params: {} });
          console.log('[ExecutionStore] ✅ Force delete committed');
        } catch (err) {
          console.error('[ExecutionStore] ❌ Force delete failed, rolling-back', err);
          await window.electron.db.query({ query: 'ROLLBACK', params: {} });
          throw err;
        } finally {
          await window.electron.db.query({ query: 'PRAGMA foreign_keys = ON', params: {} });
        }
      },

      handleExecutionUpdate: (data: ExecutionUpdateData) => {
        const { executionId, status, result, error } = data;
        
        set(state => {
          if (state.currentExecution?.id !== executionId) {
            return state;
          }

          return {
            currentExecution: {
              ...state.currentExecution,
              status: status as OSSwarmExecution['status'],
              result,
              error,
              completed_at: (status === 'completed' || status === 'failed') 
                ? new Date().toISOString() 
                : state.currentExecution.completed_at
            }
          };
        });
      }
    }),
    {
      name: 'execution-store'
    }
  )
); 