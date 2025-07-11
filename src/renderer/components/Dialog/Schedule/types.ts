// types.ts
import React from 'react';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'classes' | 'student' | 'assessments' | 'meetings' | 'research' | 'admin';
  icon: React.ReactNode;
  periodType: 'one-time' | 'recurring' | 'specific-dates';
  defaultSchedule?: {
    frequency?: 'daily' | 'weekly' | 'monthly';
    days?: string[];
    time?: string;
    duration?: number; // minutes
  };
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'time' | 'date' | 'select' | 'multiselect' | 'textarea' | 'workspace-select';
    options?: string[];
    required?: boolean;
    defaultValue?: any;
    description?: string; // Add this property
  }>;
}

export interface WorkflowDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateWorkflow?: (template: WorkflowTemplate, data: any) => void;
}

export interface WorkflowTemplateGridProps {
  templates: WorkflowTemplate[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  onTemplateSelect: (template: WorkflowTemplate) => void;
  getPeriodTypeLabel: (periodType: string) => string;
  getCategoryLabel: (category: string) => string;
}

export interface WorkflowFormFieldsProps {
  selectedTemplate: WorkflowTemplate;
  formData: Record<string, any>;
  onFieldChange: (fieldKey: string, value: any) => void;
  onBack: () => void;
}

export interface ScheduleConfigurationProps {
  selectedPeriodType: 'one-time' | 'recurring' | 'specific-dates';
  scheduleData: Record<string, any>;
  specificDates: string[];
  newDate: string;
  newTime: string;
  onPeriodTypeChange: (newPeriodType: 'one-time' | 'recurring' | 'specific-dates') => void;
  onScheduleChange: (field: string, value: any) => void;
  onNewDateChange: (date: string) => void;
  onNewTimeChange: (time: string) => void;
  onAddSpecificDate: () => void;
  onRemoveSpecificDate: (index: number) => void;
  getCurrentTime: () => string;
  getCurrentDate: () => string;
  getDayTranslation: (day: string) => string;
}

export interface ScheduleDatesPreviewProps {
  selectedPeriodType: 'one-time' | 'recurring' | 'specific-dates';
  scheduleData: Record<string, any>;
  specificDates: string[];
  generatePreviewDates: () => Date[];
  formatPreviewDate: (date: Date) => string;
  formatSpecificDate: (dateTime: string) => string;
  onRemoveSpecificDate: (index: number) => void;
}

export interface WorkflowDialogHeaderProps {
  selectedTemplate: WorkflowTemplate | null;
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  n8nError: string | null;
  creationSuccess: boolean;
  apiUrl: string | null;
  apiKey: string | null;
  onClearError: () => void;
}

export interface WorkflowDialogActionsProps {
  selectedTemplate: WorkflowTemplate | null;
  isCreating: boolean;
  apiUrl: string | null;
  apiKey: string | null;
  connected: boolean;
  error: string | null;
  n8nError: string | null;
  hasValidSchedule: boolean;
  onClose: () => void;
  onCreateWorkflow: () => void;
}

export interface PreviewDatesDialogProps {
  open: boolean;
  onClose: () => void;
  selectedPeriodType: 'one-time' | 'recurring' | 'specific-dates';
  scheduleData: Record<string, any>;
  specificDates: string[];
  generateAllPreviewDates: () => Date[];
  formatPreviewDate: (date: Date) => string;
  formatSpecificDate: (dateTime: string) => string;
  onRemoveSpecificDate: (index: number) => void;
}
