import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useExecutionStore } from './ExecutionStore';
import { useAgentManagementStore } from './AgentManagementStore';
import { useTaskManagementStore } from './TaskManagementStore';
import { useToolExecutionStore } from './ToolExecutionStore';
import { useLogStore } from './LogStore';
import { useHistoryStore } from './HistoryStore';
import { useExecutionGraphStore } from './ExecutionGraphStore';
import { useRealtimeStore } from './RealtimeStore';
import { useLogStore as useLogStoreImport } from './LogStore';

// Export all individual stores
export { useExecutionStore } from './ExecutionStore';
export { useAgentManagementStore } from './AgentManagementStore';
export { useTaskManagementStore } from './TaskManagementStore';
export { useToolExecutionStore } from './ToolExecutionStore';
export { useLogStore } from './LogStore';
export { useHistoryStore } from './HistoryStore';
export { useExecutionGraphStore } from './ExecutionGraphStore';
export { useRealtimeStore } from './RealtimeStore';

// Export types
export * from './types';

// Main orchestrator store that provides a unified interface
interface AgentTaskOrchestratorState {
  // Current execution management
  setCurrentExecution: (executionId: string | null) => Promise<void>;
  clearCurrentExecution: () => void;
  
  // Initialization
  initializeStores: () => void;
  
  // Convenience methods that coordinate between stores
  createExecutionWithLogging: (taskDescription: string, chatId?: string, workspaceId?: string) => Promise<string>;
  deleteExecutionCompletely: (executionId: string) => Promise<void>;
}

export const useAgentTaskOrchestrator = create<AgentTaskOrchestratorState>()(
  persist(
    (set, get) => ({
      setCurrentExecution: async (executionId: string | null) => {
        if (!executionId) {
          useExecutionStore.getState().clearCurrentExecution();
          useExecutionGraphStore.getState().clearCurrentGraph();
          useAgentManagementStore.getState().clearAgents();
          useTaskManagementStore.getState().clearTasks();
          useToolExecutionStore.getState().clearToolExecutions();
          useLogStore.getState().clearLogs();
          return;
        }

        try {
          // Load the execution graph which includes all related data
          await useExecutionGraphStore.getState().loadExecutionGraph(executionId);
          
          const graph = useExecutionGraphStore.getState().currentGraph;
          if (graph) {
            // Set the current execution
            useExecutionStore.getState().setCurrentExecution(graph.execution);
            
            // Populate individual stores with the graph data
            useAgentManagementStore.getState().setAgents(graph.agents);
            useTaskManagementStore.getState().setTasks(graph.tasks);
            useToolExecutionStore.getState().setToolExecutions(graph.toolExecutions);
            useLogStore.getState().setLogs(graph.logs);
          }
        } catch (error) {
          console.error('[AgentTaskOrchestrator] Error setting current execution:', error);
          throw error;
        }
      },

      clearCurrentExecution: () => {
        useExecutionStore.getState().clearCurrentExecution();
        useExecutionGraphStore.getState().clearCurrentGraph();
        useAgentManagementStore.getState().clearAgents();
        useTaskManagementStore.getState().clearTasks();
        useToolExecutionStore.getState().clearToolExecutions();
        useLogStore.getState().clearLogs();
      },

      initializeStores: () => {
        // The previous implementation calling `setStoreReferences` was
        // deprecated. `RealtimeStore` now accesses other stores directly.
      },

      createExecutionWithLogging: async (taskDescription: string, chatId?: string, workspaceId?: string) => {
        try {
          // Create the execution
          const executionId = await useExecutionStore.getState().createExecution(taskDescription, chatId, workspaceId);
          
          // Add initial log
          await useLogStore.getState().addLog(executionId, 'info', `OSSwarm execution created: ${taskDescription}`);
          
          // Add to history
          const execution = useExecutionStore.getState().currentExecution;
          if (execution) {
            useHistoryStore.getState().addExecution(execution);
          }
          
          return executionId;
        } catch (error) {
          console.error('[AgentTaskOrchestrator] Error creating execution with logging:', error);
          throw error;
        }
      },

      deleteExecutionCompletely: async (executionId: string) => {
        try {
          console.log('[AgentTaskOrchestrator] Starting complete deletion for:', executionId);
          
          // ✅ Delete from database first (this handles cascade deletion)
          await useExecutionStore.getState().deleteExecution(executionId);
          console.log('[AgentTaskOrchestrator] Database deletion completed');
          
          // ✅ Remove from history store state
          useHistoryStore.getState().removeExecution(executionId);
          console.log('[AgentTaskOrchestrator] Removed from history state');
          
          // ✅ Clear current execution if it matches
          const currentExecution = useExecutionStore.getState().currentExecution;
          if (currentExecution?.id === executionId) {
            get().clearCurrentExecution();
            console.log('[AgentTaskOrchestrator] Cleared current execution');
          }
          
          console.log('[AgentTaskOrchestrator] Complete deletion finished for:', executionId);
        } catch (error) {
          console.error('[AgentTaskOrchestrator] Error deleting execution completely:', error);
          throw error;
        }
      }
    }),
    {
      name: 'agent-task-orchestrator'
    }
  )
);

// Initialize stores on module load
useAgentTaskOrchestrator.getState().initializeStores(); 