import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useIntl } from 'react-intl';
import { useScheduleActions, useScheduleState, useN8nConfig } from '@/renderer/stores/Workflow/WorkflowActions';
import { WorkflowTemplate, WorkflowDialogProps } from './types';
import { WorkflowTemplateGrid } from './WorkflowTemplateGrid';
import { WorkflowFormFields } from './WorkflowFormFields';
import { ScheduleConfiguration } from './ScheduleConfiguration';
import { ScheduleDatesPreview } from './ScheduleDatesPreview';
import { WorkflowDialogHeader } from './WorkflowDialogHeader';
import { toast } from '@/utils/toast';
import { workflowRegistry } from './Registry/WorkflowRegistry';
import { useWorkflowStore } from '@/renderer/stores/Workflow/WorkflowStore';

export function WorkflowDialog({ open, onClose, onCreateWorkflow }: WorkflowDialogProps) {
  const intl = useIntl();
  
  // Zustand store hooks
  const { clearError } = useScheduleActions();
  const { isLoading, error } = useScheduleState();
  const { 
    apiUrl, 
    apiKey, 
    connected, 
    error: n8nError
  } = useN8nConfig();

  const WORKFLOW_TEMPLATES = workflowRegistry.getAllAsTemplates();

  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activeCategory, setActiveCategory] = useState<string>('classes');
  const [selectedPeriodType, setSelectedPeriodType] = useState<'one-time' | 'recurring' | 'specific-dates'>('one-time');
  const [scheduleData, setScheduleData] = useState<Record<string, any>>({});
  const [specificDates, setSpecificDates] = useState<string[]>([]);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState(false);

  // Get next hour rounded to integer
  const getCurrentTime = () => {
    const now = new Date();
    const nextHour = now.getHours() + 1;
    // Handle 24-hour wraparound
    const hour = nextHour >= 24 ? 0 : nextHour;
    return `${hour.toString().padStart(2, '0')}:00`; // Format as HH:00
  };

  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  // Get period type translation
  const getPeriodTypeLabel = (periodType: string) => {
    switch (periodType) {
      case 'recurring':
        return intl.formatMessage({ id: 'workflow.periodType.recurring', defaultMessage: 'Recurring' });
      case 'one-time':
        return intl.formatMessage({ id: 'workflow.periodType.oneTime', defaultMessage: 'One-time' });
      case 'specific-dates':
        return intl.formatMessage({ id: 'workflow.periodType.specificDates', defaultMessage: 'Specific Dates' });
      default:
        return periodType;
    }
  };

  // Get category translation
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'classes':
        return intl.formatMessage({ id: 'workflow.category.classes', defaultMessage: 'Classes' });
      case 'student':
        return intl.formatMessage({ id: 'workflow.category.student', defaultMessage: 'Student' });
      case 'assessments':
        return intl.formatMessage({ id: 'workflow.category.assessments', defaultMessage: 'Assessments' });
      case 'meetings':
        return intl.formatMessage({ id: 'workflow.category.meetings', defaultMessage: 'Meetings' });
      case 'research':
        return intl.formatMessage({ id: 'workflow.category.research', defaultMessage: 'Research' });
      case 'admin':
        return intl.formatMessage({ id: 'workflow.category.admin', defaultMessage: 'Admin' });
      default:
        return category;
    }
  };

  const handleTemplateSelect = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setSelectedPeriodType(template.periodType);
    // Initialize form data with default values
    const initialData: Record<string, any> = {};
    template.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        initialData[field.key] = field.defaultValue;
      }
    });
    setFormData(initialData);
    
    // Set default frequency and time for recurring templates
    if (template.periodType === 'recurring') {
      setScheduleData({ 
        frequency: 'weekly',
        time: getCurrentTime() // Set current time as default
      });
    } else if (template.periodType === 'one-time') {
      setScheduleData({
        date: getCurrentDate(), // Set current date as default
        time: getCurrentTime()  // Set current time as default
      });
    } else {
      setScheduleData({});
    }
    setSpecificDates([]);
  };

  const handlePeriodTypeChange = (newPeriodType: 'one-time' | 'recurring' | 'specific-dates') => {
    setSelectedPeriodType(newPeriodType);
    // Reset schedule data when changing period type, but set defaults with current time
    if (newPeriodType === 'recurring') {
      setScheduleData({ 
        frequency: 'weekly',
        time: getCurrentTime() // Set current time as default
      });
    } else if (newPeriodType === 'one-time') {
      setScheduleData({
        date: getCurrentDate(), // Set current date as default
        time: getCurrentTime()  // Set current time as default
      });
    } else {
      setScheduleData({});
    }
    setSpecificDates([]);
    // Also set defaults for specific dates form
    if (newPeriodType === 'specific-dates') {
      setNewDate(getCurrentDate());
      setNewTime(getCurrentTime());
    } else {
      setNewDate('');
      setNewTime('');
    }
  };

  const handleScheduleChange = (field: string, value: any) => {
    setScheduleData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addSpecificDate = () => {
    if (!newDate || !newTime) return;
    
    const dateTime = `${newDate}T${newTime}`;
    setSpecificDates(prev => [...prev, dateTime].sort());
    // Reset to current date/time for next entry
    setNewDate(getCurrentDate());
    setNewTime(getCurrentTime());
  };

  const removeSpecificDate = (index: number) => {
    setSpecificDates(prev => prev.filter((_, i) => i !== index));
  };

  const handleFieldChange = (fieldKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  // Clear error when dialog opens
  useEffect(() => {
    if (open) {
      clearError();
      setCreationSuccess(false);
    }
  }, [open, clearError]);

  const { createWorkflowInN8n } = useWorkflowStore();

  const handleCreateWorkflow = async () => {
    if (!selectedTemplate || !formData.workspace) {
      toast.error("Please select a class first");
      return;
    }

    setIsCreating(true);
    clearError();

    try {
      const completeScheduleData = {
        selectedPeriodType,
        ...scheduleData,
        specificDates,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      console.log('🚀 [Workflow] Creating workflow with:', {
        templateId: selectedTemplate.id,
        formData,
        completeScheduleData
      });

      const result = await createWorkflowInN8n(
        selectedTemplate.id, 
        formData, 
        completeScheduleData
      );

      console.log('🎯 [Workflow] Creation result:', result);

      if (result.success) {
        setCreationSuccess(true);
        toast.success("Workflow created successfully!");
        
        if (onCreateWorkflow) {
          onCreateWorkflow(selectedTemplate, { ...formData, ...completeScheduleData });
        }

        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        toast.error(result.error || 'Failed to create workflow');
        console.error('❌ [Workflow] Creation failed:', result.error);
      }
    } catch (err) {
      console.error('💥 [Workflow] Error creating workflow:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedTemplate(null);
    setFormData({});
    setScheduleData({});
    setSpecificDates([]);
    setNewDate('');
    setNewTime('');
    setIsCreating(false);
    setCreationSuccess(false);
    clearError();
  };

  // Function to generate preview dates based on schedule configuration
  const generatePreviewDates = () => {
    const today = new Date();
    const previewDates: Date[] = [];
    
    if (selectedPeriodType === 'one-time') {
      if (scheduleData.date && scheduleData.time) {
        const [hours, minutes] = scheduleData.time.split(':');
        
        // ✅ FIX: Parse date string as local timezone to avoid UTC conversion
        const [year, month, day] = scheduleData.date.split('-').map(Number);
        const date = new Date(year, month - 1, day); // month is 0-indexed
        date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Check if this is today and time has already passed
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        
        if (isToday) {
          const currentTime = today.getHours() * 60 + today.getMinutes();
          const scheduleTime = parseInt(hours) * 60 + parseInt(minutes);
          
          // Only add if time hasn't passed, or if it's in the future
          if (scheduleTime > currentTime) {
            previewDates.push(date);
          }
        } else if (date > today) {
          // Future date
          previewDates.push(date);
        }
      }
    } else if (selectedPeriodType === 'recurring') {
      if (scheduleData.frequency && scheduleData.time) {
        const [hours, minutes] = scheduleData.time.split(':');
        
        if (scheduleData.frequency === 'daily') {
          // Show next 10 days
          for (let i = 0; i < 10; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            previewDates.push(date);
          }
        } else if (scheduleData.frequency === 'weekly') {
          // Only generate dates if days are selected
          if (scheduleData.days?.length > 0) {
            const selectedDays = scheduleData.days;
            const dayMap: Record<string, number> = {
              'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
              'Thursday': 4, 'Friday': 5, 'Saturday': 6
            };
            
            let addedDates = 0;
            for (let week = 0; week < 8 && addedDates < 10; week++) {
              selectedDays.forEach((day: string) => {
                if (addedDates >= 10) return;
                const dayIndex = dayMap[day];
                const date = new Date(today);
                const currentDay = today.getDay();
                let daysUntilTarget = (dayIndex - currentDay + 7) % 7;
                
                // If it's the first week and the day has already passed today, skip to next week
                if (week === 0 && daysUntilTarget === 0) {
                  const currentTime = today.getHours() * 60 + today.getMinutes();
                  const scheduleTime = parseInt(hours) * 60 + parseInt(minutes);
                  if (scheduleTime < currentTime) { // Changed from <= to <
                    daysUntilTarget = 7;
                  }
                }
                
                date.setDate(today.getDate() + daysUntilTarget + (week * 7));
                date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                previewDates.push(date);
                addedDates++;
              });
            }
          }
        } else if (scheduleData.frequency === 'monthly') {
          // Show next 10 months
          for (let i = 0; i < 10; i++) {
            const date = new Date(today);
            date.setMonth(today.getMonth() + i);
            // Keep the same day of month, but handle edge cases
            if (date.getMonth() !== (today.getMonth() + i) % 12) {
              // Handle cases where the day doesn't exist in the target month (e.g., Jan 31 -> Feb 31)
              date.setDate(0); // Go to last day of previous month
            }
            date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            previewDates.push(date);
          }
        }
      }
    } else if (selectedPeriodType === 'specific-dates') {
      // Convert specific dates to Date objects
      specificDates.forEach(dateTimeString => {
        const date = new Date(dateTimeString);
        if (!isNaN(date.getTime()) && date >= today) {
          previewDates.push(date);
        }
      });
    }
    
    return previewDates.sort((a, b) => a.getTime() - b.getTime()).slice(0, 10); // Limit to 10 dates
  };

  const formatPreviewDate = (date: Date) => {
    return date.toLocaleString(intl.locale, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSpecificDate = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleString(intl.locale, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Translate day names
  const getDayTranslation = (day: string) => {
    const dayTranslations: Record<string, string> = {
      'Monday': intl.formatMessage({ id: 'day.monday', defaultMessage: 'Monday' }),
      'Tuesday': intl.formatMessage({ id: 'day.tuesday', defaultMessage: 'Tuesday' }),
      'Wednesday': intl.formatMessage({ id: 'day.wednesday', defaultMessage: 'Wednesday' }),
      'Thursday': intl.formatMessage({ id: 'day.thursday', defaultMessage: 'Thursday' }),
      'Friday': intl.formatMessage({ id: 'day.friday', defaultMessage: 'Friday' }),
      'Saturday': intl.formatMessage({ id: 'day.saturday', defaultMessage: 'Saturday' }),
      'Sunday': intl.formatMessage({ id: 'day.sunday', defaultMessage: 'Sunday' })
    };
    return dayTranslations[day] || day;
  };

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    
    // Create date-only versions in local timezone
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Calculate difference in days
    const diffMs = targetDateOnly.getTime() - nowDateOnly.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return intl.formatMessage({ id: 'workflow.preview.overdue', defaultMessage: 'Overdue' });
    } else if (diffDays === 0) {
      return intl.formatMessage({ id: 'workflow.preview.today', defaultMessage: 'Today' });
    } else if (diffDays === 1) {
      return intl.formatMessage({ id: 'workflow.preview.tomorrow', defaultMessage: 'Tomorrow' });
    } else {
      return intl.formatMessage({ 
        id: 'workflow.preview.inDays', 
        defaultMessage: 'In {days} days' 
      }, { days: diffDays });
    }
  };

  const getDisplayLabel = (periodType: string) => {
    if (selectedTemplate) {
      // If we're configuring a new workflow, show preview
      const previewDates = generatePreviewDates();
      if (previewDates.length > 0) {
        return getDaysUntil(previewDates[0]);
      }
    }
    
    return getPeriodTypeLabel(periodType);
  };

  // Get the merged header and actions component
  const { renderHeader, renderActions } = WorkflowDialogHeader({
    selectedTemplate,
    isLoading,
    isCreating,
    error,
    n8nError,
    creationSuccess,
    apiUrl,
    apiKey,
    connected,
    hasValidSchedule: generatePreviewDates().length > 0,
    onClearError: clearError,
    onClose: handleClose,
    onCreateWorkflow: handleCreateWorkflow
  });

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { minHeight: '70vh' } }}
    >
      <DialogTitle>
        {renderHeader()}
      </DialogTitle>
      
      <DialogContent>
        {!selectedTemplate ? (
          <WorkflowTemplateGrid
            templates={WORKFLOW_TEMPLATES}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            onTemplateSelect={handleTemplateSelect}
            getPeriodTypeLabel={getDisplayLabel}
            getCategoryLabel={getCategoryLabel}
          />
        ) : (
          <>
            <WorkflowFormFields
              selectedTemplate={selectedTemplate}
              formData={formData}
              onFieldChange={handleFieldChange}
              onBack={() => setSelectedTemplate(null)}
            />

            <ScheduleConfiguration
              selectedPeriodType={selectedPeriodType}
              scheduleData={scheduleData}
              specificDates={specificDates}
              newDate={newDate}
              newTime={newTime}
              onPeriodTypeChange={handlePeriodTypeChange}
              onScheduleChange={handleScheduleChange}
              onNewDateChange={setNewDate}
              onNewTimeChange={setNewTime}
              onAddSpecificDate={addSpecificDate}
              onRemoveSpecificDate={removeSpecificDate}
              getCurrentTime={getCurrentTime}
              getCurrentDate={getCurrentDate}
              getDayTranslation={getDayTranslation}
            />

            <ScheduleDatesPreview
              selectedPeriodType={selectedPeriodType}
              scheduleData={scheduleData}
              specificDates={specificDates}
              generatePreviewDates={generatePreviewDates}
              formatPreviewDate={formatPreviewDate}
              formatSpecificDate={formatSpecificDate}
              onRemoveSpecificDate={removeSpecificDate}
            />
          </>
        )}
      </DialogContent>

      <DialogActions>
        {renderActions()}
      </DialogActions>
    </Dialog>
  );
}

export default WorkflowDialog;
