import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { DBTABLES } from '@/../../constants/db';
import { OSSwarmTask, TaskUpdateData } from './types';

interface TaskManagementState {
  // Current tasks
  tasks: OSSwarmTask[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createTask: (executionId: string, agentId: string, taskDescription: string, priority?: number) => Promise<string>;
  updateTaskStatus: (taskId: string, status: OSSwarmTask['status'], result?: string, error?: string) => Promise<void>;
  loadTasksByExecution: (executionId: string) => Promise<void>;
  setTasks: (tasks: OSSwarmTask[]) => void;
  clearTasks: () => void;
  
  // Real-time updates
  handleTaskUpdate: (data: TaskUpdateData) => void;
}

export const useTaskManagementStore = create<TaskManagementState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  createTask: async (executionId: string, agentId: string, taskDescription: string, priority = 0) => {
    const taskId = uuidv4();
    const now = new Date().toISOString();

    try {
      // ✅ First, verify the execution exists
      const executionCheck = await window.electron.db.query({
        query: `SELECT id FROM ${DBTABLES.OSSWARM_EXECUTIONS} WHERE id = @id`,
        params: { id: executionId }
      });

      if (!executionCheck || executionCheck.length === 0) {
        throw new Error(`Execution ${executionId} does not exist. Cannot create task.`);
      }

      // ✅ FIX: Handle multiple agent ID formats
      let dbAgentId = agentId;
      
      // Handle registry-{role} format
      if (agentId.startsWith('registry-')) {
        const role = agentId.replace('registry-', '');
        const agentCheck = await window.electron.db.query({
          query: `SELECT id FROM ${DBTABLES.OSSWARM_AGENTS} WHERE execution_id = @execution_id AND role = @role`,
          params: { execution_id: executionId, role: role }
        });
        
        if (agentCheck && agentCheck.length > 0) {
          dbAgentId = agentCheck[0].id;
          console.log(`[TaskManagementStore] Mapped ${agentId} to database ID: ${dbAgentId}`);
        } else {
          throw new Error(`Agent with role ${role} not found in execution ${executionId}. Cannot create task.`);
        }
      }
      // Handle langgraph-{role}-{timestamp} format
      else if (agentId.startsWith('langgraph-')) {
        const agentCheck = await window.electron.db.query({
          query: `SELECT id FROM ${DBTABLES.OSSWARM_AGENTS} WHERE execution_id = @execution_id AND agent_id = @agent_id`,
          params: { execution_id: executionId, agent_id: agentId }
        });
        
        if (agentCheck && agentCheck.length > 0) {
          dbAgentId = agentCheck[0].id;
          console.log(`[TaskManagementStore] Mapped ${agentId} to database ID: ${dbAgentId}`);
        } else {
          throw new Error(`Agent with agent_id ${agentId} not found in execution ${executionId}. Cannot create task.`);
        }
      } 
      // Handle direct database ID
      else {
        const agentCheck = await window.electron.db.query({
          query: `SELECT id FROM ${DBTABLES.OSSWARM_AGENTS} WHERE id = @id`,
          params: { id: agentId }
        });

        if (!agentCheck || agentCheck.length === 0) {
          throw new Error(`Agent ${agentId} does not exist. Cannot create task.`);
        }
      }

      // Create the task
      await window.electron.db.query({
        query: `
          INSERT INTO ${DBTABLES.OSSWARM_TASKS}
          (id, execution_id, agent_id, task_description, priority, status, created_at)
          VALUES (@id, @execution_id, @agent_id, @task_description, @priority, @status, @created_at)
        `,
        params: {
          id: taskId,
          execution_id: executionId,
          agent_id: dbAgentId, // ✅ Use the resolved database agent ID
          task_description: taskDescription,
          priority,
          status: 'pending',
          created_at: now
        }
      });

      // Update total tasks count
      await window.electron.db.query({
        query: `UPDATE ${DBTABLES.OSSWARM_EXECUTIONS} SET total_tasks = total_tasks + 1 WHERE id = @id`,
        params: { id: executionId }
      });

      // Add to local state
      const newTask: OSSwarmTask = {
        id: taskId,
        execution_id: executionId,
        agent_id: dbAgentId,
        task_description: taskDescription,
        priority,
        status: 'pending',
        created_at: now,
        iterations: 0,
        max_iterations: 20
      };

      set(state => ({
        tasks: [...state.tasks, newTask]
      }));

      console.log(`[TaskManagementStore] Task created successfully: ${taskId}`);
      return taskId;
    } catch (error: any) {
      console.error('[TaskManagementStore] Error creating task:', error);
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

      // Update local state
      set(state => ({
        tasks: state.tasks.map(task => 
          task.id === taskId ? { ...task, ...updates } : task
        )
      }));
    } catch (error: any) {
      console.error('[TaskManagementStore] Error updating task status:', error);
      set({ error: error.message });
      throw error;
    }
  },

  loadTasksByExecution: async (executionId: string) => {
    set({ isLoading: true, error: null });

    try {
      const tasks = await window.electron.db.query({
        query: `SELECT * FROM ${DBTABLES.OSSWARM_TASKS} WHERE execution_id = @execution_id ORDER BY created_at`,
        params: { execution_id: executionId }
      });

      set({ tasks: tasks || [], isLoading: false });
    } catch (error: any) {
      console.error('[TaskManagementStore] Error loading tasks:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  setTasks: (tasks: OSSwarmTask[]) => {
    set({ tasks });
  },

  clearTasks: () => {
    set({ tasks: [] });
  },

  handleTaskUpdate: (data: TaskUpdateData) => {
    const { taskId, status, result, error } = data;
    
    set(state => ({
      tasks: state.tasks.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              status: status as OSSwarmTask['status'], 
              result,
              error,
              completed_at: (status === 'completed' || status === 'failed') 
                ? new Date().toISOString() 
                : task.completed_at
            }
          : task
      )
    }));

    console.log(`[TaskManagementStore] Real-time task update: ${taskId} -> ${status}`);
  }
})); 