// onlysaid-electron/src/renderer/stores/Schedule/Workflows/ClassDiscussionWorkflow.ts
import { IWorkflowModule } from "@/renderer/components/Dialog/Schedule/Registry/WorkflowRegistry";
import { 
  N8nWorkflow, 
  CronTriggerNode, 
  EmailNode,
  DiscussionSectionWorkflowParams 
} from "@/../../types/Workflow/n8n";

export interface IClassDiscussionConfig {
  workspaceId: string;
  workspaceName: string;
  reminderTime: string; // How long before class to send reminder
  emailTemplate: string;
}

export interface IClassDiscussionWorkflowModule extends IWorkflowModule {
  defaultConfig: IClassDiscussionConfig;
  
  // Store integration methods
  setEnabled: (enabled: boolean) => void;
  setConfig: (config: Partial<IClassDiscussionConfig>) => void;
  setN8nWorkflowId: (workflowId: string) => void;
  getEnabled: () => boolean;
  getConfig: () => IClassDiscussionConfig;
  getConfigured: () => boolean;
  getN8nWorkflowId: () => string | undefined;
  
  // N8n workflow generation
  generateN8nWorkflow: (formData: any, scheduleData: any) => N8nWorkflow;
  validateWorkflowData: (formData: any, scheduleData: any) => { isValid: boolean; errors: string[] };
}

