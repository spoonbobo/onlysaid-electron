import { create } from 'zustand';
import { 
  useExecutionStore,
  useExecutionGraphStore,
  useAgentManagementStore,
  useTaskManagementStore,
  useToolExecutionStore,
  useAgentTaskOrchestrator
} from './';
import { OSSwarmExecution, OSSwarmAgent, OSSwarmTask, OSSwarmToolExecution } from './types';

// Real-time update types
export interface ExecutionUpdateData {
  executionId: string;
  status: string;
  result?: string;
  error?: string;
}

export interface AgentUpdateData {
  executionId: string;
  agentId: string;
  status: string;
  currentTask?: string;
}

export interface TaskUpdateData {
  executionId: string;
  taskId: string;
  status: string;
  result?: string;
  error?: string;
}

export interface ToolExecutionUpdateData {
  executionId: string;
  toolExecutionId: string;
  status: string;
  result?: string;
  error?: string;
  executionTime?: number;
}

interface RealtimeState {
  handleExecutionUpdate: (data: ExecutionUpdateData) => void;
  handleAgentUpdate: (data: AgentUpdateData) => void;
  handleTaskUpdate: (data: TaskUpdateData) => void;
  handleToolExecutionUpdate: (data: ToolExecutionUpdateData) => void;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => {
  return {
    handleExecutionUpdate: (data: ExecutionUpdateData) => {
      console.log('[RealtimeStore] Handling execution update:', data);
      
      // ✅ IMPROVED: Use direct store access instead of refs
      const executionStore = useExecutionStore.getState();
      const graphStore = useExecutionGraphStore.getState();
      
      // Update execution store
      if (executionStore.currentExecution?.id === data.executionId) {
        executionStore.setCurrentExecution({
          ...executionStore.currentExecution,
          status: data.status as any,
          result: data.result,
          error: data.error,
          completed_at: (data.status === 'completed' || data.status === 'failed') 
            ? new Date().toISOString() 
            : executionStore.currentExecution.completed_at
        });
      }
      
      // Update graph store if this is the current execution
      const currentGraph = graphStore.currentGraph;
      if (currentGraph?.execution?.id === data.executionId) {
        graphStore.setCurrentGraph({
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
    },

    handleAgentUpdate: (data: AgentUpdateData) => {
      console.log('[RealtimeStore] 🤖 Handling agent update:', data);
      
      // ✅ IMPROVED: Use direct store access and better agent matching
      const agentStore = useAgentManagementStore.getState();
      const graphStore = useExecutionGraphStore.getState();
      
      // ✅ FIXED: Only update database if we have a valid agent ID
      if (data.agentId) {
        agentStore.updateAgentStatus(data.agentId, data.status as any, data.currentTask).catch(error => {
          console.error('[RealtimeStore] Failed to persist agent status update:', error);
        });
      } else {
        console.warn('[RealtimeStore] ⚠️ Skipping database update - no agent ID provided:', data);
      }
      
      // ✅ FIXED: Always update graph store for real-time display
      const currentGraph = graphStore.currentGraph;
      if (currentGraph?.execution?.id === data.executionId) {
        const updatedAgents = currentGraph.agents.map((agent: OSSwarmAgent) => {
          // ✅ IMPROVED: Multiple matching strategies for better reliability
          const agentMatches = 
            (data.agentId && agent.id === data.agentId) ||
            (data.agentId && agent.agent_id === data.agentId) ||
            (data.agentId && agent.role === data.agentId);
          
          if (agentMatches) {
            console.log('[RealtimeStore] ✅ Updating agent in graph store:', {
              agentId: agent.id,
              agentRole: agent.role,
              oldStatus: agent.status,
              newStatus: data.status,
              currentTask: data.currentTask
            });
            
            return { 
              ...agent, 
              status: data.status as any, 
              current_task: data.currentTask,
              completed_at: (data.status === 'completed' || data.status === 'failed') 
                ? new Date().toISOString() 
                : agent.completed_at,
              // ✅ Add timestamp to track update freshness
              last_updated: new Date().toISOString()
            };
          }
          return agent;
        });

        // ✅ FIXED: Always update the graph store
        console.log('[RealtimeStore] 🔄 Updating graph store with new agent states');
        graphStore.setCurrentGraph({
          ...currentGraph,
          agents: updatedAgents
        });
      } else {
        console.warn('[RealtimeStore] ⚠️ Execution ID mismatch:', {
          dataExecutionId: data.executionId,
          currentGraphId: currentGraph?.execution?.id
        });
      }
    },

    handleTaskUpdate: (data: TaskUpdateData) => {
      console.log('[RealtimeStore] Handling task update:', data);
      
      // ✅ IMPROVED: Use direct store access
      const taskStore = useTaskManagementStore.getState();
      const graphStore = useExecutionGraphStore.getState();
      
      // Update task status in database
      taskStore.updateTaskStatus(data.taskId, data.status as any, data.result, data.error).catch(error => {
        console.error('[RealtimeStore] Failed to persist task status update:', error);
      });
      
      // Update graph store if this is the current execution
      const currentGraph = graphStore.currentGraph;
      if (currentGraph?.execution?.id === data.executionId) {
        const updatedTasks = currentGraph.tasks.map((task: OSSwarmTask) => {
          if (task.id === data.taskId) {
            console.log('[RealtimeStore] ✅ Updating task in graph store:', {
              taskId: task.id,
              oldStatus: task.status,
              newStatus: data.status
            });
            
            return { 
              ...task, 
              status: data.status as any, 
              result: data.result,
              error: data.error,
              completed_at: (data.status === 'completed' || data.status === 'failed') 
                ? new Date().toISOString() 
                : task.completed_at
            };
          }
          return task;
        });

        graphStore.setCurrentGraph({
          ...currentGraph,
          tasks: updatedTasks
        });
      }
    },

    handleToolExecutionUpdate: (data: ToolExecutionUpdateData) => {
      console.log('[RealtimeStore] Handling tool execution update:', data);
      
      // ✅ IMPROVED: Use direct store access
      const toolExecutionStore = useToolExecutionStore.getState();
      const graphStore = useExecutionGraphStore.getState();
      
      // Update tool execution in database
      if (toolExecutionStore.updateToolExecutionStatus) {
        toolExecutionStore.updateToolExecutionStatus(
          data.toolExecutionId, 
          data.status as any, 
          data.result, 
          data.error,
          data.executionTime
        ).catch(error => {
          console.error('[RealtimeStore] Failed to persist tool execution status update:', error);
        });
      }
      
      // Update graph store if this is the current execution
      const currentGraph = graphStore.currentGraph;
      if (currentGraph?.execution?.id === data.executionId) {
        const updatedToolExecutions = currentGraph.toolExecutions.map((toolExec: OSSwarmToolExecution) => {
          if (toolExec.id === data.toolExecutionId) {
            console.log('[RealtimeStore] ✅ Updating tool execution in graph store:', {
              toolExecutionId: toolExec.id,
              oldStatus: toolExec.status,
              newStatus: data.status
            });
            
            return { 
              ...toolExec, 
              status: data.status as any, 
              result: data.result,
              error: data.error,
              execution_time: data.executionTime,
              completed_at: (data.status === 'completed' || data.status === 'failed') 
                ? new Date().toISOString() 
                : toolExec.completed_at
            };
          }
          return toolExec;
        });

        graphStore.setCurrentGraph({
          ...currentGraph,
          toolExecutions: updatedToolExecutions
        });
      }
    },
  };
}); 