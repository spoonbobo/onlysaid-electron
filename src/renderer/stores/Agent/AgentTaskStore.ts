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
  
  // ✅ Add optional fields from JOIN queries
  agent_role?: string;
  task_description?: string;
  tool_name?: string;
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
  
  // ✅ Enhanced history management
  isLoadingHistory: boolean;
  historyError: string | null;
  
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
  loadExecutionHistory: (limit?: number, offset?: number) => Promise<void>;
  
  getCurrentExecutionGraph: () => ExecutionGraph | null;
  setCurrentExecution: (executionId: string | null) => Promise<void>;
  
  // Cleanup
  clearCurrentExecution: () => void;
  deleteExecution: (executionId: string) => Promise<void>;
  
  // ✅ Enhanced actions
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
  
  // ✅ Bulk operations
  deleteMultipleExecutions: (executionIds: string[]) => Promise<void>;
  archiveExecution: (executionId: string) => Promise<void>;
  
  updateToolExecutionByApprovalId: (approvalId: string, status: OSSwarmToolExecution['status'], result?: string, error?: string, executionTime?: number) => Promise<void>;

  // ✅ Add a new method to get formatted logs for display
  getFormattedLogs: (executionId?: string) => (OSSwarmLog & {
    formattedMessage: string;
    timestamp: string;
    displayText: string;
  })[];

  // ✅ Add method to get logs by type
  getLogsByType: (logType: OSSwarmLog['log_type'], executionId?: string) => (OSSwarmLog & {
    formattedMessage: string;
    timestamp: string;
    displayText: string;
  })[];

  // ✅ Add method to search logs
  searchLogs: (query: string, executionId?: string) => (OSSwarmLog & {
    formattedMessage: string;
    timestamp: string;
    displayText: string;
  })[];

  // ✅ Reliable force-delete that also cleans up children
  forceDeleteExecution: (executionId: string) => Promise<void>;

  // ✅ Nuclear option - delete ALL executions for current user
  nukeAllExecutions: () => Promise<void>;

  // ✅ ADD: Method to refresh current execution graph
  refreshCurrentExecutionGraph: () => Promise<void>;
  
  // ✅ ADD: Method to handle real-time updates
  handleExecutionUpdate: (data: { executionId: string; status: string; result?: string; error?: string }) => void;
  handleAgentUpdate: (data: { agentId: string; status: string; currentTask?: string; executionId: string }) => void;
  handleTaskUpdate: (data: { taskId: string; status: string; result?: string; error?: string; executionId: string }) => void;
  handleToolExecutionUpdate: (data: { toolExecutionId: string; status: string; result?: string; error?: string; executionTime?: number; executionId: string }) => void;
}

