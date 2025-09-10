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

  // Reconciliation helpers
  finalizePendingDecomposedTasks: (executionId: string, result?: string, error?: string) => Promise<void>;
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
  },

  // Mark all pending/running decomposed tasks of an execution as completed/failed in DB and memory
  finalizePendingDecomposedTasks: async (executionId: string, result?: string, error?: string) => {
    try {
      const now = new Date().toISOString();
      const status = error ? 'failed' : 'completed';

      await window.electron.db.query({
        query: `
          UPDATE ${DBTABLES.OSSWARM_TASKS}
          SET status = @status,
              result = COALESCE(result, @result),
              error = COALESCE(error, @error),
              completed_at = COALESCE(completed_at, @completed_at)
          WHERE execution_id = @execution_id
            AND is_decomposed_task = 1
            AND (status IS NULL OR status IN ('pending','running'))
        `,
        params: {
          status,
          result: result || null,
          error: error || null,
          completed_at: now,
          execution_id: executionId
        }
      });

      // Update local state
      set((state) => ({
        tasks: state.tasks.map((t) => (
          t.execution_id === executionId && t.is_decomposed_task && (!t.status || t.status === 'pending' || t.status === 'running')
            ? { ...t, status: status as any, result: t.result ?? result, error: t.error ?? error, completed_at: t.completed_at ?? now }
            : t
        ))
      }));

      console.log('[TaskManagementStore] ✅ Finalized pending decomposed subtasks for execution:', executionId);
    } catch (e: any) {
      console.warn('[TaskManagementStore] ⚠️ Failed to finalize decomposed subtasks:', e?.message || e);
    }
  }
}));

// Register a single global listener exactly once to reflect real-time updates into the store
if (typeof window !== 'undefined' && (window as any).electron?.ipcRenderer) {
  const w = window as any;
  if (!w.__onlysaid_task_status_listener_registered__) {
    w.__onlysaid_task_status_listener_registered__ = true;
    w.electron.ipcRenderer.on('agent:update_task_status', (event: any, payload?: any) => {
      try {
        const data = payload || {};
        const { taskId, status, result, error, executionId, taskDescription, subtaskId } = data as { 
          taskId?: string; 
          status: string; 
          result?: string; 
          error?: string; 
          executionId?: string; 
          taskDescription?: string;
          subtaskId?: string; // Added subtaskId for decomposed task tracking
        };
        if (!status) return;
        const store = useTaskManagementStore.getState();

        const persistUpdate = (resolvedTaskId: string) => {
          store.updateTaskStatus(resolvedTaskId, status as any, result, error).catch((e) => {
            console.warn('[TaskManagementStore] Failed to persist task status update, will still update state:', e);
            useTaskManagementStore.setState((state) => ({
              tasks: state.tasks.map((t) => t.id === resolvedTaskId ? { ...t, status: status as any, result, error, completed_at: (status === 'completed' || status === 'failed') ? new Date().toISOString() : t.completed_at } : t)
            }));
          });
        };

        // 1) If taskId exists in memory, use it directly
        if (taskId && store.tasks.some(t => t.id === taskId)) {
          persistUpdate(taskId);
          return;
        }

        // 2) Try to resolve by querying DB using various methods
        const resolveAndPersist = async () => {
          try {
            let rows: any[] = [];
            
            // First, try to find by subtask_id if provided (for decomposed tasks)
            if (subtaskId && executionId) {
              rows = await w.electron.db.query({
                query: `SELECT id FROM ${DBTABLES.OSSWARM_TASKS} WHERE execution_id = @execution_id AND subtask_id = @subtask_id ORDER BY created_at DESC LIMIT 1`,
                params: { execution_id: executionId, subtask_id: subtaskId }
              });
              if (rows && rows.length > 0) {
                console.log('[TaskManagementStore] Found task by subtask_id:', subtaskId);
                persistUpdate(rows[0].id);
                return;
              }
            }
            
            // Fallback to original logic if no subtask_id or not found
            if (!executionId && !taskDescription) return; // Not enough info
            
            if (executionId && taskDescription) {
              rows = await w.electron.db.query({
                query: `SELECT id FROM ${DBTABLES.OSSWARM_TASKS} WHERE execution_id = @execution_id AND task_description = @task_description ORDER BY created_at DESC LIMIT 1`,
                params: { execution_id: executionId, task_description: taskDescription }
              });
            }
            if ((!rows || rows.length === 0) && taskDescription) {
              rows = await w.electron.db.query({
                query: `SELECT id FROM ${DBTABLES.OSSWARM_TASKS} WHERE task_description = @task_description ORDER BY created_at DESC LIMIT 1`,
                params: { task_description: taskDescription }
              });
            }
            const resolvedTaskId = rows && rows.length > 0 ? rows[0].id : undefined;
            if (resolvedTaskId) {
              persistUpdate(resolvedTaskId);
            } else {
              console.warn('[TaskManagementStore] Could not resolve task id for status update:', { executionId, taskDescription, subtaskId, status });
            }
          } catch (e) {
            console.error('[TaskManagementStore] DB lookup failed while resolving task for status update:', e);
          }
        };

        resolveAndPersist();
      } catch (e) {
        console.error('[TaskManagementStore] Error handling agent:update_task_status:', e);
      }
    });
  }

  // Register a synthesis listener to reconcile decomposed tasks via the store
  if (!w.__onlysaid_task_synthesis_listener_registered__) {
    w.__onlysaid_task_synthesis_listener_registered__ = true;
    w.electron.ipcRenderer.on('agent:result_synthesized', async (event: any, payload?: any) => {
      try {
        const data = payload || {};
        const { executionId, result } = data as { executionId?: string; result?: string };
        if (!executionId) return;
        await useTaskManagementStore.getState().finalizePendingDecomposedTasks(executionId, result);
      } catch (e) {
        console.warn('[TaskManagementStore] ⚠️ Failed to handle result_synthesized reconciliation:', e);
      }
    });
  }

  // Also reconcile on execution status completed
  if (!w.__onlysaid_task_execstatus_listener_registered__) {
    w.__onlysaid_task_execstatus_listener_registered__ = true;
    w.electron.ipcRenderer.on('agent:update_execution_status', async (event: any, payload?: any) => {
      try {
        const data = payload || {};
        const { executionId, status, result, error } = data as { executionId?: string; status?: string; result?: string; error?: string };
        if (!executionId || status !== 'completed') return;
        await useTaskManagementStore.getState().finalizePendingDecomposedTasks(executionId, result, error);
      } catch (e) {
        console.warn('[TaskManagementStore] ⚠️ Failed to handle execution status reconciliation:', e);
      }
    });
  }
} 