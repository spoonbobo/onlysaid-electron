import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useUserTokenStore } from '../User/UserToken';
import { useWorkflowStore } from './WorkflowStore';

interface ScheduledWorkflow {
  id: string;
  name: string;
  description: string;
  category: string;
  workflowType: string; // Add workflow type for modular system
  periodType: 'one-time' | 'recurring' | 'specific-dates';
  schedule: any;
  n8nWorkflowId?: string;
  active: boolean;
  createdAt: Date;
  lastExecuted?: Date;
  nextExecution?: Date;
  metadata: Record<string, any>;
}

interface ScheduleState {
  // State
  workflows: ScheduledWorkflow[];
  isLoading: boolean;
  error: string | null;
  
  // Actions - simplified to work with the modular workflow store
  createWorkflow: (template: any, formData: any) => Promise<{ success: boolean; workflowId?: string; error?: string }>;
  deleteWorkflow: (workflowId: string) => Promise<{ success: boolean; error?: string }>;
  toggleWorkflow: (workflowId: string, active: boolean) => Promise<{ success: boolean; error?: string }>;
  getWorkflows: () => Promise<{ success: boolean; workflows?: any[]; error?: string }>;
  testN8nConnection: () => Promise<{ success: boolean; error?: string }>;
  getWorkflow: (workflowId: string) => Promise<{ success: boolean; workflow?: any; error?: string }>;
  
