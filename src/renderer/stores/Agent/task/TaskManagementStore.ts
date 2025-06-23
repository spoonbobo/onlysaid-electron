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

      // Add to local state
      const newTask: OSSwarmTask = {
        id: taskId,
        execution_id: executionId,
        agent_id: agentId,
        task_description: taskDescription,
        status: 'pending',
        priority,
        created_at: now,
        iterations: 0,
        max_iterations: 20
      };

      set(state => ({
        tasks: [...state.tasks, newTask]
      }));
      
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