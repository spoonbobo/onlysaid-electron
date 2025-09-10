import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DBTABLES } from '@/../../constants/db';
import { getUserFromStore } from '@/utils/user';
import { OSSwarmExecution, ExecutionStats } from './types';

interface HistoryState {
  // Execution history
  executions: OSSwarmExecution[];
  
  // Loading states
  isLoadingHistory: boolean;
  historyError: string | null;
  
  // Actions
  loadExecutionHistory: (limit?: number, offset?: number) => Promise<void>;
  searchExecutionHistory: (query: string, limit?: number) => Promise<OSSwarmExecution[]>;
  getExecutionsByStatus: (status: OSSwarmExecution['status'], limit?: number) => Promise<OSSwarmExecution[]>;
  getExecutionsByDateRange: (startDate: Date, endDate: Date) => Promise<OSSwarmExecution[]>;
  getExecutionStats: () => Promise<ExecutionStats>;
  exportExecutionData: (executionId: string) => Promise<any>;
  
  // Bulk operations
  deleteMultipleExecutions: (executionIds: string[]) => Promise<void>;
  archiveExecution: (executionId: string) => Promise<void>;
  nukeAllExecutions: () => Promise<void>;
  
  // State management
  setExecutions: (executions: OSSwarmExecution[]) => void;
  addExecution: (execution: OSSwarmExecution) => void;
  removeExecution: (executionId: string) => void;
  updateExecution: (executionId: string, updates: Partial<OSSwarmExecution>) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      executions: [],
      isLoadingHistory: false,
      historyError: null,

      loadExecutionHistory: async (limit = 50, offset = 0) => {
        set({ isLoadingHistory: true, historyError: null });

        try {
          const currentUser = getUserFromStore();
          const executions = await window.electron.db.query({
            query: `
              SELECT * FROM ${DBTABLES.OSSWARM_EXECUTIONS} 
              WHERE user_id = @user_id 
              ORDER BY created_at DESC 
              LIMIT @limit OFFSET @offset
            `,
            params: { 
              user_id: currentUser?.id || '',
              limit,
              offset
            }
          });

          set(state => ({
            executions: offset === 0 ? (executions || []) : [...state.executions, ...(executions || [])],
            isLoadingHistory: false
          }));
        } catch (error: any) {
          console.error('[HistoryStore] Error loading execution history:', error);
          set({ historyError: error.message, isLoadingHistory: false });
          throw error;
        }
      },

      searchExecutionHistory: async (query: string, limit = 20) => {
        try {
          const currentUser = getUserFromStore();
          const executions = await window.electron.db.query({
            query: `
              SELECT * FROM ${DBTABLES.OSSWARM_EXECUTIONS} 
              WHERE user_id = @user_id AND (
                task_description LIKE @query OR
                result LIKE @query OR
                error LIKE @query
              )
              ORDER BY created_at DESC 
              LIMIT @limit
            `,
            params: { 
              user_id: currentUser?.id || '',
              query: `%${query}%`,
              limit
            }
          });

          return executions || [];
        } catch (error: any) {
          console.error('[HistoryStore] Error searching execution history:', error);
          throw error;
        }
      },

      getExecutionsByStatus: async (status: OSSwarmExecution['status'], limit = 50) => {
        try {
          const currentUser = getUserFromStore();
          const executions = await window.electron.db.query({
            query: `
              SELECT * FROM ${DBTABLES.OSSWARM_EXECUTIONS} 
              WHERE user_id = @user_id AND status = @status
              ORDER BY created_at DESC 
              LIMIT @limit
            `,
            params: { 
              user_id: currentUser?.id || '',
              status,
              limit
            }
          });

          return executions || [];
        } catch (error: any) {
          console.error('[HistoryStore] Error getting executions by status:', error);
          throw error;
        }
      },

      getExecutionsByDateRange: async (startDate: Date, endDate: Date) => {
        try {
          const currentUser = getUserFromStore();
          const executions = await window.electron.db.query({
            query: `
              SELECT * FROM ${DBTABLES.OSSWARM_EXECUTIONS} 
              WHERE user_id = @user_id 
              AND created_at >= @start_date 
              AND created_at <= @end_date
              ORDER BY created_at DESC
            `,
            params: { 
              user_id: currentUser?.id || '',
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString()
            }
          });

          return executions || [];
        } catch (error: any) {
          console.error('[HistoryStore] Error getting executions by date range:', error);
          throw error;
        }
      },

      getExecutionStats: async () => {
        try {
          const currentUser = getUserFromStore();
          
          // Get total counts
          const totals = await window.electron.db.query({
            query: `
              SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running
              FROM ${DBTABLES.OSSWARM_EXECUTIONS} 
              WHERE user_id = @user_id
            `,
            params: { user_id: currentUser?.id || '' }
          });

          // Get executions by date (last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const byDate = await window.electron.db.query({
            query: `
              SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
              FROM ${DBTABLES.OSSWARM_EXECUTIONS} 
              WHERE user_id = @user_id AND created_at >= @start_date
              GROUP BY DATE(created_at)
              ORDER BY date DESC
            `,
            params: { 
              user_id: currentUser?.id || '',
              start_date: thirtyDaysAgo.toISOString()
            }
          });