export const useAgentTaskStore = create<AgentTaskState>((set, get) => ({
  currentExecution: null,
  currentGraph: null,
  executions: [],
  isLoading: false,
  error: null,
  isLoadingHistory: false,
  historyError: null,

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

      // ✅ Enhanced logs loading with better ordering and formatting
      const logs = await window.electron.db.query({
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

      console.log(`[AgentTaskStore] Loaded execution graph with ${(logs || []).length} logs`);
    } catch (error: any) {
      console.error('[AgentTaskStore] Error loading execution graph:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

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
      console.error('[AgentTaskStore] Error loading execution history:', error);
      set({ historyError: error.message, isLoadingHistory: false });
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
      // ✅ Start a transaction for atomic deletion
      await window.electron.db.query({
        query: 'BEGIN TRANSACTION',
        params: {}
      });

      try {
        // ✅ Verify ownership before deletion
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

        // ✅ Manual cascade deletion to ensure proper cleanup
        // Delete in reverse dependency order to avoid foreign key conflicts
        
        // 1. Delete logs first
        await window.electron.db.query({
          query: `DELETE FROM ${DBTABLES.OSSWARM_LOGS} WHERE execution_id = @id`,
          params: { id: executionId }
        });

        // 2. Delete tool executions
        await window.electron.db.query({
          query: `DELETE FROM ${DBTABLES.OSSWARM_TOOL_EXECUTIONS} WHERE execution_id = @id`,
          params: { id: executionId }
        });

        // 3. Delete tasks
        await window.electron.db.query({
          query: `DELETE FROM ${DBTABLES.OSSWARM_TASKS} WHERE execution_id = @id`,
          params: { id: executionId }
        });

        // 4. Delete agents
        await window.electron.db.query({
          query: `DELETE FROM ${DBTABLES.OSSWARM_AGENTS} WHERE execution_id = @id`,
          params: { id: executionId }
        });

        // 5. Finally delete the execution
        await window.electron.db.query({
          query: `DELETE FROM ${DBTABLES.OSSWARM_EXECUTIONS} WHERE id = @id`,
          params: { id: executionId }
        });

        // ✅ Commit the transaction
        await window.electron.db.query({
          query: 'COMMIT',
          params: {}
        });

        // ✅ Update the store state
        set(state => ({
          executions: state.executions.filter(exec => exec.id !== executionId),
          currentExecution: state.currentExecution?.id === executionId ? null : state.currentExecution,
          currentGraph: state.currentExecution?.id === executionId ? null : state.currentGraph
        }));

        console.log(`[AgentTaskStore] Successfully deleted execution: ${executionId}`);
      } catch (error) {
        // ✅ Rollback on error
        await window.electron.db.query({
          query: 'ROLLBACK',
          params: {}
        });
        throw error;
      }
    } catch (error: any) {
      console.error('[AgentTaskStore] Error deleting execution:', error);
      set({ error: error.message });
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
      console.error('[AgentTaskStore] Error searching execution history:', error);
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
      console.error('[AgentTaskStore] Error getting executions by status:', error);
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
      console.error('[AgentTaskStore] Error getting executions by date range:', error);
      throw error;
    }
  },

  exportExecutionData: async (executionId: string) => {
    try {
      const graph = await get().loadExecutionGraph(executionId);
      
      const exportData = {
        execution: get().currentExecution,
        graph: get().currentGraph,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      return exportData;
    } catch (error: any) {
      console.error('[AgentTaskStore] Error exporting execution data:', error);
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
      console.error('[AgentTaskStore] Error getting execution stats:', error);
      throw error;
    }
  },

  deleteMultipleExecutions: async (executionIds: string[]) => {
    if (executionIds.length === 0) return;

    try {
      // ✅ Start a transaction for atomic deletion
      await window.electron.db.query({
        query: 'BEGIN TRANSACTION',
        params: {}
      });

      try {
        const currentUser = getUserFromStore();
        
        // ✅ Verify ownership of all executions
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

        // ✅ Delete in batches to avoid SQL parameter limits
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

        // ✅ Commit the transaction
        await window.electron.db.query({
          query: 'COMMIT',
          params: {}
        });

        // ✅ Update the store state
        set(state => ({
          executions: state.executions.filter(exec => !executionIds.includes(exec.id)),
          currentExecution: executionIds.includes(state.currentExecution?.id || '') ? null : state.currentExecution,
          currentGraph: executionIds.includes(state.currentExecution?.id || '') ? null : state.currentGraph
        }));

        console.log(`[AgentTaskStore] Successfully deleted ${executionIds.length} executions`);
      } catch (error) {
        // ✅ Rollback on error
        await window.electron.db.query({
          query: 'ROLLBACK',
          params: {}
        });
        throw error;
      }
    } catch (error: any) {
      console.error('[AgentTaskStore] Error deleting multiple executions:', error);
      set({ error: error.message });
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
        executions: state.executions.filter(exec => exec.id !== executionId),
        currentExecution: state.currentExecution?.id === executionId ? null : state.currentExecution,
        currentGraph: state.currentExecution?.id === executionId ? null : state.currentGraph
      }));
    } catch (error: any) {
      console.error('[AgentTaskStore] Error archiving execution:', error);
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

      const toolExecution = await window.electron.db.query({
        query: `SELECT execution_id, agent_id, task_id, tool_name, id FROM ${DBTABLES.OSSWARM_TOOL_EXECUTIONS} WHERE approval_id = @approval_id`,
        params: { approval_id: approvalId }
      });

      if (toolExecution && toolExecution[0]) {
        const logType = status === 'completed' ? 'tool_result' : 'status_update';
        await get().addLog(toolExecution[0].execution_id, logType, `Tool "${toolExecution[0].tool_name}" status changed to: ${status}`, toolExecution[0].agent_id, toolExecution[0].task_id, toolExecution[0].id, { result, error, executionTime });
      }
    } catch (error: any) {
      console.error('[AgentTaskStore] Error updating tool execution by approval ID:', error);
      set({ error: error.message });
      throw error;
    }
  },

  // ✅ Add a new method to get formatted logs for display
  getFormattedLogs: (executionId?: string) => {
    const state = get();
    const graph = executionId ? state.currentGraph : state.currentGraph;
    
    if (!graph || !graph.logs) return [];
    
    return graph.logs.map(log => {
      const timestamp = new Date(log.created_at).toLocaleTimeString();
      let formattedMessage = log.message;
      
      // ✅ Enhance log messages with context
      if (log.agent_role) {
        formattedMessage = `[${log.agent_role}] ${formattedMessage}`;
      }
      
      if (log.tool_name && log.log_type === 'tool_request') {
        formattedMessage = `🔧 ${formattedMessage} (${log.tool_name})`;
      } else if (log.tool_name && log.log_type === 'tool_result') {
        formattedMessage = `✅ ${formattedMessage} (${log.tool_name})`;
      } else if (log.log_type === 'error') {
        formattedMessage = `❌ ${formattedMessage}`;
      } else if (log.log_type === 'warning') {
        formattedMessage = `⚠️ ${formattedMessage}`;
      } else if (log.log_type === 'status_update') {
        formattedMessage = `📊 ${formattedMessage}`;
      } else if (log.log_type === 'info') {
        formattedMessage = `ℹ️ ${formattedMessage}`;
      }
      
      return {
        ...log,
        formattedMessage,
        timestamp,
        displayText: `[${timestamp}] ${formattedMessage}`
      };
    });
  },

  // ✅ Add method to get logs by type
  getLogsByType: (logType: OSSwarmLog['log_type'], executionId?: string) => {
    const formattedLogs = get().getFormattedLogs(executionId);
    return formattedLogs.filter(log => log.log_type === logType);
  },

  // ✅ Add method to search logs
  searchLogs: (query: string, executionId?: string) => {
    const formattedLogs = get().getFormattedLogs(executionId);
    const searchTerm = query.toLowerCase();
    
    return formattedLogs.filter(log => 
      log.message.toLowerCase().includes(searchTerm) ||
      log.log_type.toLowerCase().includes(searchTerm) ||
      (log.agent_role && log.agent_role.toLowerCase().includes(searchTerm)) ||
      (log.tool_name && log.tool_name.toLowerCase().includes(searchTerm)) ||
      log.formattedMessage.toLowerCase().includes(searchTerm)
    );
  },

  // ✅ Reliable force-delete that also cleans up children
  forceDeleteExecution: async (executionId: string) => {
    console.log(`[AgentTaskStore] Force deleting execution (FK-OFF): ${executionId}`);

    /* Optimistic UI update */
    set(state => ({
      executions: state.executions.filter(e => e.id !== executionId),
      currentExecution: state.currentExecution?.id === executionId ? null : state.currentExecution,
      currentGraph    : state.currentExecution?.id === executionId ? null : state.currentGraph,
    }));

    try {
      /* 1. disable FK constraints – we are doing a manual cascade */
      await window.electron.db.query({ query: 'PRAGMA foreign_keys = OFF', params: {} });
      await window.electron.db.query({ query: 'BEGIN TRANSACTION',    params: {} });

      /* 2. delete children then parent */
      await window.electron.db.query({
        query : `DELETE FROM ${DBTABLES.OSSWARM_LOGS}            WHERE execution_id = @id`,
        params: { id: executionId },
      });
      await window.electron.db.query({
        query : `DELETE FROM ${DBTABLES.OSSWARM_TOOL_EXECUTIONS} WHERE execution_id = @id`,
        params: { id: executionId },
      });
      await window.electron.db.query({
        query : `DELETE FROM ${DBTABLES.OSSWARM_TASKS}           WHERE execution_id = @id`,
        params: { id: executionId },
      });
      await window.electron.db.query({
        query : `DELETE FROM ${DBTABLES.OSSWARM_AGENTS}          WHERE execution_id = @id`,
        params: { id: executionId },
      });
      await window.electron.db.query({
        query : `DELETE FROM ${DBTABLES.OSSWARM_EXECUTIONS}      WHERE id           = @id`,
        params: { id: executionId },
      });

      await window.electron.db.query({ query: 'COMMIT',               params: {} });
      console.log('[AgentTaskStore] ✅ Force delete committed');
    } catch (err) {
      console.error('[AgentTaskStore] ❌ Force delete failed, rolling-back', err);
      await window.electron.db.query({ query: 'ROLLBACK', params: {} });

      /* revert optimistic UI change */
      await get().loadExecutionHistory(20);
      throw err;
    } finally {
      /* 3. always re-enable FK constraints */
      await window.electron.db.query({ query: 'PRAGMA foreign_keys = ON', params: {} });
    }

    /* make sure the list is fresh */
    await get().loadExecutionHistory(20);
  },

  // ✅ Nuclear option - delete ALL executions for current user
  nukeAllExecutions: async () => {
    try {
      const currentUser = getUserFromStore();
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }

      console.log('[AgentTaskStore] NUKING all executions for user:', currentUser.id);
      
      // ✅ Disable foreign key constraints
      await window.electron.db.query({
        query: 'PRAGMA foreign_keys = OFF',
        params: {}
      });

      try {
        // ✅ Get all execution IDs for this user
        const userExecutions = await window.electron.db.query({
          query: `SELECT id FROM ${DBTABLES.OSSWARM_EXECUTIONS} WHERE user_id = @user_id`,
          params: { user_id: currentUser.id }
        });

        const executionIds = userExecutions?.map((exec: any) => exec.id) || [];
        
        if (executionIds.length > 0) {
          const idList = executionIds.map((id: string) => `'${id}'`).join(',');
          
          // ✅ Delete all related records
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
        // ✅ Re-enable foreign key constraints
        await window.electron.db.query({
          query: 'PRAGMA foreign_keys = ON',
          params: {}
        });
      }

      // ✅ Clear UI state
      set({
        executions: [],
        currentExecution: null,
        currentGraph: null
      });
      
      console.log('[AgentTaskStore] Successfully nuked all executions');
      
    } catch (error: any) {
      console.error('[AgentTaskStore] Error nuking executions:', error);
      
      // ✅ Re-enable foreign keys on error
      try {
        await window.electron.db.query({
          query: 'PRAGMA foreign_keys = ON',
          params: {}
        });
      } catch (pragmaError) {
        console.error('Failed to re-enable foreign keys:', pragmaError);
      }
      
      set({ error: error.message });
      throw error;
    }
  },

  // ✅ ADD: Method to refresh current execution graph
  refreshCurrentExecutionGraph: async () => {
    const currentExecution = get().currentExecution;
    if (currentExecution?.id) {
      console.log('[AgentTaskStore] Refreshing current execution graph:', currentExecution.id);
      try {
        await get().loadExecutionGraph(currentExecution.id);
      } catch (error) {
        console.error('[AgentTaskStore] Error refreshing execution graph:', error);
      }
    }
  },

  // ✅ ADD: Handle real-time execution updates
  handleExecutionUpdate: (data) => {
    const { executionId, status, result, error } = data;
    
    set(state => {
      const updatedExecution = state.currentExecution?.id === executionId 
        ? { 
            ...state.currentExecution, 
            status: status as OSSwarmExecution['status'], 
            result, 
            error, 
            completed_at: (status === 'completed' || status === 'failed') ? new Date().toISOString() : state.currentExecution.completed_at 
          }
        : state.currentExecution;

      const updatedGraph = state.currentGraph && state.currentGraph.execution.id === executionId
        ? { 
            ...state.currentGraph, 
            execution: { 
              ...state.currentGraph.execution, 
              status: status as OSSwarmExecution['status'], 
              result, 
              error, 
              completed_at: (status === 'completed' || status === 'failed') ? new Date().toISOString() : state.currentGraph.execution.completed_at 
            } 
          }
        : state.currentGraph;

      return {
        currentExecution: updatedExecution,
        currentGraph: updatedGraph,
        executions: state.executions.map(exec => 
          exec.id === executionId ? { ...exec, status: status as OSSwarmExecution['status'], result, error } : exec
        )
      };
    });

    console.log(`[AgentTaskStore] Real-time execution update: ${executionId} -> ${status}`);
  },

  // ✅ ADD: Handle real-time agent updates
  handleAgentUpdate: (data) => {
    const { agentId, status, currentTask, executionId } = data;
    
    set(state => {
      if (!state.currentGraph || state.currentGraph.execution.id !== executionId) {
        return state;
      }

      const updatedAgents = state.currentGraph.agents.map(agent => 
        agent.id === agentId 
          ? { 
              ...agent, 
              status: status as OSSwarmAgent['status'], 
              current_task: currentTask,
              completed_at: (status === 'completed' || status === 'failed') ? new Date().toISOString() : agent.completed_at
            }
          : agent
      );

      return {
        currentGraph: {
          ...state.currentGraph,
          agents: updatedAgents
        }
      };
    });

    console.log(`[AgentTaskStore] Real-time agent update: ${agentId} -> ${status}`);
  },

  // ✅ ADD: Handle real-time task updates
  handleTaskUpdate: (data) => {
    const { taskId, status, result, error, executionId } = data;
    
    set(state => {
      if (!state.currentGraph || state.currentGraph.execution.id !== executionId) {
        return state;
      }

      const updatedTasks = state.currentGraph.tasks.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              status: status as OSSwarmTask['status'], 
              result,
              error,
              completed_at: (status === 'completed' || status === 'failed') ? new Date().toISOString() : task.completed_at
            }
          : task
      );

      return {
        currentGraph: {
          ...state.currentGraph,
          tasks: updatedTasks
        }
      };
    });

    console.log(`[AgentTaskStore] Real-time task update: ${taskId} -> ${status}`);
  },

  // ✅ ADD: Handle real-time tool execution updates
  handleToolExecutionUpdate: (data) => {
    const { toolExecutionId, status, result, error, executionTime, executionId } = data;
    
    set(state => {
      if (!state.currentGraph || state.currentGraph.execution.id !== executionId) {
        return state;
      }

      const updatedToolExecutions = state.currentGraph.toolExecutions.map(toolExec => 
        toolExec.id === toolExecutionId 
          ? { 
              ...toolExec, 
              status: status as OSSwarmToolExecution['status'], 
              result,
              error,
              execution_time: executionTime,
              completed_at: (status === 'completed' || status === 'failed') ? new Date().toISOString() : toolExec.completed_at
            }
          : toolExec
      );

      return {
        currentGraph: {
          ...state.currentGraph,
          toolExecutions: updatedToolExecutions
        }
      };
    });

    console.log(`[AgentTaskStore] Real-time tool execution update: ${toolExecutionId} -> ${status}`);
  },
}));
