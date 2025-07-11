// onlysaid-electron/src/renderer/components/Dialog/Schedule/Registry/modules/ClassDiscussion.ts
import { IWorkflowModule } from '../WorkflowRegistry';
import { workflowRegistry } from '../WorkflowRegistry';
import { School } from '@mui/icons-material';
import React from 'react';

export const ClassDiscussionWorkflow: IWorkflowModule = {
  metadata: {
    id: "class-discussion",
    title: "Class Discussion",
    description: "Schedule interactive discussion sessions with students",
    category: "classes",
    version: "1.0.0",
    icon: "School",
    periodType: "one-time" // Changed from "recurring" to "one-time"
  },

  defaultSchedule: {
    frequency: 'weekly',
    days: ['monday', 'wednesday', 'friday'],
    time: '10:00',
    duration: 50
  },

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
    const { workspace } = formData;
    
    return {
      title: "Class Discussion",
      description: "Interactive discussion session for the class",
      content: "## Class Discussion\n\nScheduled discussion session for the selected class.",
      participants: [],
      resources: []
    };
  }
};

// Auto-register the workflow
workflowRegistry.register("class-discussion", ClassDiscussionWorkflow);