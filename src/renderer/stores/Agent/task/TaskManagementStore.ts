import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { DBTABLES } from '@/../../constants/db';
import { OSSwarmTask, TaskUpdateData, CreateTaskParams, DecomposedSubtask } from './types';

interface TaskManagementState {
  // Current tasks
  tasks: OSSwarmTask[];
  decomposedTasks: DecomposedSubtask[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createTask: (params: CreateTaskParams) => Promise<string>;
  createDecomposedTasks: (executionId: string, subtasks: DecomposedSubtask[], taskAnalysis?: string) => Promise<string[]>;
  updateTaskStatus: (taskId: string, status: OSSwarmTask['status'], result?: string, error?: string) => Promise<void>;
  loadTasksByExecution: (executionId: string) => Promise<void>;
  setTasks: (tasks: OSSwarmTask[]) => void;
  setDecomposedTasks: (tasks: DecomposedSubtask[]) => void;
  clearTasks: () => void;
  
  // Task hierarchy helpers
  getSubtasks: (parentTaskId: string) => OSSwarmTask[];
  getTaskHierarchy: (executionId: string) => { parents: OSSwarmTask[], children: Record<string, OSSwarmTask[]> };
  
  // Real-time updates
  handleTaskUpdate: (data: TaskUpdateData) => void;
}

export const useTaskManagementStore = create<TaskManagementState>((set, get) => ({
  tasks: [],
  decomposedTasks: [],
  isLoading: false,
  error: null,

  createTask: async (params: CreateTaskParams) => {
    const taskId = uuidv4();
    const now = new Date().toISOString();

    try {
      // ✅ First, verify the execution exists
      const executionCheck = await window.electron.db.query({
        query: `SELECT id FROM ${DBTABLES.OSSWARM_EXECUTIONS} WHERE id = @id`,
        params: { id: params.executionId }
      });

      if (!executionCheck || executionCheck.length === 0) {
        throw new Error(`Execution ${params.executionId} does not exist. Cannot create task.`);
      }

      // ✅ IMPROVED: Better agent ID resolution logic
      let dbAgentId = params.agentId;
      
      console.log('[TaskManagementStore] Resolving agent ID:', { originalAgentId: params.agentId, executionId: params.executionId });
      
      // Handle different agent ID formats
      if (params.agentId.startsWith('registry-')) {
        // Handle registry-{role} format
        const role = params.agentId.replace('registry-', '');
        const agentCheck = await window.electron.db.query({
          query: `SELECT id FROM ${DBTABLES.OSSWARM_AGENTS} WHERE execution_id = @execution_id AND role = @role ORDER BY created_at DESC LIMIT 1`,
          params: { execution_id: params.executionId, role: role }
        });
        
        if (agentCheck && agentCheck.length > 0) {
          dbAgentId = agentCheck[0].id;
          console.log('[TaskManagementStore] ✅ Mapped registry format:', { from: params.agentId, to: dbAgentId });
        } else {
          throw new Error(`Agent with role ${role} not found in execution ${params.executionId}. Cannot create task.`);
        }
      } 
      else if (params.agentId.startsWith('langgraph-')) {
        // Handle langgraph-{role}-{timestamp} format
        const agentCheck = await window.electron.db.query({
          query: `SELECT id FROM ${DBTABLES.OSSWARM_AGENTS} WHERE execution_id = @execution_id AND agent_id = @agent_id ORDER BY created_at DESC LIMIT 1`,
          params: { execution_id: params.executionId, agent_id: params.agentId }
        });
        
        if (agentCheck && agentCheck.length > 0) {
          dbAgentId = agentCheck[0].id;
          console.log('[TaskManagementStore] ✅ Mapped langgraph format:', { from: params.agentId, to: dbAgentId });
        } else {
          // Try to find by role extracted from langgraph ID
          const roleMatch = params.agentId.match(/langgraph-(.+?)-\d+/);
          if (roleMatch) {
            const role = roleMatch[1];
            const roleBasedCheck = await window.electron.db.query({
              query: `SELECT id FROM ${DBTABLES.OSSWARM_AGENTS} WHERE execution_id = @execution_id AND role = @role ORDER BY created_at DESC LIMIT 1`,
              params: { execution_id: params.executionId, role: role }
            });
            
            if (roleBasedCheck && roleBasedCheck.length > 0) {
              dbAgentId = roleBasedCheck[0].id;
              console.log('[TaskManagementStore] ✅ Mapped by extracted role:', { from: params.agentId, role, to: dbAgentId });
            } else {
              throw new Error(`Agent with ID ${params.agentId} or role ${role} not found in execution ${params.executionId}. Cannot create task.`);
            }
          } else {
            throw new Error(`Agent with ID ${params.agentId} not found in execution ${params.executionId}. Cannot create task.`);
          }
        }
      } 
      else {
        // Handle direct database ID or UUID format
        const agentCheck = await window.electron.db.query({
          query: `SELECT id FROM ${DBTABLES.OSSWARM_AGENTS} WHERE (id = @id OR agent_id = @agent_id) AND execution_id = @execution_id ORDER BY created_at DESC LIMIT 1`,
          params: { id: params.agentId, agent_id: params.agentId, execution_id: params.executionId }
        });

        if (agentCheck && agentCheck.length > 0) {
          dbAgentId = agentCheck[0].id;
          console.log('[TaskManagementStore] ✅ Found direct agent ID:', { from: params.agentId, to: dbAgentId });
        } else {
          throw new Error(`Agent ${params.agentId} does not exist in execution ${params.executionId}. Cannot create task.`);
        }
      }

      // ✅ Create the task with enhanced fields including decomposition data
      await window.electron.db.query({
        query: `
          INSERT INTO ${DBTABLES.OSSWARM_TASKS}
          (id, execution_id, agent_id, task_description, priority, status, created_at,
           subtask_id, parent_task_id, required_skills, suggested_agent_types, estimated_complexity,
           coordination_notes, is_decomposed_task, task_breakdown_reasoning, assignment_reason)
          VALUES (@id, @execution_id, @agent_id, @task_description, @priority, @status, @created_at,
                  @subtask_id, @parent_task_id, @required_skills, @suggested_agent_types, @estimated_complexity,
                  @coordination_notes, @is_decomposed_task, @task_breakdown_reasoning, @assignment_reason)
        `,
        params: {
          id: taskId,
          execution_id: params.executionId,
          agent_id: dbAgentId,
          task_description: params.taskDescription,
          priority: params.priority || 0,
          status: 'pending',
          created_at: now,
          subtask_id: params.subtaskId || null,
          parent_task_id: params.parentTaskId || null,
          required_skills: params.requiredSkills ? JSON.stringify(params.requiredSkills) : null,
          suggested_agent_types: params.suggestedAgentTypes ? JSON.stringify(params.suggestedAgentTypes) : null,
          estimated_complexity: params.estimatedComplexity || 'medium',
          coordination_notes: params.coordinationNotes || null,
          is_decomposed_task: params.isDecomposedTask || false,
          task_breakdown_reasoning: params.taskBreakdownReasoning || null,
          assignment_reason: params.assignmentReason || null
        }
      });

      // Update total tasks count
      await window.electron.db.query({
        query: `UPDATE ${DBTABLES.OSSWARM_EXECUTIONS} SET total_tasks = total_tasks + 1 WHERE id = @id`,
        params: { id: params.executionId }
      });

      // Add to local state
      const newTask: OSSwarmTask = {
        id: taskId,
        execution_id: params.executionId,
        agent_id: dbAgentId,
        task_description: params.taskDescription,
        priority: params.priority || 0,
        status: 'pending',
        created_at: now,
        iterations: 0,
        max_iterations: 20,
        subtask_id: params.subtaskId,
        parent_task_id: params.parentTaskId,
        required_skills: params.requiredSkills ? JSON.stringify(params.requiredSkills) : undefined,
        suggested_agent_types: params.suggestedAgentTypes ? JSON.stringify(params.suggestedAgentTypes) : undefined,
        estimated_complexity: params.estimatedComplexity || 'medium',
        coordination_notes: params.coordinationNotes,
        is_decomposed_task: params.isDecomposedTask || false,
        task_breakdown_reasoning: params.taskBreakdownReasoning,
        assignment_reason: params.assignmentReason
      };

      set(state => ({
        tasks: [...state.tasks, newTask]
      }));

      console.log('[TaskManagementStore] ✅ Task created successfully:', { taskId, dbAgentId, executionId: params.executionId });
      return taskId;
    } catch (error: any) {
      console.error('[TaskManagementStore] ❌ Error creating task:', error);
      set({ error: error.message });
      throw error;
    }
  },

  createDecomposedTasks: async (executionId: string, subtasks: DecomposedSubtask[], taskAnalysis?: string) => {
    const createdTaskIds: string[] = [];
    
    try {
      console.log('[TaskManagementStore] Creating decomposed tasks:', { executionId, subtaskCount: subtasks.length });
      
      // Store decomposed tasks for UI display
      set({ decomposedTasks: subtasks });
      
      for (const subtask of subtasks) {
        // ✅ FIX: Create tasks without agent assignment first
        const taskId = uuidv4();
        const now = new Date().toISOString();
  
        // Create task directly in database without agent validation
        await window.electron.db.query({
          query: `
            INSERT INTO ${DBTABLES.OSSWARM_TASKS}
            (id, execution_id, agent_id, task_description, priority, status, created_at,
             subtask_id, required_skills, suggested_agent_types, estimated_complexity,
             coordination_notes, is_decomposed_task, task_breakdown_reasoning)
            VALUES (@id, @execution_id, @agent_id, @task_description, @priority, @status, @created_at,
                    @subtask_id, @required_skills, @suggested_agent_types, @estimated_complexity,
                    @coordination_notes, @is_decomposed_task, @task_breakdown_reasoning)
          `,
          params: {
            id: taskId,
            execution_id: executionId,
            agent_id: null, // ✅ No agent assigned yet
            task_description: subtask.description,
            priority: subtask.priority,
            status: 'pending',
            created_at: now,
            subtask_id: subtask.id,
            required_skills: JSON.stringify(subtask.requiredSkills),
            suggested_agent_types: JSON.stringify(subtask.suggestedAgentTypes),
            estimated_complexity: subtask.estimatedComplexity,
            coordination_notes: subtask.coordinationNotes,
            is_decomposed_task: true,
            task_breakdown_reasoning: taskAnalysis
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
          agent_id: '', // ✅ Empty string instead of pending-assignment
          task_description: subtask.description,
          priority: subtask.priority,
          status: 'pending',
          created_at: now,
          iterations: 0,
          max_iterations: 20,
          subtask_id: subtask.id,
          required_skills: JSON.stringify(subtask.requiredSkills),
          suggested_agent_types: JSON.stringify(subtask.suggestedAgentTypes),
          estimated_complexity: subtask.estimatedComplexity,
          coordination_notes: subtask.coordinationNotes,
          is_decomposed_task: true,
          task_breakdown_reasoning: taskAnalysis
        };
  
        set(state => ({
          tasks: [...state.tasks, newTask]
        }));
        
        createdTaskIds.push(taskId);
      }
      
      console.log('[TaskManagementStore] ✅ All decomposed tasks created:', createdTaskIds);
      return createdTaskIds;
    } catch (error: any) {
      console.error('[TaskManagementStore] ❌ Error creating decomposed tasks:', error);
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
        query: `SELECT * FROM ${DBTABLES.OSSWARM_TASKS} WHERE execution_id = @execution_id ORDER BY priority, created_at`,
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

  setDecomposedTasks: (tasks: DecomposedSubtask[]) => {
    set({ decomposedTasks: tasks });
  },

  clearTasks: () => {
    set({ tasks: [], decomposedTasks: [] });
  },

  getSubtasks: (parentTaskId: string) => {
    const { tasks } = get();
    return tasks.filter(task => task.parent_task_id === parentTaskId);
  },

  getTaskHierarchy: (executionId: string) => {
    const { tasks } = get();
    const executionTasks = tasks.filter(task => task.execution_id === executionId);
    
    const parents = executionTasks.filter(task => !task.parent_task_id);
    const children: Record<string, OSSwarmTask[]> = {};
    
    parents.forEach(parent => {
      children[parent.id] = executionTasks.filter(task => task.parent_task_id === parent.id);
    });
    
    return { parents, children };
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