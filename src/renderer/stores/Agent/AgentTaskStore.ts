// Compatibility layer for the decomposed AgentTaskStore
// This maintains the same interface while delegating to the new substores

import { create } from 'zustand';
import {
  useExecutionStore,
  useAgentManagementStore,
  useTaskManagementStore,
  useToolExecutionStore,
  useLogStore,
  useHistoryStore,
  useExecutionGraphStore,
  useRealtimeStore,
  useAgentTaskOrchestrator,
  OSSwarmExecution,
  OSSwarmAgent,
  OSSwarmTask,
  OSSwarmToolExecution,
  OSSwarmLog,
  ExecutionGraph,
  FormattedLog,
  ExecutionUpdateData,
  AgentUpdateData,
  TaskUpdateData,
  ToolExecutionUpdateData
} from './task';
import { AgentCard } from '@/../../types/Agent/AgentCard';

// Re-export types for backward compatibility
export type {
  OSSwarmExecution,
  OSSwarmAgent,
  OSSwarmTask,
  OSSwarmToolExecution,
  OSSwarmLog,
  ExecutionGraph
};

interface AgentTaskState {
  // ✅ Reactive state instead of getters
  currentExecution: OSSwarmExecution | null;
  currentGraph: ExecutionGraph | null;
  executions: OSSwarmExecution[];
  isLoading: boolean;
  error: string | null;
  isLoadingHistory: boolean;
  historyError: string | null;
  
  // All the original methods - now delegated to appropriate substores
  createExecution: (taskDescription: string, chatId?: string, workspaceId?: string) => Promise<string>;
  updateExecutionStatus: (executionId: string, status: OSSwarmExecution['status'], result?: string, error?: string) => Promise<void>;
  
  createAgent: (executionId: string, agentId: string, role: string, expertise?: string[]) => Promise<string>;
  updateAgentStatus: (agentId: string, status: OSSwarmAgent['status'], currentTask?: string) => Promise<void>;
  
  createTask: (executionId: string, agentId: string, taskDescription: string, priority?: number) => Promise<string>;
  updateTaskStatus: (taskId: string, status: OSSwarmTask['status'], result?: string, error?: string) => Promise<void>;
  
  createToolExecution: (executionId: string, agentId: string, toolName: string, toolArguments?: any, approvalId?: string, taskId?: string, mcpServer?: string) => Promise<string>;
  updateToolExecutionStatus: (toolExecutionId: string, status: OSSwarmToolExecution['status'], result?: string, error?: string, executionTime?: number) => Promise<void>;
  approveToolExecution: (toolExecutionId: string, approved: boolean) => Promise<void>;
  
  addLog: (executionId: string, logType: OSSwarmLog['log_type'], message: string, agentId?: string, taskId?: string, toolExecutionId?: string, metadata?: any) => Promise<void>;
  
  loadExecutionGraph: (executionId: string) => Promise<void>;
  loadExecutionHistory: (limit?: number, offset?: number) => Promise<void>;
  
  getCurrentExecutionGraph: () => ExecutionGraph | null;
  setCurrentExecution: (executionId: string | null) => Promise<void>;
  
  clearCurrentExecution: () => void;
  deleteExecution: (executionId: string) => Promise<void>;
  
  searchExecutionHistory: (query: string, limit?: number) => Promise<OSSwarmExecution[]>;
  getExecutionsByStatus: (status: OSSwarmExecution['status'], limit?: number) => Promise<OSSwarmExecution[]>;
  getExecutionsByDateRange: (startDate: Date, endDate: Date) => Promise<OSSwarmExecution[]>;
  exportExecutionData: (executionId: string) => Promise<any>;
  getExecutionStats: () => Promise<{
    total: number;
    completed: number;
    failed: number;
    running: number;
    byDate: { date: string; count: number }[];
  }>;
  
  deleteMultipleExecutions: (executionIds: string[]) => Promise<void>;
  archiveExecution: (executionId: string) => Promise<void>;
  
  updateToolExecutionByApprovalId: (approvalId: string, status: OSSwarmToolExecution['status'], result?: string, error?: string, executionTime?: number) => Promise<void>;

  getFormattedLogs: (executionId?: string) => FormattedLog[];
  getLogsByType: (logType: OSSwarmLog['log_type'], executionId?: string) => FormattedLog[];
  searchLogs: (query: string, executionId?: string) => FormattedLog[];

