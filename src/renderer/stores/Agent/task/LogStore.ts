import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { DBTABLES } from '@/../../constants/db';
import { OSSwarmLog, FormattedLog } from './types';

interface LogState {
  // Current logs
  logs: OSSwarmLog[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addLog: (executionId: string, logType: OSSwarmLog['log_type'], message: string, agentId?: string, taskId?: string, toolExecutionId?: string, metadata?: any) => Promise<void>;
  loadLogsByExecution: (executionId: string) => Promise<void>;
  setLogs: (logs: OSSwarmLog[]) => void;
  clearLogs: () => void;
  
  // Formatted logs
  getFormattedLogs: (executionId?: string) => FormattedLog[];
  getLogsByType: (logType: OSSwarmLog['log_type'], executionId?: string) => FormattedLog[];
  searchLogs: (query: string, executionId?: string) => FormattedLog[];
}

export const useLogStore = create<LogState>((set, get) => ({
  logs: [],
  isLoading: false,
  error: null,

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

      // Add to local state
      const newLog: OSSwarmLog = {
        id: logId,
        execution_id: executionId,
        agent_id: agentId,
        task_id: taskId,
        tool_execution_id: toolExecutionId,
        log_type: logType,
        message,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        created_at: now
      };

      set(state => ({
        logs: [...state.logs, newLog]
      }));
    } catch (error: any) {
      console.error('[LogStore] Error adding log:', error);
      // Don't throw here as logs are not critical
    }
  },

  loadLogsByExecution: async (executionId: string) => {
    set({ isLoading: true, error: null });

    try {
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

      set({ logs: logs || [], isLoading: false });
      console.log(`[LogStore] Loaded ${(logs || []).length} logs`);
    } catch (error: any) {
      console.error('[LogStore] Error loading logs:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  setLogs: (logs: OSSwarmLog[]) => {
    set({ logs });
  },

  clearLogs: () => {
    set({ logs: [] });
  },

  getFormattedLogs: (executionId?: string) => {
    const state = get();
    const logsToFormat = executionId 
      ? state.logs.filter(log => log.execution_id === executionId)
      : state.logs;
    
    return logsToFormat.map(log => {
      const timestamp = new Date(log.created_at).toLocaleTimeString();
      let formattedMessage = log.message;
      
      // Enhance log messages with context
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

  getLogsByType: (logType: OSSwarmLog['log_type'], executionId?: string) => {
    const formattedLogs = get().getFormattedLogs(executionId);
    return formattedLogs.filter(log => log.log_type === logType);
  },

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
  }
})); 