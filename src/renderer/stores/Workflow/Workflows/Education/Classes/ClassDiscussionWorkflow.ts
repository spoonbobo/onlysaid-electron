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
        studentEmails: formData.studentEmails && formData.studentEmails.length > 0 
          ? formData.studentEmails 
          : ['student@university.edu'],
        scheduleDate: targetDate.toISOString().split('T')[0],
        scheduleTime: `${targetDate.getHours().toString().padStart(2, '0')}:${targetDate.getMinutes().toString().padStart(2, '0')}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        periodType: scheduleData.selectedPeriodType,
        frequency: scheduleData.frequency,
        days: scheduleData.days
      };

      console.log('📝 [ClassDiscussion] Using params:', params);
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

// Import the existing function from discussionSection.ts
function createDiscussionSectionWorkflow(params: DiscussionSectionWorkflowParams): N8nWorkflow {
  console.log('🔧 [createDiscussionSectionWorkflow] Creating with params:', params);
  
  const scheduleDate = new Date(`${params.scheduleDate}T${params.scheduleTime}`);
  const minute = scheduleDate.getMinutes();
  const hour = scheduleDate.getHours();
  
  let cronParameters: any;
  
  // Correct N8n Schedule Trigger parameters:
  if (params.periodType === 'one-time' || params.periodType === 'specific-dates') {
    // For one-time, use Custom (Cron) with specific date
    const day = scheduleDate.getDate();
    const month = scheduleDate.getMonth() + 1;
    
    cronParameters = {
      triggerRules: [{
        interval: 'cronExpression',
        cronExpression: `${minute} ${hour} ${day} ${month} *`
      }]
    };
  } else if (params.periodType === 'recurring') {
    if (params.frequency === 'daily') {
      cronParameters = {
        triggerRules: [{
          interval: 'days',
          daysBetweenTriggers: 1,
          triggerAtHour: hour,
          triggerAtMinute: minute
        }]
      };
    } else if (params.frequency === 'weekly' && params.days && params.days.length > 0) {
      const weekdays = params.days.map((day: string) => day.toLowerCase());
      
      cronParameters = {
        triggerRules: [{
          interval: 'weeks',
          weeksBetweenTriggers: 1,
          triggerOnWeekdays: weekdays,
          triggerAtHour: hour,
          triggerAtMinute: minute
        }]
      };
    } else {
      cronParameters = {
        triggerRules: [{
          interval: 'days',
          daysBetweenTriggers: 1,
          triggerAtHour: hour,
          triggerAtMinute: minute
        }]
      };
    }
  } else {
    cronParameters = {
      triggerRules: [{
        interval: 'days',
        daysBetweenTriggers: 1,
        triggerAtHour: hour,
        triggerAtMinute: minute
      }]
    };
  }
  
  // Create nodes with proper IDs and structure according to N8n format
  const triggerNodeId = 'trigger-node';
  const emailNodeId = 'email-node';
  
  const cronTriggerNode = {
    id: triggerNodeId,
    name: 'Schedule Trigger',
    type: 'n8n-nodes-base.scheduleTrigger', // Changed from 'n8n-nodes-base.cron'
    typeVersion: 1,
    position: [240, 300] as [number, number],
    parameters: cronParameters,
    // Add additional fields that N8n expects
    disabled: false,
    notesInFlow: false,
    executeOnce: false,
    alwaysOutputData: false,
    retryOnFail: false,
    maxTries: 3,
    waitBetweenTries: 1000,
    onError: 'stopWorkflow' as const
  };

  // Ensure we have at least one student email
  const studentEmails = params.studentEmails.length > 0 ? params.studentEmails : ['student@university.edu'];
  
  // For simplicity, let's create a single email node that handles all recipients
  // This matches better with the N8n structure
  const emailNode = {
    id: emailNodeId,
    name: 'Send Email',
    type: 'n8n-nodes-base.emailSend',
    typeVersion: 2,
    position: [460, 300] as [number, number],
    parameters: {
      fromEmail: params.instructorEmail,
      toEmail: studentEmails.join(', '), // Multiple recipients separated by comma
      subject: `Class Discussion Reminder - ${params.courseCode}`,
      message: `Dear Student,

This is a reminder for your class discussion session.

Course: ${params.courseCode}
Date: ${params.scheduleDate}
Time: ${params.scheduleTime}
Room: ${params.room}

Please be prepared for an interactive discussion.

Best regards,
${params.instructorEmail}`,
      options: {}
    },
    // Add additional fields that N8n expects
    disabled: false,
    notesInFlow: false,
    executeOnce: false,
    alwaysOutputData: false,
    retryOnFail: false,
    maxTries: 3,
    waitBetweenTries: 1000,
    onError: 'stopWorkflow' as const
    // Note: Credentials will need to be configured in N8n separately
  };

  // Create connections according to N8n format
  // The connections object structure: { [sourceNode]: { [outputType]: [[{node, type, index}]] } }
  const connections: Record<string, Record<string, Array<Array<{ node: string; type: string; index: number }>>>> = {
    [cronTriggerNode.name]: {
      main: [[{
        node: emailNode.name,
        type: 'main',
        index: 0
      }]]
    }
  };

  const workflow: N8nWorkflow = {
    name: `Class Discussion - ${params.courseCode}`,
    nodes: [cronTriggerNode, emailNode],
    connections: connections,
    settings: {
      timezone: params.timezone || 'UTC',
      saveManualExecutions: true,
      saveExecutionProgress: true,
      saveDataErrorExecution: 'all',
      saveDataSuccessExecution: 'all',
      executionTimeout: 3600,
      executionOrder: 'v1'
    },
    staticData: {
      courseInfo: {
        courseCode: params.courseCode,
        scheduleDate: params.scheduleDate,
        scheduleTime: params.scheduleTime,
      }
    }
  };

  console.log('✅ [createDiscussionSectionWorkflow] Created workflow:', {
    name: workflow.name,
    nodeCount: workflow.nodes.length,
    connections: workflow.connections,
    hasConnections: Object.keys(workflow.connections).length > 0,
    cronExpression: cronParameters.cronExpression || 'triggerTimes mode'
  });

  return workflow;
}