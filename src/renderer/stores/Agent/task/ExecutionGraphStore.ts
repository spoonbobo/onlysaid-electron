import { create } from 'zustand';
import { DBTABLES } from '@/../../constants/db';
import { getUserFromStore } from '@/utils/user';
import { ExecutionGraph} from './types';
import { useHistoryStore } from './HistoryStore';

interface ExecutionGraphState {
  // Current execution graph
  currentGraph: ExecutionGraph | null;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadExecutionGraph: (executionId: string) => Promise<void>;
  refreshCurrentExecutionGraph: () => Promise<void>;
  setCurrentGraph: (graph: ExecutionGraph | null) => void;
  clearCurrentGraph: () => void;
  getCurrentExecutionGraph: () => ExecutionGraph | null;
}

export const useExecutionGraphStore = create<ExecutionGraphState>((set, get) => ({
  currentGraph: null,
  isLoading: false,
  error: null,

  loadExecutionGraph: async (executionId: string) => {
    set({ isLoading: true, error: null });

    try {
      // ✅ Enhanced execution loading with better error handling
      const executions = await window.electron.db.query({
        query: `SELECT * FROM ${DBTABLES.OSSWARM_EXECUTIONS} WHERE id = @id`,
        params: { id: executionId }
      });

      if (!executions || executions.length === 0) {
        // Remove the stale id so the Task-History list updates instantly
        useHistoryStore.getState().removeExecution(executionId);

        const err = new Error(`Execution not found: ${executionId}`);
        console.warn('[ExecutionGraphStore] Execution not found in database:', executionId);
        throw err;
      }

      // ✅ Validate execution belongs to current user
      const execution = executions[0];
      const currentUser = getUserFromStore();
      if (currentUser?.id && execution.user_id !== currentUser.id) {
        throw new Error('Not authorized to access this execution');
      }

      // Load all related data in parallel
      const [agents, tasks, toolExecutions, logs] = await Promise.all([
        window.electron.db.query({
          query: `SELECT * FROM ${DBTABLES.OSSWARM_AGENTS} WHERE execution_id = @execution_id ORDER BY created_at`,
          params: { execution_id: executionId }
        }),
        window.electron.db.query({
          query: `SELECT * FROM ${DBTABLES.OSSWARM_TASKS} WHERE execution_id = @execution_id ORDER BY created_at`,
          params: { execution_id: executionId }
        }),
        window.electron.db.query({
          query: `SELECT * FROM ${DBTABLES.OSSWARM_TOOL_EXECUTIONS} WHERE execution_id = @execution_id ORDER BY created_at`,
          params: { execution_id: executionId }
        }),
        window.electron.db.query({
          query: `
            SELECT 
              l.*,
              a.role as agent_role,
              t.task_description,
              te.tool_name
            FROM ${DBTABLES.OSSWARM_LOGS} l
            LEFT JOIN ${DBTABLES.OSSWARM_AGENTS} a ON l.agent_id = a.id
            LEFT JOIN ${DBTABLES.OSSWARM_TASKS} t ON l.task_id = t.id
            LEFT JOIN ${DBTABLES.OSSWARM_TOOL_EXECUTIONS} te ON l.tool_execution_id = te.id
            WHERE l.execution_id = @execution_id 
            ORDER BY l.created_at ASC
          `,
          params: { execution_id: executionId }
        })
      ]);

      const graph: ExecutionGraph = {
        execution: execution,
        agents: agents || [],
        tasks: tasks || [],
        toolExecutions: toolExecutions || [],
        logs: logs || []
      };

      set({
        currentGraph: graph,
        isLoading: false
      });

      console.log('[ExecutionGraphStore] Loaded execution graph:', graph);
      console.log(`[ExecutionGraphStore] Loaded execution graph with ${(logs || []).length} logs`);
    } catch (error: any) {
      console.error('[ExecutionGraphStore] Error loading execution graph:', error);
      set({ error: error.message, isLoading: false, currentGraph: null });
      throw error;
    }
  },

  refreshCurrentExecutionGraph: async () => {
    const currentGraph = get().currentGraph;
    if (currentGraph?.execution?.id) {
      console.log('[ExecutionGraphStore] Refreshing current execution graph:', currentGraph.execution.id);
      try {
        await get().loadExecutionGraph(currentGraph.execution.id);
      } catch (error) {
        console.error('[ExecutionGraphStore] Error refreshing execution graph:', error);
      }
    }
  },

  setCurrentGraph: (graph: ExecutionGraph | null) => {
    set({ currentGraph: graph });
  },

  clearCurrentGraph: () => {
    set({ currentGraph: null });
  },

  getCurrentExecutionGraph: () => {
    return get().currentGraph;
  }
})); 