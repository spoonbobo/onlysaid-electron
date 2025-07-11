// onlysaid-electron/src/renderer/stores/Schedule/WorkflowStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClassDiscussionWorkflow } from "./Workflows/Education/Classes/ClassDiscussionWorkflow";
import { IWorkflowModule } from "@/renderer/components/Dialog/Schedule/Registry/WorkflowRegistry";
import { workflowRegistry } from "@/renderer/components/Dialog/Schedule/Registry/WorkflowRegistry";
import { useUserTokenStore } from '../User/UserToken';

// Workflow registry - similar to MCP SERVER_REGISTRY
const WORKFLOW_REGISTRY = {
  'class-discussion': createClassDiscussionWorkflow,
};

export const WORKFLOW_TYPE_MAPPING: Record<string, string> = {
  'class-discussion': 'classDiscussion',
  'lecture': 'lecture',
  'assignment': 'assignment',
  'exam-schedule': 'examSchedule',
  'office-hours': 'officeHours',
};

interface IWorkflowState {
  enabled: boolean;
  configured: boolean;
  config: Record<string, any>;
  lastExecution?: Date;
  nextExecution?: Date;
  n8nWorkflowId?: string;
}

interface WorkflowStoreState {
  // Individual workflow states
  classDiscussionEnabled: boolean;
  classDiscussionConfig: Record<string, any>;
  classDiscussionWorkflowId?: string;
  
  // Generic workflow management
  workflowStates: Record<string, IWorkflowState>;
  workflows: Record<string, any>; // Store workflow modules
  
  // Actions
  setWorkflowEnabled: (workflowType: string, enabled: boolean) => void;
  setWorkflowConfig: (workflowType: string, config: any) => void;
  setWorkflowN8nId: (workflowType: string, workflowId: string) => void;
  isWorkflowConfigured: (workflowType: string) => boolean;
  createWorkflowInN8n: (workflowType: string, formData: any, scheduleData: any) => Promise<{ success: boolean; workflowId?: string; error?: string }>;
  deleteWorkflowFromN8n: (workflowType: string) => Promise<{ success: boolean; error?: string }>;
  toggleWorkflowInN8n: (workflowType: string, active: boolean) => Promise<{ success: boolean; error?: string }>;
  getAllConfiguredWorkflows: () => Record<string, IWorkflowState>;
  resetToDefaults: () => void;
  syncN8nWorkflows: () => Promise<{ success: boolean; syncedCount?: number; error?: string }>;
  
  // Utility methods
  getWorkflowTypeMapping: () => Record<string, string>;
  formatWorkflowName: (workflowId: string) => string;
}

