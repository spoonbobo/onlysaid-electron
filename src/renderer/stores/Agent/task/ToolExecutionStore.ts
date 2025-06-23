import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { DBTABLES } from '@/../../constants/db';
import { OSSwarmToolExecution, ToolExecutionUpdateData } from './types';

interface ToolExecutionState {
  // Current tool executions
  toolExecutions: OSSwarmToolExecution[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createToolExecution: (executionId: string, agentId: string, toolName: string, toolArguments?: any, approvalId?: string, taskId?: string, mcpServer?: string) => Promise<string>;
  updateToolExecutionStatus: (toolExecutionId: string, status: OSSwarmToolExecution['status'], result?: string, error?: string, executionTime?: number) => Promise<void>;
  updateToolExecutionByApprovalId: (approvalId: string, status: OSSwarmToolExecution['status'], result?: string, error?: string, executionTime?: number) => Promise<void>;
  approveToolExecution: (toolExecutionId: string, approved: boolean) => Promise<void>;
  loadToolExecutionsByExecution: (executionId: string) => Promise<void>;
  setToolExecutions: (toolExecutions: OSSwarmToolExecution[]) => void;
  clearToolExecutions: () => void;
  
  // Real-time updates
  handleToolExecutionUpdate: (data: ToolExecutionUpdateData) => void;
}

export const useToolExecutionStore = create<ToolExecutionState>((set, get) => ({
  toolExecutions: [],
  isLoading: false,
  error: null,

  createToolExecution: async (executionId: string, agentId: string, toolName: string, toolArguments?: any, approvalId?: string, taskId?: string, mcpServer?: string) => {
    const toolExecutionId = uuidv4();
    const now = new Date().toISOString();

    try {
      await window.electron.db.query({
        query: `
          INSERT INTO ${DBTABLES.OSSWARM_TOOL_EXECUTIONS}
          (id, execution_id, agent_id, task_id, tool_name, tool_arguments, approval_id, status, created_at, mcp_server, human_approved)
          VALUES (@id, @execution_id, @agent_id, @task_id, @tool_name, @tool_arguments, @approval_id, @status, @created_at, @mcp_server, @human_approved)
        `,
        params: {
          id: toolExecutionId,
          execution_id: executionId,
          agent_id: agentId,
          task_id: taskId || null,
          tool_name: toolName,
          tool_arguments: toolArguments ? JSON.stringify(toolArguments) : null,
          approval_id: approvalId || null,
          status: 'pending',
          created_at: now,
          mcp_server: mcpServer || null,
          human_approved: 0
        }
      });

      // Update total tool executions count
      await window.electron.db.query({
        query: `UPDATE ${DBTABLES.OSSWARM_EXECUTIONS} SET total_tool_executions = total_tool_executions + 1 WHERE id = @id`,
        params: { id: executionId }
      });

      // Add to local state
      const newToolExecution: OSSwarmToolExecution = {
        id: toolExecutionId,
        execution_id: executionId,
        agent_id: agentId,
        task_id: taskId,
        tool_name: toolName,
        tool_arguments: toolArguments ? JSON.stringify(toolArguments) : undefined,
        approval_id: approvalId,
        status: 'pending',
        created_at: now,
        mcp_server: mcpServer,
        human_approved: false
      };

      set(state => ({
        toolExecutions: [...state.toolExecutions, newToolExecution]
      }));
      
      return toolExecutionId;
    } catch (error: any) {
      console.error('[ToolExecutionStore] Error creating tool execution:', error);
      set({ error: error.message });
      throw error;
    }
  },

  updateToolExecutionStatus: async (toolExecutionId: string, status: OSSwarmToolExecution['status'], result?: string, error?: string, executionTime?: number) => {
    const now = new Date().toISOString();
    const updates: any = { status };
    
    if (status === 'approved' && !updates.approved_at) updates.approved_at = now;
    if (status === 'executing' && !updates.started_at) updates.started_at = now;
    if ((status === 'completed' || status === 'failed') && !updates.completed_at) updates.completed_at = now;
    if (result) updates.result = result;
    if (error) updates.error = error;
    if (executionTime) updates.execution_time = executionTime;

    try {
      const setClause = Object.keys(updates).map(key => `${key} = @${key}`).join(', ');
      
      await window.electron.db.query({
        query: `UPDATE ${DBTABLES.OSSWARM_TOOL_EXECUTIONS} SET ${setClause} WHERE id = @id`,
        params: { ...updates, id: toolExecutionId }
      });

      // Update local state
      set(state => ({
        toolExecutions: state.toolExecutions.map(toolExec => 
          toolExec.id === toolExecutionId ? { ...toolExec, ...updates } : toolExec
        )
      }));
    } catch (error: any) {
      console.error('[ToolExecutionStore] Error updating tool execution status:', error);
      set({ error: error.message });
      throw error;
    }
  },

  updateToolExecutionByApprovalId: async (approvalId: string, status: OSSwarmToolExecution['status'], result?: string, error?: string, executionTime?: number) => {
    const now = new Date().toISOString();
    const updates: any = { status };
    
    if (status === 'approved' && !updates.approved_at) updates.approved_at = now;
    if (status === 'executing' && !updates.started_at) updates.started_at = now;
    if ((status === 'completed' || status === 'failed') && !updates.completed_at) updates.completed_at = now;
    if (result) updates.result = result;
    if (error) updates.error = error;
    if (executionTime) updates.execution_time = executionTime;

    try {
      const setClause = Object.keys(updates).map(key => `${key} = @${key}`).join(', ');
      
      await window.electron.db.query({
        query: `UPDATE ${DBTABLES.OSSWARM_TOOL_EXECUTIONS} SET ${setClause} WHERE approval_id = @approval_id`,
        params: { ...updates, approval_id: approvalId }
      });

      // Update local state
      set(state => ({
        toolExecutions: state.toolExecutions.map(toolExec => 
          toolExec.approval_id === approvalId ? { ...toolExec, ...updates } : toolExec
        )
      }));
    } catch (error: any) {
      console.error('[ToolExecutionStore] Error updating tool execution by approval ID:', error);
      set({ error: error.message });
      throw error;
    }
  },

  approveToolExecution: async (toolExecutionId: string, approved: boolean) => {
    const now = new Date().toISOString();
    const status = approved ? 'approved' : 'denied';

    try {
      await window.electron.db.query({
        query: `UPDATE ${DBTABLES.OSSWARM_TOOL_EXECUTIONS} SET status = @status, human_approved = @human_approved, approved_at = @approved_at WHERE id = @id`,
        params: {
          id: toolExecutionId,
          status,
          human_approved: approved ? 1 : 0,
          approved_at: now
        }
      });

      // Update local state
      set(state => ({
        toolExecutions: state.toolExecutions.map(toolExec => 
          toolExec.id === toolExecutionId 
            ? { 
                ...toolExec, 
                status: status as OSSwarmToolExecution['status'], 
                human_approved: approved,
                approved_at: now
              } 
            : toolExec
        )
      }));
    } catch (error: any) {
      console.error('[ToolExecutionStore] Error approving tool execution:', error);
      set({ error: error.message });
      throw error;
    }
  },

  loadToolExecutionsByExecution: async (executionId: string) => {
    set({ isLoading: true, error: null });

    try {
      const toolExecutions = await window.electron.db.query({
        query: `SELECT * FROM ${DBTABLES.OSSWARM_TOOL_EXECUTIONS} WHERE execution_id = @execution_id ORDER BY created_at`,
        params: { execution_id: executionId }
      });

      set({ toolExecutions: toolExecutions || [], isLoading: false });
    } catch (error: any) {
      console.error('[ToolExecutionStore] Error loading tool executions:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  setToolExecutions: (toolExecutions: OSSwarmToolExecution[]) => {
    set({ toolExecutions });
  },

  clearToolExecutions: () => {
    set({ toolExecutions: [] });
  },

  handleToolExecutionUpdate: (data: ToolExecutionUpdateData) => {
    const { toolExecutionId, status, result, error, executionTime } = data;
    
    set(state => ({
      toolExecutions: state.toolExecutions.map(toolExec => 
        toolExec.id === toolExecutionId 
          ? { 
              ...toolExec, 
              status: status as OSSwarmToolExecution['status'], 
              result,
              error,
              execution_time: executionTime,
              completed_at: (status === 'completed' || status === 'failed') 
                ? new Date().toISOString() 
                : toolExec.completed_at
            }
          : toolExec
      )
    }));

    console.log(`[ToolExecutionStore] Real-time tool execution update: ${toolExecutionId} -> ${status}`);
  }
})); 