  // Internal actions
  addWorkflow: (workflow: ScheduledWorkflow) => void;
  removeWorkflow: (workflowId: string) => void;
  updateWorkflow: (workflowId: string, updates: Partial<ScheduledWorkflow>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useScheduleStore = create<ScheduleState>()(
  devtools(
    (set, get) => ({
      // Initial state
      workflows: [],
      isLoading: false,
      error: null,

      // Actions
      testN8nConnection: async () => {
        const userTokenStore = useUserTokenStore.getState();
        
        if (!userTokenStore.n8nApiUrl || !userTokenStore.n8nApiKey) {
          set({ error: 'N8n configuration not set. Please configure N8n in settings.' });
          return { success: false, error: 'N8n configuration not set. Please configure N8n in settings.' };
        }

        set({ isLoading: true, error: null });

        try {
          const result = await window.electron.n8nApi.testConnection({
            apiUrl: userTokenStore.n8nApiUrl,
            apiKey: userTokenStore.n8nApiKey
          });

          set({ isLoading: false });
          
          if (!result.success) {
            set({ error: result.error || 'Connection test failed' });
          }

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      createWorkflow: async (template: any, formData: any) => {
        set({ isLoading: true, error: null });

        try {
          // Use the modular workflow store to create the workflow
          const workflowStore = useWorkflowStore.getState();
          
          // Prepare schedule data
          const scheduleData = {
            selectedPeriodType: formData.selectedPeriodType,
            ...formData.scheduleData,
            specificDates: formData.specificDates,
            timezone: formData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          };

          // Create workflow using the modular system
          const result = await workflowStore.createWorkflowInN8n(
            template.id,
            formData,
            scheduleData
          );

          if (result.success && result.workflowId) {
            // Create local workflow record
            const localWorkflow: ScheduledWorkflow = {
              id: crypto.randomUUID(),
              name: template.name,
              description: template.description,
              category: template.category,
              workflowType: template.id, // Store the workflow type
              periodType: formData.selectedPeriodType || template.periodType,
              schedule: {
                ...formData,
                scheduleData: scheduleData
              },
              n8nWorkflowId: result.workflowId,
              active: true, // ✅ CHANGED: Set to true by default
              createdAt: new Date(),
              metadata: {
                template: template.id,
                workflowType: template.id,
                originalFormData: formData,
                originalScheduleData: scheduleData
              }
            };

            // Add to local store
            get().addWorkflow(localWorkflow);

            set({ isLoading: false });
            return { success: true, workflowId: result.workflowId };
          } else {
            set({ isLoading: false, error: result.error || 'Failed to create workflow' });
            return { success: false, error: result.error || 'Failed to create workflow' };
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      deleteWorkflow: async (workflowId: string) => {
        const { workflows } = get();
        const workflow = workflows.find(w => w.n8nWorkflowId === workflowId);
        
        if (!workflow) {
          const error = 'Workflow not found';
          set({ error });
          return { success: false, error };
        }

        set({ isLoading: true, error: null });

        try {
          const userTokenStore = useUserTokenStore.getState();
          
          if (!userTokenStore.n8nApiUrl || !userTokenStore.n8nApiKey) {
            const error = 'N8n configuration not set';
            set({ isLoading: false, error });
            return { success: false, error };
          }

          // Delete from N8n directly using workflow ID
          const result = await window.electron.n8nApi.deleteWorkflow({
            apiUrl: userTokenStore.n8nApiUrl,
            apiKey: userTokenStore.n8nApiKey,
            workflowId: workflowId
          });

          if (result.success) {
            // Remove from local store
            get().removeWorkflow(workflow.id);
            set({ isLoading: false });
            console.log('[WorkflowActions] Workflow deleted successfully:', workflowId);
          } else {
            set({ isLoading: false, error: result.error || 'Failed to delete workflow' });
          }

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      toggleWorkflow: async (workflowId: string, active: boolean) => {
        const { workflows } = get();
        const workflow = workflows.find(w => w.n8nWorkflowId === workflowId);
        
        if (!workflow) {
          const error = 'Workflow not found';
          set({ error });
          return { success: false, error };
        }

        set({ isLoading: true, error: null });

        try {
          // Use the modular workflow store to toggle the workflow
          const workflowStore = useWorkflowStore.getState();
          const result = await workflowStore.toggleWorkflowInN8n(workflow.workflowType, active);

          if (result.success) {
            // Update local store
            get().updateWorkflow(workflow.id, { active });
            set({ isLoading: false });
          } else {
            set({ isLoading: false, error: result.error || 'Failed to toggle workflow' });
          }

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      getWorkflows: async () => {
        const userTokenStore = useUserTokenStore.getState();
        
        if (!userTokenStore.n8nApiUrl || !userTokenStore.n8nApiKey) {
          const error = 'N8n configuration not set';
          set({ error });
          return { success: false, error };
        }

        set({ isLoading: true, error: null });

        try {
          const result = await window.electron.n8nApi.getWorkflows({
            apiUrl: userTokenStore.n8nApiUrl,
            apiKey: userTokenStore.n8nApiKey
          });

          set({ isLoading: false });

          if (!result.success) {
            set({ error: result.error || 'Failed to fetch workflows' });
          }

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      getWorkflow: async (workflowId: string) => {
        const userTokenStore = useUserTokenStore.getState();
        
        if (!userTokenStore.n8nApiUrl || !userTokenStore.n8nApiKey) {
          const error = 'N8n configuration not set';
          set({ error });
          return { success: false, error };
        }

        set({ isLoading: true, error: null });

        try {
          const result = await window.electron.n8nApi.getWorkflow({
            apiUrl: userTokenStore.n8nApiUrl,
            apiKey: userTokenStore.n8nApiKey,
            workflowId: workflowId
          });

          set({ isLoading: false });

          if (!result.success) {
            set({ error: result.error || 'Failed to fetch workflow' });
          }

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Internal actions
      addWorkflow: (workflow: ScheduledWorkflow) => {
        set(state => ({
          workflows: [...state.workflows, workflow]
        }), false, 'addWorkflow');
      },

      removeWorkflow: (workflowId: string) => {
        set(state => ({
          workflows: state.workflows.filter(w => w.id !== workflowId)
        }), false, 'removeWorkflow');
      },

      updateWorkflow: (workflowId: string, updates: Partial<ScheduledWorkflow>) => {
        set(state => ({
          workflows: state.workflows.map(w => 
            w.id === workflowId ? { ...w, ...updates } : w
          )
        }), false, 'updateWorkflow');
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading }, false, 'setLoading');
      },

      setError: (error: string | null) => {
        set({ error }, false, 'setError');
      },

      clearError: () => {
        set({ error: null }, false, 'clearError');
      }
    }),
    {
      name: 'schedule-store',
    }
  )
);

// Helper hooks for common operations - simplified
export const useScheduleActions = () => {
  const store = useScheduleStore();
  return {
    createWorkflow: store.createWorkflow,
    deleteWorkflow: store.deleteWorkflow,
    toggleWorkflow: store.toggleWorkflow,
    getWorkflows: store.getWorkflows,
    getWorkflow: store.getWorkflow,
    testN8nConnection: store.testN8nConnection,
    clearError: store.clearError,
  };
};

export const useScheduleState = () => {
  const store = useScheduleStore();
  const userTokenStore = useUserTokenStore();
  
  return {
    workflows: store.workflows,
    isLoading: store.isLoading,
    error: store.error,
    // Get N8n config from UserToken store
    n8nConfig: userTokenStore.n8nApiUrl && userTokenStore.n8nApiKey ? {
      apiUrl: userTokenStore.n8nApiUrl,
      apiKey: userTokenStore.n8nApiKey
    } : null,
    n8nConnected: userTokenStore.n8nConnected,
    n8nVerified: userTokenStore.n8nVerified,
    n8nError: userTokenStore.n8nError,
  };
};

// N8n config hook - unchanged
export const useN8nConfig = () => {
  const userTokenStore = useUserTokenStore();
  
  return {
    apiUrl: userTokenStore.n8nApiUrl,
    apiKey: userTokenStore.n8nApiKey,
    connected: userTokenStore.n8nConnected,
    verified: userTokenStore.n8nVerified,
    error: userTokenStore.n8nError,
    connecting: userTokenStore.n8nConnecting,
    setApiUrl: userTokenStore.setN8nApiUrl,
    setApiKey: userTokenStore.setN8nApiKey,
    connect: userTokenStore.connectN8n,
    disconnect: userTokenStore.disconnectN8n,
    testConnection: userTokenStore.testN8nConnection,
  };
};