export const useWorkflowStore = create<WorkflowStoreState>()(
  persist(
    (set, get) => {
      // Create workflow instances
      const createWorkflowInstances = () => {
        return Object.entries(WORKFLOW_REGISTRY).reduce((acc, [workflowType, createWorkflow]) => {
          acc[workflowType] = createWorkflow(
            get,
            set,
            async (workflowType: string, formData: any, scheduleData: any) => {
              const state = get();
              return await state.createWorkflowInN8n(workflowType, formData, scheduleData);
            }
          );
          return acc;
        }, {} as Record<string, any>);
      };

      // Create temporary workflows to extract default configs
      const tempWorkflows = createWorkflowInstances();

      // Generate default state dynamically from workflow configs
      const defaultState = {
        // Generate enabled/config pairs for each workflow
        ...Object.entries(tempWorkflows).reduce((state, [workflowType, workflow]) => {
          const camelCaseName = WORKFLOW_TYPE_MAPPING[workflowType] || workflowType;
          return {
            ...state,
            [`${camelCaseName}Enabled`]: false,
            [`${camelCaseName}Config`]: workflow.defaultConfig || {},
            [`${camelCaseName}WorkflowId`]: undefined,
          };
        }, {}),

        workflowStates: {} as Record<string, IWorkflowState>,
      };

      // Create the actual workflows
      const workflows = tempWorkflows;

      return {
        // Start with dynamically generated default state
        ...defaultState,

        workflows,

        // Generic methods
        setWorkflowEnabled: (workflowType, enabled) => {
          const workflow = workflows[workflowType];
          if (workflow) {
            workflow.setEnabled(enabled);
          } else {
            console.warn(`Unknown workflow: ${workflowType}`);
          }
        },

        setWorkflowConfig: (workflowType, config) => {
          const workflow = workflows[workflowType];
          if (workflow) {
            workflow.setConfig(config);
          } else {
            console.warn(`Unknown workflow: ${workflowType}`);
          }
        },

        setWorkflowN8nId: (workflowType, workflowId) => {
          const workflow = workflows[workflowType];
          if (workflow && workflow.setN8nWorkflowId) {
            workflow.setN8nWorkflowId(workflowId);
          } else {
            console.warn(`Unknown workflow or setN8nWorkflowId not available: ${workflowType}`);
          }
        },

        isWorkflowConfigured: (workflowType) => {
          const workflow = workflows[workflowType];
          return workflow ? workflow.getConfigured() : false;
        },

        createWorkflowInN8n: async (workflowType: string, formData: any, scheduleData: any) => {
          console.log('🏪 [WorkflowStore] Creating workflow:', { workflowType, formData, scheduleData });
          
          const userTokenStore = useUserTokenStore.getState();
          
          if (!userTokenStore.n8nApiUrl || !userTokenStore.n8nApiKey) {
            console.log('❌ [WorkflowStore] N8n not configured');
            return { success: false, error: 'N8n configuration not set. Please configure N8n in settings.' };
          }

          if (!userTokenStore.n8nConnected) {
            console.log('❌ [WorkflowStore] N8n not connected');
            return { success: false, error: 'N8n not connected. Please connect to N8n first.' };
          }

          const workflow = workflows[workflowType];
          if (!workflow) {
            console.log('❌ [WorkflowStore] Unknown workflow type:', workflowType);
            console.log('Available workflows:', Object.keys(workflows));
            return { success: false, error: `Unknown workflow type: ${workflowType}` };
          }

          console.log('✅ [WorkflowStore] Found workflow, generating N8n workflow...');

          try {
            // Generate N8n workflow using the workflow module
            const n8nWorkflow = workflow.generateN8nWorkflow(formData, scheduleData);
            console.log('📄 [WorkflowStore] Generated N8n workflow:', n8nWorkflow);
            
            // Create workflow in N8n (without active property)
            console.log('📡 [WorkflowStore] Creating workflow in N8n...');
            const createResult = await window.electron.n8nApi.createWorkflow({
              apiUrl: userTokenStore.n8nApiUrl,
              apiKey: userTokenStore.n8nApiKey,
              workflow: n8nWorkflow
            });

            console.log('🎯 [WorkflowStore] Create workflow result:', createResult);
            
            if (createResult.success && createResult.workflowId) {
              // ✅ ACTIVATE WORKFLOW AUTOMATICALLY after creation using the proper endpoint
              console.log('🔄 [WorkflowStore] Activating workflow automatically...');
              const activateResult = await window.electron.n8nApi.activateWorkflow({
                apiUrl: userTokenStore.n8nApiUrl,
                apiKey: userTokenStore.n8nApiKey,
                workflowId: createResult.workflowId
              });

              if (activateResult.success) {
                console.log('✅ [WorkflowStore] Workflow activated successfully');
              } else {
                console.warn('⚠️ [WorkflowStore] Failed to activate workflow:', activateResult.error);
                // Don't fail the entire operation if activation fails
              }
              
              // Store the N8n workflow ID
              get().setWorkflowN8nId(workflowType, createResult.workflowId);
              
              // Update workflow state - set enabled to true by default
              set(state => ({
                workflowStates: {
                  ...state.workflowStates,
                  [workflowType]: {
                    enabled: true, // ✅ Set to true by default
                    configured: true,
                    config: { ...formData, ...scheduleData },
                    n8nWorkflowId: createResult.workflowId,
                    lastExecution: undefined,
                    nextExecution: new Date() // Calculate based on schedule
                  }
                }
              }));

              console.log('✅ [WorkflowStore] Workflow created and activated successfully with ID:', createResult.workflowId);
              return { success: true, workflowId: createResult.workflowId };
            } else {
              console.log('❌ [WorkflowStore] N8n API failed:', createResult.error);
              return { success: false, error: createResult.error || 'Failed to create workflow' };
            }
          } catch (error: any) {
            console.error(`💥 [WorkflowStore] Error creating ${workflowType} workflow:`, error);
            return { success: false, error: error.message || "Unknown error" };
          }
        },

        // ✅ ENHANCED: Better logging and error handling
        deleteWorkflowFromN8n: async (workflowType: string) => {
          console.log('[WorkflowStore] deleteWorkflowFromN8n called with type:', workflowType);
          
          const userTokenStore = useUserTokenStore.getState();
          const { workflowStates } = get();
          
          if (!userTokenStore.n8nApiUrl || !userTokenStore.n8nApiKey) {
            console.error('[WorkflowStore] N8n configuration not set');
            return { success: false, error: 'N8n configuration not set' };
          }

          const workflowState = workflowStates[workflowType];
          if (!workflowState?.n8nWorkflowId) {
            console.error('[WorkflowStore] Workflow not found or not deployed:', {
              workflowType,
              availableStates: Object.keys(workflowStates),
              workflowState
            });
            return { success: false, error: 'Workflow not found or not deployed' };
          }

          console.log('[WorkflowStore] Attempting to delete workflow:', {
            workflowType,
            n8nWorkflowId: workflowState.n8nWorkflowId,
            apiUrl: userTokenStore.n8nApiUrl
          });

          try {
            const result = await window.electron.n8nApi.deleteWorkflow({
              apiUrl: userTokenStore.n8nApiUrl,
              apiKey: userTokenStore.n8nApiKey,
              workflowId: workflowState.n8nWorkflowId
            });

            console.log('[WorkflowStore] N8n API delete result:', result);

            if (result.success) {
              console.log('[WorkflowStore] Successfully deleted, removing from local state');
              // Remove from local state
              set(state => {
                const newStates = { ...state.workflowStates };
                delete newStates[workflowType];
                console.log('[WorkflowStore] Updated workflow states:', Object.keys(newStates));
                return { workflowStates: newStates };
              });
            } else {
              console.error('[WorkflowStore] N8n deletion failed:', result.error);
            }

            return result;
          } catch (error: any) {
            console.error('[WorkflowStore] Exception during delete:', error);
            return { success: false, error: error.message || "Unknown error" };
          }
        },

        toggleWorkflowInN8n: async (workflowType: string, active: boolean) => {
          const userTokenStore = useUserTokenStore.getState();
          const { workflowStates } = get();
          
          if (!userTokenStore.n8nApiUrl || !userTokenStore.n8nApiKey) {
            return { success: false, error: 'N8n configuration not set' };
          }

          const workflowState = workflowStates[workflowType];
          if (!workflowState?.n8nWorkflowId) {
            return { success: false, error: 'Workflow not found or not deployed' };
          }

          try {
            const result = await window.electron.n8nApi.toggleWorkflow({
              apiUrl: userTokenStore.n8nApiUrl,
              apiKey: userTokenStore.n8nApiKey,
              workflowId: workflowState.n8nWorkflowId,
              active: active
            });

            if (result.success) {
              // Update local state
              set(state => ({
                workflowStates: {
                  ...state.workflowStates,
                  [workflowType]: {
                    ...state.workflowStates[workflowType],
                    enabled: active
                  }
                }
              }));
            }

            return result;
          } catch (error: any) {
            return { success: false, error: error.message || "Unknown error" };
          }
        },

        getAllConfiguredWorkflows: () => {
          return get().workflowStates;
        },

        resetToDefaults: () => {
          Object.values(workflows).forEach(workflow => {
            if (workflow.setConfig) {
              workflow.setConfig(workflow.defaultConfig || {});
            }
            if (workflow.setEnabled) {
              workflow.setEnabled(false);
            }
          });
          set({ workflowStates: {} });
        },

        formatWorkflowName: (workflowId: string): string => {
          return workflowId
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim()
            .replace(/Workflow$/, '')
            .trim();
        },

        getWorkflowTypeMapping: () => WORKFLOW_TYPE_MAPPING,

        // ✅ NEW: Sync existing N8n workflows into workflowStates
        syncN8nWorkflows: async () => {
          console.log('[WorkflowStore] Syncing N8n workflows');
          
          const userTokenStore = useUserTokenStore.getState();
          
          if (!userTokenStore.n8nApiUrl || !userTokenStore.n8nApiKey) {
            console.log('[WorkflowStore] N8n not configured, skipping sync');
            return { success: false, error: 'N8n configuration not set' };
          }

          try {
            const result = await window.electron.n8nApi.getWorkflows({
              apiUrl: userTokenStore.n8nApiUrl,
              apiKey: userTokenStore.n8nApiKey
            });

            if (result.success && result.workflows) {
              console.log('[WorkflowStore] Found N8n workflows:', result.workflows.length);
              
              const syncedStates: Record<string, IWorkflowState> = {};
              
              result.workflows.forEach((workflow: any) => {
                // Try to determine workflow type from name or other properties
                let workflowType = 'unknown';
                
                if (workflow.name.toLowerCase().includes('discussion')) {
                  workflowType = 'class-discussion';
                } else if (workflow.name.toLowerCase().includes('lecture')) {
                  workflowType = 'lecture';
                } else if (workflow.name.toLowerCase().includes('assignment')) {
                  workflowType = 'assignment';
                }
                
                // If we already have this workflow type, append a suffix to avoid conflicts
                let finalWorkflowType = workflowType;
                let counter = 1;
                while (syncedStates[finalWorkflowType]) {
                  finalWorkflowType = `${workflowType}-${counter}`;
                  counter++;
                }
                
                syncedStates[finalWorkflowType] = {
                  enabled: workflow.active,
                  configured: true,
                  config: {
                    name: workflow.name,
                    syncedFromN8n: true,
                    originalWorkflowId: workflow.id
                  },
                  n8nWorkflowId: workflow.id,
                  lastExecution: undefined,
                  nextExecution: undefined
                };
                
                console.log('[WorkflowStore] Synced workflow:', {
                  originalName: workflow.name,
                  workflowType: finalWorkflowType,
                  n8nId: workflow.id,
                  active: workflow.active
                });
              });

              // Merge with existing workflow states
              set(state => ({
                workflowStates: {
                  ...state.workflowStates,
                  ...syncedStates
                }
              }));

              console.log('[WorkflowStore] Sync completed. Total workflow states:', Object.keys({...get().workflowStates, ...syncedStates}).length);
              
              return { success: true, syncedCount: result.workflows.length };
            } else {
              console.error('[WorkflowStore] Failed to get N8n workflows:', result.error);
              return { success: false, error: result.error || 'Failed to get workflows' };
            }
          } catch (error: any) {
            console.error('[WorkflowStore] Error during sync:', error);
            return { success: false, error: error.message || 'Unknown error' };
          }
        },
      } as WorkflowStoreState;
    },
    {
      name: "workflow-store-storage"
    }
  )
);