  forceDeleteExecution: (executionId: string) => Promise<void>;
  nukeAllExecutions: () => Promise<void>;

  refreshCurrentExecutionGraph: () => Promise<void>;
  
  handleExecutionUpdate: (data: ExecutionUpdateData) => void;
  handleAgentUpdate: (data: AgentUpdateData) => void;
  handleTaskUpdate: (data: TaskUpdateData) => void;
  handleToolExecutionUpdate: (data: ToolExecutionUpdateData) => void;

  getAgentCards: () => AgentCard[];
  getAgentCardsByExecution: (executionId: string) => AgentCard[];
}

export const useAgentTaskStore = create<AgentTaskState>((set, get) => {
  let isUpdating = false; // Prevent subscription loops
  
  const updateFromStores = () => {
    if (isUpdating) {
      console.log('[AgentTaskStore] Update already in progress, skipping');
      return;
    }
    
    isUpdating = true;
    try {
      const executionState = useExecutionStore.getState();
      const graphState = useExecutionGraphStore.getState();
      const historyState = useHistoryStore.getState();
      const agentState = useAgentManagementStore.getState();
      const taskState = useTaskManagementStore.getState();
      const toolState = useToolExecutionStore.getState();
      const logState = useLogStore.getState();

      set((state) => ({
        ...state,
        currentExecution: executionState.currentExecution,
        currentGraph: graphState.currentGraph,
        executions: historyState.executions,
        isLoading: executionState.isLoading || 
                   graphState.isLoading ||
                   agentState.isLoading ||
                   taskState.isLoading ||
                   toolState.isLoading ||
                   logState.isLoading,
        error: executionState.error || 
               graphState.error ||
               agentState.error ||
               taskState.error ||
               toolState.error ||
               logState.error,
        isLoadingHistory: historyState.isLoadingHistory,
        historyError: historyState.historyError,
      }));
    } catch (error) {
      console.error('[AgentTaskStore] Error updating from stores:', error);
    } finally {
      isUpdating = false;
    }
  };

  const initialState: AgentTaskState = {
    // Initial reactive state
    currentExecution: null,
    currentGraph: null,
    executions: [],
    isLoading: false,
    error: null,
    isLoadingHistory: false,
    historyError: null,

    // Agent card functions
    getAgentCards: () => {
      try {
        const agentStore = useAgentManagementStore.getState();
        if (agentStore && typeof agentStore.getAgentCards === 'function') {
          return agentStore.getAgentCards() || [];
        }
        return [];
      } catch (error) {
        console.warn('[AgentTaskStore] Error getting agent cards:', error);
        return [];
      }
    },

    getAgentCardsByExecution: (executionId: string) => {
      try {
        if (!executionId) return [];
        const agentStore = useAgentManagementStore.getState();
        if (agentStore && typeof agentStore.getAgentCardsByExecution === 'function') {
          return agentStore.getAgentCardsByExecution(executionId) || [];
        }
        return [];
      } catch (error) {
        console.warn('[AgentTaskStore] Error getting agent cards by execution:', error);
        return [];
      }
    },

    // ✅ Replace all get().updateFromStores() with updateFromStores()
    createExecution: async (taskDescription: string, chatId?: string, workspaceId?: string) => {
      const result = await useAgentTaskOrchestrator.getState().createExecutionWithLogging(taskDescription, chatId, workspaceId);
      updateFromStores();
      return result;
    },

    updateExecutionStatus: async (executionId: string, status: OSSwarmExecution['status'], result?: string, error?: string) => {
      await useExecutionStore.getState().updateExecutionStatus(executionId, status, result, error);
      await useLogStore.getState().addLog(executionId, 'status_update', `Execution status changed to: ${status}`, undefined, undefined, undefined, { result, error });
      updateFromStores();
    },

    createAgent: async (executionId: string, agentId: string, role: string, expertise?: string[]) => {
      const dbAgentId = await useAgentManagementStore.getState().createAgent(executionId, agentId, role, expertise);
      await useLogStore.getState().addLog(executionId, 'info', `Agent created: ${role} (${agentId})`, dbAgentId);
      updateFromStores();
      return dbAgentId;
    },

    updateAgentStatus: async (agentId: string, status: OSSwarmAgent['status'], currentTask?: string) => {
      await useAgentManagementStore.getState().updateAgentStatus(agentId, status, currentTask);
      updateFromStores();
    },

    createTask: async (executionId: string, agentId: string, taskDescription: string, priority = 0) => {
      const taskId = await useTaskManagementStore.getState().createTask(executionId, agentId, taskDescription, priority);
      await useLogStore.getState().addLog(executionId, 'info', `Task created: ${taskDescription}`, agentId, taskId);
      updateFromStores();
      return taskId;
    },

    updateTaskStatus: async (taskId: string, status: OSSwarmTask['status'], result?: string, error?: string) => {
      await useTaskManagementStore.getState().updateTaskStatus(taskId, status, result, error);
      updateFromStores();
    },

    createToolExecution: async (executionId: string, agentId: string, toolName: string, toolArguments?: any, approvalId?: string, taskId?: string, mcpServer?: string) => {
      const toolExecutionId = await useToolExecutionStore.getState().createToolExecution(executionId, agentId, toolName, toolArguments, approvalId, taskId, mcpServer);
      await useLogStore.getState().addLog(executionId, 'tool_request', `Tool execution requested: ${toolName}`, agentId, taskId, toolExecutionId, { toolArguments, mcpServer });
      updateFromStores();
      return toolExecutionId;
    },

    updateToolExecutionStatus: async (toolExecutionId: string, status: OSSwarmToolExecution['status'], result?: string, error?: string, executionTime?: number) => {
      await useToolExecutionStore.getState().updateToolExecutionStatus(toolExecutionId, status, result, error, executionTime);
      updateFromStores();
    },

    approveToolExecution: async (toolExecutionId: string, approved: boolean) => {
      await useToolExecutionStore.getState().approveToolExecution(toolExecutionId, approved);
      updateFromStores();
    },

    addLog: async (executionId: string, logType: OSSwarmLog['log_type'], message: string, agentId?: string, taskId?: string, toolExecutionId?: string, metadata?: any) => {
      await useLogStore.getState().addLog(executionId, logType, message, agentId, taskId, toolExecutionId, metadata);
      updateFromStores();
    },

    loadExecutionGraph: async (executionId: string) => {
      await useExecutionGraphStore.getState().loadExecutionGraph(executionId);
      updateFromStores();
    },

    loadExecutionHistory: async (limit?: number, offset?: number) => {
      await useHistoryStore.getState().loadExecutionHistory(limit, offset);
      updateFromStores();
    },

    getCurrentExecutionGraph: () => {
      return useExecutionGraphStore.getState().getCurrentExecutionGraph();
    },

    setCurrentExecution: async (executionId: string | null) => {
      try {
        await useAgentTaskOrchestrator.getState().setCurrentExecution(executionId);
        updateFromStores();
      } catch (error) {
        // If execution not found, it's already been cleaned up
        updateFromStores();
        throw error;
      }
    },

    clearCurrentExecution: () => {
      useAgentTaskOrchestrator.getState().clearCurrentExecution();
      updateFromStores();
    },

    deleteExecution: async (executionId: string) => {
      await useAgentTaskOrchestrator.getState().deleteExecutionCompletely(executionId);
      updateFromStores();
    },

    searchExecutionHistory: async (query: string, limit?: number) => {
      return useHistoryStore.getState().searchExecutionHistory(query, limit);
    },

    getExecutionsByStatus: async (status: OSSwarmExecution['status'], limit?: number) => {
      return useHistoryStore.getState().getExecutionsByStatus(status, limit);
    },

    getExecutionsByDateRange: async (startDate: Date, endDate: Date) => {
      return useHistoryStore.getState().getExecutionsByDateRange(startDate, endDate);
    },

    exportExecutionData: async (executionId: string) => {
      return useHistoryStore.getState().exportExecutionData(executionId);
    },

    getExecutionStats: async () => {
      return useHistoryStore.getState().getExecutionStats();
    },

    deleteMultipleExecutions: async (executionIds: string[]) => {
      await useHistoryStore.getState().deleteMultipleExecutions(executionIds);
      updateFromStores();
    },

    archiveExecution: async (executionId: string) => {
      await useHistoryStore.getState().archiveExecution(executionId);
      updateFromStores();
    },

    updateToolExecutionByApprovalId: async (approvalId: string, status: OSSwarmToolExecution['status'], result?: string, error?: string, executionTime?: number) => {
      await useToolExecutionStore.getState().updateToolExecutionByApprovalId(approvalId, status, result, error, executionTime);
      updateFromStores();
    },

    getFormattedLogs: (executionId?: string) => {
      try {
        return useLogStore.getState().getFormattedLogs(executionId) || [];
      } catch (error) {
        console.warn('[AgentTaskStore] Error getting formatted logs:', error);
        return [];
      }
    },

    getLogsByType: (logType: OSSwarmLog['log_type'], executionId?: string) => {
      try {
        return useLogStore.getState().getLogsByType(logType, executionId) || [];
      } catch (error) {
        console.warn('[AgentTaskStore] Error getting logs by type:', error);
        return [];
      }
    },

    searchLogs: (query: string, executionId?: string) => {
      try {
        return useLogStore.getState().searchLogs(query, executionId) || [];
      } catch (error) {
        console.warn('[AgentTaskStore] Error searching logs:', error);
        return [];
      }
    },

    forceDeleteExecution: async (executionId: string) => {
      console.log('[AgentTaskStore] Starting force delete for:', executionId);
      
      try {
        await useExecutionStore.getState().forceDeleteExecution(executionId);
        console.log('[AgentTaskStore] Force delete from database completed');
        
        useHistoryStore.getState().removeExecution(executionId);
        console.log('[AgentTaskStore] Removed from history state');
        
        const currentExecution = useExecutionStore.getState().currentExecution;
        if (currentExecution?.id === executionId) {
          useAgentTaskOrchestrator.getState().clearCurrentExecution();
          console.log('[AgentTaskStore] Cleared current execution');
        }
        
        updateFromStores(); // ✅ Fixed
        console.log('[AgentTaskStore] Force delete completed for:', executionId);
      } catch (error) {
        console.error('[AgentTaskStore] Force delete failed:', error);
        updateFromStores(); // ✅ Fixed
        throw error;
      }
    },

    nukeAllExecutions: async () => {
      console.log('[AgentTaskStore] Starting nuke all executions');
      
      try {
        await useHistoryStore.getState().nukeAllExecutions();
        console.log('[AgentTaskStore] Nuke completed');
        
        useAgentTaskOrchestrator.getState().clearCurrentExecution();
        console.log('[AgentTaskStore] Cleared current execution after nuke');
        
        updateFromStores(); // ✅ Ensure UI updates
      } catch (error) {
        console.error('[AgentTaskStore] Nuke failed:', error);
        updateFromStores(); // ✅ Update even on error
        throw error;
      }
    },

    refreshCurrentExecutionGraph: async () => {
      await useExecutionGraphStore.getState().refreshCurrentExecutionGraph();
      updateFromStores();
    },

    handleExecutionUpdate: (data: ExecutionUpdateData) => {
      useRealtimeStore.getState().handleExecutionUpdate(data);
      updateFromStores();
    },

    handleAgentUpdate: (data: AgentUpdateData) => {
      useRealtimeStore.getState().handleAgentUpdate(data);
      updateFromStores();
    },

    handleTaskUpdate: (data: TaskUpdateData) => {
      useRealtimeStore.getState().handleTaskUpdate(data);
      updateFromStores();
    },

    handleToolExecutionUpdate: (data: ToolExecutionUpdateData) => {
      useRealtimeStore.getState().handleToolExecutionUpdate(data);
      updateFromStores();
    }
  };

  // ✅ Subscribe to stores
  try {
    const unsubscribeFunctions = [
      useExecutionStore.subscribe(updateFromStores),
      useExecutionGraphStore.subscribe(updateFromStores),
      useHistoryStore.subscribe(updateFromStores),
      useAgentManagementStore.subscribe(updateFromStores),
      useTaskManagementStore.subscribe(updateFromStores),
      useToolExecutionStore.subscribe(updateFromStores),
      useLogStore.subscribe(updateFromStores)
    ];

    console.log('[AgentTaskStore] Successfully set up subscriptions to', unsubscribeFunctions.length, 'stores');
  } catch (error) {
    console.error('[AgentTaskStore] Error setting up subscriptions:', error);
  }

  updateFromStores();
  return initialState;
});

// Initialize the orchestrator when this store is first used
useAgentTaskOrchestrator.getState().initializeStores();