export const createClassDiscussionWorkflow = (
  get: () => any,
  set: (partial: any) => void,
  createWorkflowInN8n: (workflowType: string, formData: any, scheduleData: any) => Promise<any>
): IClassDiscussionWorkflowModule => {
  
  const defaultConfig: IClassDiscussionConfig = {
    workspaceId: '',
    workspaceName: '',
    reminderTime: '1h', // 1 hour before
    emailTemplate: 'default'
  };

  return {
    // Workflow metadata (from registry)
    metadata: {
      id: "class-discussion",
      title: "Class Discussion",
      description: "Schedule interactive discussion sessions with students",
      category: "classes",
      version: "1.0.0",
      icon: "School",
      periodType: "recurring"
    },

    defaultSchedule: {
      frequency: 'weekly',
      days: ['monday', 'wednesday', 'friday'],
      time: '10:00',
      duration: 50
    },

    defaultConfig,

    getFormFields: () => [
      {
        key: "workspace",
        label: "Select Class",
        type: "workspace-select",
        required: true,
        description: "Choose the class/workspace for this discussion"
      },
      // ✅ ADD: Email field with your email as default
      {
        key: "recipientEmail",
        label: "Send Email To",
        type: "text",
        required: false,
        description: "Email address to send the reminder to",
        defaultValue: "seasonluke@gmail.com"
      }
    ],

    validateFormData: (formData: Record<string, any>) => {
      const errors: Record<string, string> = {};
      let isValid = true;

      if (!formData.workspace) {
        errors.workspace = "Please select a class";
        isValid = false;
      }

      return { isValid, errors };
    },

    autoPopulateFromWorkspace: (workspaceId: string, workspaceName: string) => {
      return {
        workspace: workspaceId
      };
    },

    generateWorkflowContent: (formData: Record<string, any>, scheduleData: Record<string, any>) => {
      return {
        title: "Class Discussion",
        description: "Interactive discussion session for the class",
        content: "## Class Discussion\n\nScheduled discussion session for the selected class.",
        participants: [],
        resources: []
      };
    },

    // Store integration methods
    setEnabled: (enabled: boolean) => {
      set((state: any) => ({
        classDiscussionEnabled: enabled
      }));
    },

    setConfig: (config: Partial<IClassDiscussionConfig>) => {
      set((state: any) => ({
        classDiscussionConfig: { ...state.classDiscussionConfig, ...config }
      }));
    },

    setN8nWorkflowId: (workflowId: string) => {
      set((state: any) => ({
        classDiscussionWorkflowId: workflowId
      }));
    },

    getEnabled: () => {
      return get().classDiscussionEnabled || false;
    },

    getConfig: () => {
      return get().classDiscussionConfig || defaultConfig;
    },

    getConfigured: () => {
      const config = get().classDiscussionConfig || {};
      return !!(config.workspaceId && config.workspaceName);
    },

    getN8nWorkflowId: () => {
      return get().classDiscussionWorkflowId;
    },

    // N8n workflow generation
    generateN8nWorkflow: (formData: any, scheduleData: any): N8nWorkflow => {
      console.log('🏗️ [ClassDiscussion] Generating workflow with:', { formData, scheduleData });
      
      // For specific dates, we should create multiple workflows
      if (scheduleData.selectedPeriodType === 'specific-dates' && scheduleData.specificDates?.length > 1) {
        console.warn('⚠️ [ClassDiscussion] Multiple specific dates detected. Consider creating separate workflows for each date.');
      }
      
      // Use the first preview date or current schedule
      let targetDate: Date;
      
      if (scheduleData.selectedPeriodType === 'specific-dates' && scheduleData.specificDates?.length > 0) {
        targetDate = new Date(scheduleData.specificDates[0]);
      } else if (scheduleData.selectedPeriodType === 'one-time') {
        targetDate = new Date(`${scheduleData.date}T${scheduleData.time}`);
      } else {
        // For recurring, use next occurrence
        targetDate = new Date(`${scheduleData.date || new Date().toISOString().split('T')[0]}T${scheduleData.time}`);
      }
      
      const params: DiscussionSectionWorkflowParams = {
        courseCode: formData.workspaceName || 'COURSE',
        sectionNumber: '001',
        room: 'TBD',
        instructorEmail: formData.instructorEmail || 'instructor@university.edu',
        // ✅ FIX: Always use your email as default, regardless of form data
        studentEmails: ['seasonluke@gmail.com'], // Always use your email
        scheduleDate: targetDate.toISOString().split('T')[0],
        scheduleTime: `${targetDate.getHours().toString().padStart(2, '0')}:${targetDate.getMinutes().toString().padStart(2, '0')}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        periodType: scheduleData.selectedPeriodType,
        frequency: scheduleData.frequency,
        days: scheduleData.days
      };

      console.log('📝 [ClassDiscussion] Using params with your email:', params);
      return createDiscussionSectionWorkflow(params);
    },

    validateWorkflowData: (formData: any, scheduleData: any) => {
      const errors: string[] = [];
      
      if (!formData.workspace) {
        errors.push("Workspace selection is required");
      }
      
      if (!scheduleData.time) {
        errors.push("Schedule time is required");
      }

      if (scheduleData.selectedPeriodType === 'one-time' && !scheduleData.date) {
        errors.push("Schedule date is required for one-time events");
      }

      if (scheduleData.selectedPeriodType === 'recurring' && !scheduleData.frequency) {
        errors.push("Frequency is required for recurring events");
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    }
  };
};

// ✅ FIX: Correct N8n Schedule Trigger structure
function createDiscussionSectionWorkflow(params: DiscussionSectionWorkflowParams): N8nWorkflow {
  console.log('🔧 [createDiscussionSectionWorkflow] Creating with params:', params);
  
  const scheduleDate = new Date(`${params.scheduleDate}T${params.scheduleTime}:00`);
  const minute = scheduleDate.getMinutes();
  const hour = scheduleDate.getHours();
  
  // ✅ FIX: Use correct N8n scheduleTrigger parameter structure
  const scheduleTriggerNode = {
    id: 'schedule-trigger',
    name: 'Schedule Trigger',
    type: 'n8n-nodes-base.scheduleTrigger',
    typeVersion: 1.1,
    position: [240, 300] as [number, number],
    parameters: {
      // ✅ FIX: Use triggerRules array instead of rule object
      triggerRules: [
        {
          interval: 'days',
          daysBetweenTriggers: 1,
          triggerAtHour: hour,
          triggerAtMinute: minute
        }
      ]
    }
  };

  const emailNode = {
    id: 'send-email',
    name: 'Send Gmail',
    type: 'n8n-nodes-base.gmail',
    typeVersion: 2,
    position: [460, 300] as [number, number],
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: 'seasonluke@gmail.com',
      subject: `Class Discussion Reminder - ${params.courseCode}`,
      emailType: 'text',
      message: `Class discussion reminder for ${params.courseCode} at ${params.scheduleTime}.`
    },
    credentials: {
      gmailOAuth2: 'Gmail OAuth2'
    }
  };

  const workflow: N8nWorkflow = {
    name: `Class Discussion - ${params.courseCode}`,
    nodes: [scheduleTriggerNode, emailNode],
    connections: {
      'Schedule Trigger': {
        main: [[{
          node: 'Send Gmail',
          type: 'main',
          index: 0
        }]]
      }
    },
    settings: {
      timezone: params.timezone || 'UTC',
      saveManualExecutions: true,
      saveExecutionProgress: true,
      saveDataErrorExecution: 'all',
      saveDataSuccessExecution: 'all',
      executionTimeout: 3600,
      executionOrder: 'v1'
    }
  };

  console.log('✅ [createDiscussionSectionWorkflow] Workflow with corrected triggerRules:', {
    name: workflow.name,
    hasSettings: !!workflow.settings,
    triggerParams: scheduleTriggerNode.parameters
  });

  return workflow;
}