import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { DBTABLES } from '@/../../constants/db';
import { getUserFromStore } from '@/utils/user';

export interface OSSwarmExecution {
  id: string;
  task_description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  result?: string;
  error?: string;
  user_id?: string;
  chat_id?: string;
  workspace_id?: string;
  config_snapshot?: string;
  total_agents: number;
  total_tasks: number;
  total_tool_executions: number;
}

export interface OSSwarmAgent {
  id: string;
  execution_id: string;
  agent_id: string;
  role: string;
  expertise?: string; // JSON array
  status: 'idle' | 'busy' | 'completed' | 'failed';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  current_task?: string;
}

export interface OSSwarmTask {
  id: string;
  execution_id: string;
  agent_id: string;
  task_description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  result?: string;
  error?: string;
  iterations: number;
  max_iterations: number;
}

export interface OSSwarmToolExecution {
  id: string;
  execution_id: string;
  agent_id: string;
  task_id?: string;
  tool_name: string;
  tool_arguments?: string; // JSON
  approval_id?: string;
  status: 'pending' | 'approved' | 'denied' | 'executing' | 'completed' | 'failed';
  created_at: string;
  approved_at?: string;
  started_at?: string;
  completed_at?: string;
  execution_time?: number;
  result?: string;
  error?: string;
  mcp_server?: string;
  human_approved: boolean;
}

export interface OSSwarmLog {
  id: string;
  execution_id: string;
  agent_id?: string;
  task_id?: string;
  tool_execution_id?: string;
  log_type: 'info' | 'warning' | 'error' | 'status_update' | 'tool_request' | 'tool_result';
  message: string;
  metadata?: string; // JSON
  created_at: string;
}

export interface ExecutionGraph {
  execution: OSSwarmExecution;
  agents: OSSwarmAgent[];
  tasks: OSSwarmTask[];
  toolExecutions: OSSwarmToolExecution[];
  logs: OSSwarmLog[];
}

interface AgentTaskState {
  // Current execution data
  currentExecution: OSSwarmExecution | null;
  currentGraph: ExecutionGraph | null;
  
  // History
  executions: OSSwarmExecution[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
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
  loadExecutionHistory: (limit?: number) => Promise<void>;
  
  getCurrentExecutionGraph: () => ExecutionGraph | null;
  setCurrentExecution: (executionId: string | null) => Promise<void>;
  
  // Cleanup
  clearCurrentExecution: () => void;
  deleteExecution: (executionId: string) => Promise<void>;
}

export const useAgentTaskStore = create<AgentTaskState>((set, get) => ({
  currentExecution: null,
  currentGraph: null,
  executions: [],
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

      set(state => ({
        currentExecution: execution,
        executions: [execution, ...state.executions]
      }));

      await get().addLog(executionId, 'info', `OSSwarm execution created: ${taskDescription}`);
      
      return executionId;
    } catch (error: any) {
      console.error('[AgentTaskStore] Error creating execution:', error);
      set({ error: error.message });
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
          : state.currentExecution,
        executions: state.executions.map(exec => 
          exec.id === executionId ? { ...exec, ...updates } : exec
        )
      }));