          return {
            total: totals[0]?.total || 0,
            completed: totals[0]?.completed || 0,
            failed: totals[0]?.failed || 0,
            running: totals[0]?.running || 0,
            byDate: byDate || []
          };
        } catch (error: any) {
          console.error('[HistoryStore] Error getting execution stats:', error);
          throw error;
        }
      },

      exportExecutionData: async (executionId: string) => {
        try {
          // Load full execution data
          const execution = await window.electron.db.query({
            query: `SELECT * FROM ${DBTABLES.OSSWARM_EXECUTIONS} WHERE id = @id`,
            params: { id: executionId }
          });

          const agents = await window.electron.db.query({
            query: `SELECT * FROM ${DBTABLES.OSSWARM_AGENTS} WHERE execution_id = @execution_id`,
            params: { execution_id: executionId }
          });

          const tasks = await window.electron.db.query({
            query: `SELECT * FROM ${DBTABLES.OSSWARM_TASKS} WHERE execution_id = @execution_id`,
            params: { execution_id: executionId }
          });

          const toolExecutions = await window.electron.db.query({
            query: `SELECT * FROM ${DBTABLES.OSSWARM_TOOL_EXECUTIONS} WHERE execution_id = @execution_id`,
            params: { execution_id: executionId }
          });

          const logs = await window.electron.db.query({
            query: `SELECT * FROM ${DBTABLES.OSSWARM_LOGS} WHERE execution_id = @execution_id`,
            params: { execution_id: executionId }
          });
          
          const exportData = {
            execution: execution?.[0],
            agents: agents || [],
            tasks: tasks || [],
            toolExecutions: toolExecutions || [],
            logs: logs || [],
            exportedAt: new Date().toISOString(),
            version: '1.0'
          };

          return exportData;
        } catch (error: any) {
          console.error('[HistoryStore] Error exporting execution data:', error);
          throw error;
        }
      },

      deleteMultipleExecutions: async (executionIds: string[]) => {
        if (executionIds.length === 0) return;

        try {
          await window.electron.db.query({
            query: 'BEGIN TRANSACTION',
            params: {}
          });

          try {
            const currentUser = getUserFromStore();
            
            // Verify ownership of all executions
            const placeholders = executionIds.map(() => '?').join(',');
            const executionCheck = await window.electron.db.query({
              query: `SELECT id, user_id FROM ${DBTABLES.OSSWARM_EXECUTIONS} WHERE id IN (${placeholders})`,
              params: executionIds
            });

            if (!executionCheck || executionCheck.length !== executionIds.length) {
              throw new Error('Some executions not found');
            }

            const unauthorizedExecs = executionCheck.filter((exec: { id: string; user_id: string }) => exec.user_id !== currentUser?.id);
            if (unauthorizedExecs.length > 0) {
              throw new Error('Not authorized to delete some executions');
            }

            // Delete in batches to avoid SQL parameter limits
            const batchSize = 50;
            for (let i = 0; i < executionIds.length; i += batchSize) {
              const batch = executionIds.slice(i, i + batchSize);
              const batchPlaceholders = batch.map(() => '?').join(',');

              // Delete in reverse dependency order
              await window.electron.db.query({
                query: `DELETE FROM ${DBTABLES.OSSWARM_LOGS} WHERE execution_id IN (${batchPlaceholders})`,
                params: batch
              });

              await window.electron.db.query({
                query: `DELETE FROM ${DBTABLES.OSSWARM_TOOL_EXECUTIONS} WHERE execution_id IN (${batchPlaceholders})`,
                params: batch
              });

              await window.electron.db.query({
                query: `DELETE FROM ${DBTABLES.OSSWARM_TASKS} WHERE execution_id IN (${batchPlaceholders})`,
                params: batch
              });

              await window.electron.db.query({
                query: `DELETE FROM ${DBTABLES.OSSWARM_AGENTS} WHERE execution_id IN (${batchPlaceholders})`,
                params: batch
              });

              await window.electron.db.query({
                query: `DELETE FROM ${DBTABLES.OSSWARM_EXECUTIONS} WHERE id IN (${batchPlaceholders})`,
                params: batch
              });
            }

            await window.electron.db.query({
              query: 'COMMIT',
              params: {}
            });

            // Update local state
            set(state => ({
              executions: state.executions.filter(exec => !executionIds.includes(exec.id))
            }));

            console.log(`[HistoryStore] Successfully deleted ${executionIds.length} executions`);
          } catch (error) {
            await window.electron.db.query({
              query: 'ROLLBACK',
              params: {}
            });
            throw error;
          }
        } catch (error: any) {
          console.error('[HistoryStore] Error deleting multiple executions:', error);
          throw error;
        }
      },

      archiveExecution: async (executionId: string) => {
        try {
          await window.electron.db.query({
            query: `UPDATE ${DBTABLES.OSSWARM_EXECUTIONS} SET archived = 1 WHERE id = @id`,
            params: { id: executionId }
          });

          set(state => ({
            executions: state.executions.filter(exec => exec.id !== executionId)
          }));
        } catch (error: any) {
          console.error('[HistoryStore] Error archiving execution:', error);
          throw error;
        }
      },

      nukeAllExecutions: async () => {
        try {
          const currentUser = getUserFromStore();
          if (!currentUser?.id) {
            throw new Error('User not authenticated');
          }

          console.log('[HistoryStore] NUKING all executions for user:', currentUser.id);
          
          await window.electron.db.query({
            query: 'PRAGMA foreign_keys = OFF',
            params: {}
          });

          try {
            // Get all execution IDs for this user
            const userExecutions = await window.electron.db.query({
              query: `SELECT id FROM ${DBTABLES.OSSWARM_EXECUTIONS} WHERE user_id = @user_id`,
              params: { user_id: currentUser.id }
            });

            const executionIds = userExecutions?.map((exec: any) => exec.id) || [];
            
            if (executionIds.length > 0) {
              const idList = executionIds.map((id: string) => `'${id}'`).join(',');
              
              // Delete all related records
              await window.electron.db.query({
                query: `DELETE FROM ${DBTABLES.OSSWARM_LOGS} WHERE execution_id IN (${idList})`,
                params: {}
              });

              await window.electron.db.query({
                query: `DELETE FROM ${DBTABLES.OSSWARM_TOOL_EXECUTIONS} WHERE execution_id IN (${idList})`,
                params: {}
              });

              await window.electron.db.query({
                query: `DELETE FROM ${DBTABLES.OSSWARM_TASKS} WHERE execution_id IN (${idList})`,
                params: {}
              });

              await window.electron.db.query({
                query: `DELETE FROM ${DBTABLES.OSSWARM_AGENTS} WHERE execution_id IN (${idList})`,
                params: {}
              });

              await window.electron.db.query({
                query: `DELETE FROM ${DBTABLES.OSSWARM_EXECUTIONS} WHERE user_id = @user_id`,
                params: { user_id: currentUser.id }
              });
            }

          } finally {
            await window.electron.db.query({
              query: 'PRAGMA foreign_keys = ON',
              params: {}
            });
          }

          // Clear local state
          set({ executions: [] });
          
          console.log('[HistoryStore] Successfully nuked all executions');
          
        } catch (error: any) {
          console.error('[HistoryStore] Error nuking executions:', error);
          
          try {
            await window.electron.db.query({
              query: 'PRAGMA foreign_keys = ON',
              params: {}
            });
          } catch (pragmaError) {
            console.error('Failed to re-enable foreign keys:', pragmaError);
          }
          
          throw error;
        }
      },

      setExecutions: (executions: OSSwarmExecution[]) => {
        set({ executions });
      },

      addExecution: (execution: OSSwarmExecution) => {
        set(state => ({
          executions: [execution, ...state.executions]
        }));
      },

      removeExecution: (executionId: string) => {
        set(state => ({
          executions: state.executions.filter(exec => exec.id !== executionId)
        }));
      },

      updateExecution: (executionId: string, updates: Partial<OSSwarmExecution>) => {
        set(state => ({
          executions: state.executions.map(exec => 
            exec.id === executionId ? { ...exec, ...updates } : exec
          )
        }));
      },

      clearHistory: () => {
        set({ executions: [], historyError: null });
      }
    }),
    {
      name: 'history-store'
    }
  )
); 

// Register IPC listener: update execution status -> reflect in history store
if (typeof window !== 'undefined' && (window as any).electron?.ipcRenderer) {
  const w = window as any;
  if (!w.__onlysaid_history_execstatus_listener_registered__) {
    w.__onlysaid_history_execstatus_listener_registered__ = true;
    w.electron.ipcRenderer.on('agent:update_execution_status', (event: any, payload?: any) => {
      try {
        const data = payload || {};
        const { executionId, status, result, error } = data as { executionId?: string; status?: string; result?: string; error?: string };
        if (!executionId || !status) return;

        const updates: Partial<OSSwarmExecution> = { status: status as any };
        if (result !== undefined) updates.result = result;
        if (error !== undefined) updates.error = error;
        if (status === 'running' && !useHistoryStore.getState().executions.find(e => e.id === executionId)?.started_at) {
          updates.started_at = new Date().toISOString();
        }
        if ((status === 'completed' || status === 'failed')) {
          updates.completed_at = new Date().toISOString();
        }

        useHistoryStore.getState().updateExecution(executionId, updates);
        // Also refresh stats asynchronously if needed (opt-in)
      } catch (e) {
        console.warn('[HistoryStore] ⚠️ Failed to handle execution status update:', e);
      }
    });
  }
}