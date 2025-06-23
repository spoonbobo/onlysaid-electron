import { create } from 'zustand';
import { 
  ExecutionUpdateData, 
  AgentUpdateData, 
  TaskUpdateData, 
  ToolExecutionUpdateData,
  OSSwarmToolExecution,
  OSSwarmAgent,
  OSSwarmTask
} from './types';

interface RealtimeState {
  // Real-time update handlers
  handleExecutionUpdate: (data: ExecutionUpdateData) => void;
  handleAgentUpdate: (data: AgentUpdateData) => void;
  handleTaskUpdate: (data: TaskUpdateData) => void;
  handleToolExecutionUpdate: (data: ToolExecutionUpdateData) => void;
  
  // Store references for coordinated updates
  setStoreReferences: (stores: {
    executionStore: any;
    agentStore: any;
    taskStore: any;
    toolExecutionStore: any;
    graphStore: any;
    historyStore: any;
  }) => void;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => {
  let storeRefs: any = {};

  return {
    handleExecutionUpdate: (data: ExecutionUpdateData) => {
    //   console.log('[RealtimeStore] Handling execution update:', data);
      
      // Update execution store
      if (storeRefs.executionStore) {
        storeRefs.executionStore.getState().handleExecutionUpdate(data);
      }
      
      // Update history store
      if (storeRefs.historyStore) {
        storeRefs.historyStore.getState().updateExecution(data.executionId, {
          status: data.status as any,
          result: data.result,
          error: data.error
        });
      }
      
      // Update graph store if this is the current execution
      if (storeRefs.graphStore) {
        const currentGraph = storeRefs.graphStore.getState().currentGraph;
        if (currentGraph?.execution?.id === data.executionId) {
          storeRefs.graphStore.getState().setCurrentGraph({
            ...currentGraph,
            execution: {
              ...currentGraph.execution,
              status: data.status as any,
              result: data.result,
              error: data.error,
              completed_at: (data.status === 'completed' || data.status === 'failed') 
                ? new Date().toISOString() 
                : currentGraph.execution.completed_at
            }
          });
        }
      }
    },

    handleAgentUpdate: (data: AgentUpdateData) => {
    //   console.log('[RealtimeStore] Handling agent update:', data);
      
      // Update agent store
      if (storeRefs.agentStore) {
        storeRefs.agentStore.getState().handleAgentUpdate(data);
      }
      
      // Update graph store if this is the current execution
      if (storeRefs.graphStore) {
        const currentGraph = storeRefs.graphStore.getState().currentGraph;
        if (currentGraph?.execution?.id === data.executionId) {
          const updatedAgents = currentGraph.agents.map((agent: OSSwarmAgent) => 
            agent.id === data.agentId 
              ? { 
                  ...agent, 
                  status: data.status as any, 
                  current_task: data.currentTask,
                  completed_at: (data.status === 'completed' || data.status === 'failed') 
                    ? new Date().toISOString() 
                    : agent.completed_at
                }
              : agent
          );

          storeRefs.graphStore.getState().setCurrentGraph({
            ...currentGraph,
            agents: updatedAgents
          });
        }
      }
    },

    handleTaskUpdate: (data: TaskUpdateData) => {
      console.log('[RealtimeStore] Handling task update:', data);
      
      // Update task store
      if (storeRefs.taskStore) {
        storeRefs.taskStore.getState().handleTaskUpdate(data);
      }
      
      // Update graph store if this is the current execution
      if (storeRefs.graphStore) {
        const currentGraph = storeRefs.graphStore.getState().currentGraph;
        if (currentGraph?.execution?.id === data.executionId) {
          const updatedTasks = currentGraph.tasks.map((task: OSSwarmTask) => 
            task.id === data.taskId 
              ? { 
                  ...task, 
                  status: data.status as any, 
                  result: data.result,
                  error: data.error,
                  completed_at: (data.status === 'completed' || data.status === 'failed') 
                    ? new Date().toISOString() 
                    : task.completed_at
                }
              : task
          );

          storeRefs.graphStore.getState().setCurrentGraph({
            ...currentGraph,
            tasks: updatedTasks
          });
        }
      }
    },

    handleToolExecutionUpdate: (data: ToolExecutionUpdateData) => {
      console.log('[RealtimeStore] Handling tool execution update:', data);
      
      // Update tool execution store
      if (storeRefs.toolExecutionStore) {
        storeRefs.toolExecutionStore.getState().handleToolExecutionUpdate(data);
      }
      
      // Update graph store if this is the current execution
      if (storeRefs.graphStore) {
        const currentGraph = storeRefs.graphStore.getState().currentGraph;
        if (currentGraph?.execution?.id === data.executionId) {
          const updatedToolExecutions = currentGraph.toolExecutions.map((toolExec: OSSwarmToolExecution) => 
            toolExec.id === data.toolExecutionId 
              ? { 
                  ...toolExec, 
                  status: data.status as any, 
                  result: data.result,
                  error: data.error,
                  execution_time: data.executionTime,
                  completed_at: (data.status === 'completed' || data.status === 'failed') 
                    ? new Date().toISOString() 
                    : toolExec.completed_at
                }
              : toolExec
          );

          storeRefs.graphStore.getState().setCurrentGraph({
            ...currentGraph,
            toolExecutions: updatedToolExecutions
          });
        }
      }
    },

    setStoreReferences: (stores) => {
      storeRefs = stores;
    }
  };
}); 