      await get().addLog(executionId, 'status_update', `Execution status changed to: ${status}`, undefined, undefined, undefined, { result, error });
    } catch (error: any) {
      console.error('[AgentTaskStore] Error updating execution status:', error);
      set({ error: error.message });
      throw error;
    }
  },

  createAgent: async (executionId: string, agentId: string, role: string, expertise?: string[]) => {
    const dbAgentId = uuidv4();
    const now = new Date().toISOString();

    try {
      await window.electron.db.query({
        query: `
          INSERT INTO ${DBTABLES.OSSWARM_AGENTS}
          (id, execution_id, agent_id, role, expertise, status, created_at)
          VALUES (@id, @execution_id, @agent_id, @role, @expertise, @status, @created_at)
        `,
        params: {
          id: dbAgentId,
          execution_id: executionId,
          agent_id: agentId,
          role,
          expertise: expertise ? JSON.stringify(expertise) : null,
          status: 'idle',
          created_at: now
        }
      });

      // Update total agents count
      await window.electron.db.query({
        query: `UPDATE ${DBTABLES.OSSWARM_EXECUTIONS} SET total_agents = total_agents + 1 WHERE id = @id`,
        params: { id: executionId }
      });

      await get().addLog(executionId, 'info', `Agent created: ${role} (${agentId})`, dbAgentId);
      
      return dbAgentId;
    } catch (error: any) {
      console.error('[AgentTaskStore] Error creating agent:', error);
      set({ error: error.message });
      throw error;
    }
  },

  updateAgentStatus: async (agentId: string, status: OSSwarmAgent['status'], currentTask?: string) => {
    const now = new Date().toISOString();
    const updates: any = { status };
    
    if (currentTask) updates.current_task = currentTask;
    if (status === 'busy' && !updates.started_at) updates.started_at = now;
    if ((status === 'completed' || status === 'failed') && !updates.completed_at) updates.completed_at = now;

    try {
      const setClause = Object.keys(updates).map(key => `${key} = @${key}`).join(', ');
      
      await window.electron.db.query({
        query: `UPDATE ${DBTABLES.OSSWARM_AGENTS} SET ${setClause} WHERE id = @id`,
        params: { ...updates, id: agentId }
      });

      const agent = await window.electron.db.query({
        query: `SELECT execution_id, role FROM ${DBTABLES.OSSWARM_AGENTS} WHERE id = @id`,
        params: { id: agentId }
      });

      if (agent && agent[0]) {
        await get().addLog(agent[0].execution_id, 'status_update', `Agent ${agent[0].role} status changed to: ${status}`, agentId, undefined, undefined, { currentTask });
      }
    } catch (error: any) {
      console.error('[AgentTaskStore] Error updating agent status:', error);
      set({ error: error.message });
      throw error;
    }
  },

  createTask: async (executionId: string, agentId: string, taskDescription: string, priority = 0) => {
    const taskId = uuidv4();
    const now = new Date().toISOString();

    try {
      await window.electron.db.query({
        query: `
          INSERT INTO ${DBTABLES.OSSWARM_TASKS}
          (id, execution_id, agent_id, task_description, status, priority, created_at, iterations, max_iterations)
          VALUES (@id, @execution_id, @agent_id, @task_description, @status, @priority, @created_at, @iterations, @max_iterations)
        `,
        params: {
          id: taskId,
          execution_id: executionId,
          agent_id: agentId,
          task_description: taskDescription,
          status: 'pending',
          priority,
          created_at: now,
          iterations: 0,
          max_iterations: 20
        }
      });

      // Update total tasks count
      await window.electron.db.query({
        query: `UPDATE ${DBTABLES.OSSWARM_EXECUTIONS} SET total_tasks = total_tasks + 1 WHERE id = @id`,
        params: { id: executionId }
      });

      await get().addLog(executionId, 'info', `Task created: ${taskDescription}`, agentId, taskId);
      
      return taskId;
    } catch (error: any) {
      console.error('[AgentTaskStore] Error creating task:', error);
      set({ error: error.message });
      throw error;
    }
  },

  updateTaskStatus: async (taskId: string, status: OSSwarmTask['status'], result?: string, error?: string) => {
    const now = new Date().toISOString();
    const updates: any = { status };
    
    if (status === 'running' && !updates.started_at) updates.started_at = now;
    if ((status === 'completed' || status === 'failed') && !updates.completed_at) updates.completed_at = now;
    if (result) updates.result = result;
    if (error) updates.error = error;

    try {
      const setClause = Object.keys(updates).map(key => `${key} = @${key}`).join(', ');
      
      await window.electron.db.query({
        query: `UPDATE ${DBTABLES.OSSWARM_TASKS} SET ${setClause} WHERE id = @id`,
        params: { ...updates, id: taskId }
      });

      const task = await window.electron.db.query({
        query: `SELECT execution_id, agent_id, task_description FROM ${DBTABLES.OSSWARM_TASKS} WHERE id = @id`,
        params: { id: taskId }
      });

      if (task && task[0]) {
        await get().addLog(task[0].execution_id, 'status_update', `Task "${task[0].task_description}" status changed to: ${status}`, task[0].agent_id, taskId, undefined, { result, error });
      }
    } catch (error: any) {
      console.error('[AgentTaskStore] Error updating task status:', error);
      set({ error: error.message });
      throw error;
    }
  },

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

      await get().addLog(executionId, 'tool_request', `Tool execution requested: ${toolName}`, agentId, taskId, toolExecutionId, { toolArguments, mcpServer });
      
      return toolExecutionId;
    } catch (error: any) {
      console.error('[AgentTaskStore] Error creating tool execution:', error);
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

      const toolExecution = await window.electron.db.query({
        query: `SELECT execution_id, agent_id, task_id, tool_name FROM ${DBTABLES.OSSWARM_TOOL_EXECUTIONS} WHERE id = @id`,
        params: { id: toolExecutionId }
      });

      if (toolExecution && toolExecution[0]) {
        const logType = status === 'completed' ? 'tool_result' : 'status_update';
        await get().addLog(toolExecution[0].execution_id, logType, `Tool "${toolExecution[0].tool_name}" status changed to: ${status}`, toolExecution[0].agent_id, toolExecution[0].task_id, toolExecutionId, { result, error, executionTime });
      }
    } catch (error: any) {
      console.error('[AgentTaskStore] Error updating tool execution status:', error);
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

      const toolExecution = await window.electron.db.query({
        query: `SELECT execution_id, agent_id, task_id, tool_name FROM ${DBTABLES.OSSWARM_TOOL_EXECUTIONS} WHERE id = @id`,
        params: { id: toolExecutionId }
      });

      if (toolExecution && toolExecution[0]) {
        await get().addLog(toolExecution[0].execution_id, 'status_update', `Tool "${toolExecution[0].tool_name}" ${approved ? 'approved' : 'denied'} by human`, toolExecution[0].agent_id, toolExecution[0].task_id, toolExecutionId);
      }
    } catch (error: any) {
      console.error('[AgentTaskStore] Error approving tool execution:', error);
      set({ error: error.message });
      throw error;
    }
  },

  addLog: async (executionId: string, logType: OSSwarmLog['log_type'], message: string, agentId?: string, taskId?: string, toolExecutionId?: string, metadata?: any) => {
    const logId = uuidv4();
    const now = new Date().toISOString();

    try {
      await window.electron.db.query({
        query: `
          INSERT INTO ${DBTABLES.OSSWARM_LOGS}
          (id, execution_id, agent_id, task_id, tool_execution_id, log_type, message, metadata, created_at)
          VALUES (@id, @execution_id, @agent_id, @task_id, @tool_execution_id, @log_type, @message, @metadata, @created_at)
        `,
        params: {
          id: logId,
          execution_id: executionId,
          agent_id: agentId || null,
          task_id: taskId || null,
          tool_execution_id: toolExecutionId || null,
          log_type: logType,
          message,
          metadata: metadata ? JSON.stringify(metadata) : null,
          created_at: now
        }
      });
    } catch (error: any) {
      console.error('[AgentTaskStore] Error adding log:', error);
      // Don't throw here as logs are not critical
    }
  },

  loadExecutionGraph: async (executionId: string) => {
    set({ isLoading: true, error: null });

    try {
      // Load execution
      const executions = await window.electron.db.query({
        query: `SELECT * FROM ${DBTABLES.OSSWARM_EXECUTIONS} WHERE id = @id`,
        params: { id: executionId }
      });

      if (!executions || executions.length === 0) {
        throw new Error('Execution not found');
      }

      // Load agents
      const agents = await window.electron.db.query({
        query: `SELECT * FROM ${DBTABLES.OSSWARM_AGENTS} WHERE execution_id = @execution_id ORDER BY created_at`,
        params: { execution_id: executionId }
      });

      // Load tasks
      const tasks = await window.electron.db.query({
        query: `SELECT * FROM ${DBTABLES.OSSWARM_TASKS} WHERE execution_id = @execution_id ORDER BY created_at`,
        params: { execution_id: executionId }
      });

      // Load tool executions
      const toolExecutions = await window.electron.db.query({
        query: `SELECT * FROM ${DBTABLES.OSSWARM_TOOL_EXECUTIONS} WHERE execution_id = @execution_id ORDER BY created_at`,
        params: { execution_id: executionId }
      });

      // Load logs
      const logs = await window.electron.db.query({
        query: `SELECT * FROM ${DBTABLES.OSSWARM_LOGS} WHERE execution_id = @execution_id ORDER BY created_at`,
        params: { execution_id: executionId }
      });

      const graph: ExecutionGraph = {
        execution: executions[0],
        agents: agents || [],
        tasks: tasks || [],
        toolExecutions: toolExecutions || [],
        logs: logs || []
      };

      set({
        currentExecution: executions[0],
        currentGraph: graph,
        isLoading: false
      });
    } catch (error: any) {
      console.error('[AgentTaskStore] Error loading execution graph:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  loadExecutionHistory: async (limit = 50) => {
    set({ isLoading: true, error: null });

    try {
      const currentUser = getUserFromStore();
      const executions = await window.electron.db.query({
        query: `
          SELECT * FROM ${DBTABLES.OSSWARM_EXECUTIONS} 
          WHERE user_id = @user_id 
          ORDER BY created_at DESC 
          LIMIT @limit
        `,
        params: { 
          user_id: currentUser?.id || '',
          limit 
        }
      });

      set({
        executions: executions || [],
        isLoading: false
      });
    } catch (error: any) {
      console.error('[AgentTaskStore] Error loading execution history:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getCurrentExecutionGraph: () => {
    return get().currentGraph;
  },

  setCurrentExecution: async (executionId: string | null) => {
    if (!executionId) {
      set({ currentExecution: null, currentGraph: null });
      return;
    }

    try {
      await get().loadExecutionGraph(executionId);
    } catch (error) {
      console.error('[AgentTaskStore] Error setting current execution:', error);
    }
  },

  clearCurrentExecution: () => {
    set({ currentExecution: null, currentGraph: null });
  },

  deleteExecution: async (executionId: string) => {
    try {
      // Cascade delete will handle related records
      await window.electron.db.query({
        query: `DELETE FROM ${DBTABLES.OSSWARM_EXECUTIONS} WHERE id = @id`,
        params: { id: executionId }
      });

      set(state => ({
        executions: state.executions.filter(exec => exec.id !== executionId),
        currentExecution: state.currentExecution?.id === executionId ? null : state.currentExecution,
        currentGraph: state.currentExecution?.id === executionId ? null : state.currentGraph
      }));
    } catch (error: any) {
      console.error('[AgentTaskStore] Error deleting execution:', error);
      set({ error: error.message });
      throw error;
    }
  }
}));
