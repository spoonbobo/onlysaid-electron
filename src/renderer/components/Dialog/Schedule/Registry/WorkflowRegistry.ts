// onlysaid-electron/src/renderer/components/Dialog/Schedule/Registry/WorkflowRegistry.ts
import { WorkflowTemplate } from '../types';

export interface IWorkflowModule {
  metadata: {
    id: string;
    title: string;
    description: string;
    category: 'classes' | 'student' | 'assessments' | 'meetings' | 'research' | 'admin';
    version: string;
    icon: string;
    periodType: 'one-time' | 'recurring' | 'specific-dates';
  };

  defaultSchedule?: {
    frequency?: 'daily' | 'weekly' | 'monthly';
    days?: string[];
    time?: string;
    duration?: number; // minutes
  };

  // Form fields that this workflow needs
  getFormFields: () => Array<{
    key: string;
    label: string;
    type: 'text' | 'time' | 'date' | 'select' | 'multiselect' | 'textarea' | 'workspace-select';
    options?: string[];
    required?: boolean;
    description?: string;
  }>;

  // Validation logic for the workflow
  validateFormData: (formData: Record<string, any>) => {
    isValid: boolean;
    errors: Record<string, string>;
  };

  // Auto-populate logic when workspace is selected
  autoPopulateFromWorkspace?: (workspaceId: string, workspaceName: string) => Record<string, any>;

  // Generate the actual workflow/task content
  generateWorkflowContent: (
    formData: Record<string, any>,
    scheduleData: Record<string, any>
  ) => {
    title: string;
    description: string;
    content: string;
    participants?: string[];
    resources?: string[];
  };
}

class WorkflowRegistry {
  private workflows: Record<string, IWorkflowModule> = {};

  register(workflowKey: string, module: IWorkflowModule) {
    this.workflows[workflowKey] = module;
  }

  get(workflowKey: string): IWorkflowModule | undefined {
    return this.workflows[workflowKey];
  }

  getAll(): Record<string, IWorkflowModule> {
    return { ...this.workflows };
  }

  getAllByCategory(category: string): Record<string, IWorkflowModule> {
    return Object.fromEntries(
      Object.entries(this.workflows).filter(
        ([_, module]) => module.metadata.category === category
      )
    );
  }

  // Convert to the legacy WorkflowTemplate format for backward compatibility
  getAllAsTemplates(): WorkflowTemplate[] {
    return Object.entries(this.workflows).map(([key, module]) => ({
      id: key,
      name: module.metadata.title,
      description: module.metadata.description,
      category: module.metadata.category,
      icon: module.metadata.icon,
      periodType: module.metadata.periodType,
      defaultSchedule: module.defaultSchedule,
      fields: module.getFormFields()
    }));
  }
}

export const workflowRegistry = new WorkflowRegistry();

// Auto-register all workflow modules (only existing ones)
import "./modules/ClassDiscussion";
// import "./modules/Lecture";
// import "./modules/Assignment";
// import "./modules/ExamSchedule";
// import "./modules/OfficeHours";
// import "./modules/GroupProject";
// import "./modules/LabSession";
// import "./modules/StudentMeeting";