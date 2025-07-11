import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  AccessTime,
  Repeat,
  DateRange,
  Add,
  Delete,
  Edit,
  Save,
  Schedule,
  Close
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { useN8nConfig } from '@/renderer/stores/Workflow/WorkflowActions';
import { useWorkflowStore } from '@/renderer/stores/Workflow/WorkflowStore';
import { workflowRegistry } from './Registry/WorkflowRegistry';

interface ScheduledItem {
  id: string;
  title: string;
  description?: string;
  type: 'workflow' | 'manual';
  active: boolean;
  category: 'classes' | 'student' | 'assessments' | 'meetings' | 'research' | 'admin';
  periodType: 'one-time' | 'recurring' | 'specific-dates';
  schedule?: {
    frequency?: 'daily' | 'weekly' | 'monthly';
    days?: string[];
    time?: string;
    duration?: number;
    dates?: string[];
    date?: string; // For one-time events
  };
  nextExecution?: Date;
  lastExecution?: Date;
  metadata?: Record<string, any>;
  n8nWorkflowId?: string;
  workflowType?: string; // Template ID
}

interface WorkflowEditProps {
  open: boolean;
  item: ScheduledItem | null;
  onClose: () => void;
  onSave: (updatedItem: ScheduledItem) => void;
  onDelete?: (item: ScheduledItem) => void;
}

export function WorkflowEdit({ open, item, onClose, onSave, onDelete }: WorkflowEditProps) {
  const intl = useIntl();
  const { apiUrl, apiKey, connected } = useN8nConfig();
  const { toggleWorkflowInN8n, deleteWorkflowFromN8n } = useWorkflowStore();
  
  const [editedItem, setEditedItem] = useState<ScheduledItem | null>(null);
  const [n8nWorkflowData, setN8nWorkflowData] = useState<any>(null);
  const [loadingN8nData, setLoadingN8nData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Form data for new schedules
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  // Get workflow template
  const workflowTemplate = editedItem?.workflowType ? 
    workflowRegistry.getAllAsTemplates().find(t => t.id === editedItem.workflowType) : null;

  // Helper functions from Workflow.tsx
  const getCurrentTime = () => {
    const now = new Date();
    const nextHour = now.getHours() + 1;
    const hour = nextHour >= 24 ? 0 : nextHour;
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
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

  // Generate preview dates (copied from Workflow.tsx)
  const generatePreviewDates = () => {
    if (!editedItem?.schedule) return [];
    
    const today = new Date();
    const previewDates: Date[] = [];
    
    if (editedItem.periodType === 'one-time') {
      if (editedItem.schedule.date && editedItem.schedule.time) {
        const [hours, minutes] = editedItem.schedule.time.split(':');
        const date = new Date(editedItem.schedule.date);
        date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        previewDates.push(date);
      }
    } else if (editedItem.periodType === 'recurring') {
      if (editedItem.schedule.frequency && editedItem.schedule.time) {
        const [hours, minutes] = editedItem.schedule.time.split(':');
        
        if (editedItem.schedule.frequency === 'daily') {
          for (let i = 0; i < 5; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            previewDates.push(date);
          }
        } else if (editedItem.schedule.frequency === 'weekly' && editedItem.schedule.days && editedItem.schedule.days.length > 0) {
          const dayMap: Record<string, number> = {
            'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
            'Thursday': 4, 'Friday': 5, 'Saturday': 6
          };
          
          let addedDates = 0;
          for (let week = 0; week < 4 && addedDates < 5; week++) {
            editedItem.schedule.days.forEach((day: string) => {
              if (addedDates >= 5) return;
              const dayIndex = dayMap[day];
              const date = new Date(today);
              const currentDay = today.getDay();
              let daysUntilTarget = (dayIndex - currentDay + 7) % 7;
              
              if (week === 0 && daysUntilTarget === 0) {
                const currentTime = today.getHours() * 60 + today.getMinutes();
                const scheduleTime = parseInt(hours) * 60 + parseInt(minutes);
                if (scheduleTime <= currentTime) {
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
      }
    } else if (editedItem.periodType === 'specific-dates') {
      editedItem.schedule.dates?.forEach(dateTimeString => {
        const date = new Date(dateTimeString);
        if (!isNaN(date.getTime())) {
          previewDates.push(date);
        }
      });
    }
    
    return previewDates.sort((a, b) => a.getTime() - b.getTime()).slice(0, 5);
  };

  // Load N8n workflow data
  useEffect(() => {
    const loadN8nWorkflowData = async () => {
      if (item?.n8nWorkflowId && apiUrl && apiKey && connected) {
        setLoadingN8nData(true);
        try {
          const result = await window.electron.n8nApi.getWorkflow({
            apiUrl: apiUrl,
            apiKey: apiKey,
            workflowId: item.n8nWorkflowId
          });
          
          if (result.success && result.workflow) {
            setN8nWorkflowData(result.workflow);
            
            // Parse N8n workflow data and update editedItem
            const parsedSchedule = parseN8nWorkflowSchedule(result.workflow);
            if (parsedSchedule) {
              setEditedItem(prev => prev ? {
                ...prev,
                ...parsedSchedule
              } : null);
            }
          }
        } catch (error) {
          console.error('Failed to load N8n workflow:', error);
        } finally {
          setLoadingN8nData(false);
        }
      }
    };
    
    if (item) {
      setEditedItem({ ...item });
      loadN8nWorkflowData();
    }
  }, [item, apiUrl, apiKey, connected]);

  // Parse N8n workflow schedule
  const parseN8nWorkflowSchedule = (workflow: any) => {
    if (!workflow.nodes) return null;
    
    const triggerNode = workflow.nodes.find((node: any) => 
      node.type === 'n8n-nodes-base.scheduleTrigger'
    );
    
    if (!triggerNode?.parameters?.triggerRules) return null;
    
    const rule = triggerNode.parameters.triggerRules[0];
    if (!rule) return null;
    
    const parsedData: Partial<ScheduledItem> = {
      active: workflow.active || false
    };
    
    if (rule.interval === 'cronExpression') {
      parsedData.periodType = 'one-time';
      parsedData.schedule = {
        date: getCurrentDate(), // Could parse from cron
        time: getCurrentTime(),
        duration: 60
      };
    } else if (rule.interval === 'days') {
      parsedData.periodType = 'recurring';
      parsedData.schedule = {
        frequency: 'daily',
        time: `${rule.triggerAtHour?.toString().padStart(2, '0') || '00'}:${rule.triggerAtMinute?.toString().padStart(2, '0') || '00'}`,
        duration: 60
      };
    } else if (rule.interval === 'weeks') {
      parsedData.periodType = 'recurring';
      const days = rule.triggerOnWeekdays?.map((day: string) => 
        day.charAt(0).toUpperCase() + day.slice(1)
      ) || [];
      
      parsedData.schedule = {
        frequency: 'weekly',
        days: days,
        time: `${rule.triggerAtHour?.toString().padStart(2, '0') || '00'}:${rule.triggerAtMinute?.toString().padStart(2, '0') || '00'}`,
        duration: 60
      };
    }
    
    return parsedData;
  };

  const handleSave = async () => {
    if (!editedItem) return;
    
    setSaving(true);
    
    // If this item has an N8n workflow, update it
    if (editedItem.n8nWorkflowId && editedItem.workflowType) {
      try {
        // Toggle workflow active state in N8n
        await toggleWorkflowInN8n(editedItem.workflowType, editedItem.active);
      } catch (error) {
        console.error('Failed to update N8n workflow:', error);
      }
    }
    
    onSave(editedItem);
    setSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!editedItem || !onDelete) return;
    
    console.log('[WorkflowEdit] Delete initiated for item:', editedItem);
    setDeleting(true);
    
    try {
      if (editedItem.n8nWorkflowId && apiUrl && apiKey && connected) {
        console.log('[WorkflowEdit] Deleting N8n workflow:', {
          workflowId: editedItem.n8nWorkflowId,
          workflowType: editedItem.workflowType,
          apiUrl: apiUrl,
          connected: connected
        });
        
        let result: { success: boolean; error?: string } = { success: false };
        
        // Try using the workflow store first (better logging and state management)
        if (editedItem.workflowType) {
          console.log('[WorkflowEdit] Using WorkflowStore.deleteWorkflowFromN8n');
          result = await deleteWorkflowFromN8n(editedItem.workflowType);
        } else {
          console.log('[WorkflowEdit] Falling back to direct N8n API call');
          result = await window.electron.n8nApi.deleteWorkflow({
            apiUrl: apiUrl,
            apiKey: apiKey,
            workflowId: editedItem.n8nWorkflowId
          });
        }
        
        console.log('[WorkflowEdit] Delete result:', result);
        
        if (!result.success) {
          console.error('[WorkflowEdit] Failed to delete N8n workflow:', result.error);
          alert(`Failed to delete workflow from N8n: ${result.error}`);
          // Don't return here - still call onDelete to remove from local state
        } else {
          console.log('[WorkflowEdit] Successfully deleted workflow from N8n');
        }
      } else {
        console.log('[WorkflowEdit] No N8n workflow to delete or N8n not connected');
      }
      
      // Always call onDelete to remove from local state
      console.log('[WorkflowEdit] Removing from local state');
      onDelete(editedItem);
      
    } catch (error) {
      console.error('[WorkflowEdit] Error during delete operation:', error);
      alert(`Error deleting workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeleting(false);
      onClose();
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    if (!editedItem) return;
    
    setEditedItem(prev => ({
      ...prev!,
      [field]: value
    }));
  };

  const handleScheduleChange = (field: string, value: any) => {
    if (!editedItem) return;
    
    setEditedItem(prev => ({
      ...prev!,
      schedule: {
        ...prev!.schedule,
        [field]: value
      }
    }));
  };

  const handlePeriodTypeChange = (newPeriodType: 'one-time' | 'recurring' | 'specific-dates') => {
    if (!editedItem) return;
    
    let newSchedule: any = {};
    
    switch (newPeriodType) {
      case 'one-time':
        newSchedule = {
          date: getCurrentDate(),
          time: getCurrentTime(),
          duration: 60
        };
        break;
      case 'recurring':
        newSchedule = {
          frequency: 'weekly',
          days: ['Monday'],
          time: getCurrentTime(),
          duration: 60
        };
        break;
      case 'specific-dates':
        newSchedule = {
          dates: [],
          duration: 60
        };
        break;
    }
    
    setEditedItem(prev => ({
      ...prev!,
      periodType: newPeriodType,
      schedule: newSchedule
    }));
  };

  const addSpecificDate = () => {
    if (!newDate || !editedItem) return;
    
    const dateTime = newTime ? `${newDate}T${newTime}` : `${newDate}T${getCurrentTime()}`;
    
    setEditedItem(prev => ({
      ...prev!,
      schedule: {
        ...prev!.schedule,
        dates: [...(prev!.schedule?.dates || []), dateTime]
      }
    }));
    
    setNewDate('');
    setNewTime('');
  };

  const removeSpecificDate = (index: number) => {
    if (!editedItem) return;
    
    setEditedItem(prev => ({
      ...prev!,
      schedule: {
        ...prev!.schedule,
        dates: prev!.schedule?.dates?.filter((_, i) => i !== index) || []
      }
    }));
  };

  const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const formatDateTime = (dateTime: string) => {
    const dt = new Date(dateTime);
    return dt.toLocaleString(intl.locale, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

  if (!editedItem) return null;

  const previewDates = generatePreviewDates();
  const nextExecution = previewDates.length > 0 ? previewDates[0] : null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { minHeight: '70vh' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Edit />
            <Typography variant="h6">Edit Workflow</Typography>
            {nextExecution && (
              <Chip 
                label={getDaysUntil(nextExecution)}
                color="primary"
                size="small"
                icon={<Schedule />}
              />
            )}
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Loading indicator */}
          {loadingN8nData && (
            <Alert severity="info" icon={<CircularProgress size={20} />}>
              Loading workflow details from N8n...
            </Alert>
          )}

          {/* N8n sync status */}
          {editedItem.n8nWorkflowId && (
            <Alert 
              severity={n8nWorkflowData ? "success" : "warning"}
            >
              {n8nWorkflowData 
                ? `Synced with N8n workflow (${editedItem.n8nWorkflowId})`
                : `N8n workflow ID: ${editedItem.n8nWorkflowId} (sync pending)`
              }
              {workflowTemplate && (
                <Typography variant="caption" display="block">
                  Template: {workflowTemplate.name}
                </Typography>
              )}
            </Alert>
          )}

          {/* Basic Information */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: 200 }}>
              <TextField
                fullWidth
                label="Title"
                value={editedItem.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                size="small"
              />
            </Box>
            <Box sx={{ flex: '0 1 auto' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editedItem.active}
                    onChange={(e) => handleFieldChange('active', e.target.checked)}
                  />
                }
                label="Active"
              />
            </Box>
          </Box>

          <TextField
            fullWidth
            label="Description"
            value={editedItem.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            multiline
            rows={2}
            size="small"
          />

          {/* Schedule Type Selection */}
          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
              Schedule Type
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {[
                { type: 'one-time', label: 'One Time', icon: <AccessTime /> },
                { type: 'recurring', label: 'Recurring', icon: <Repeat /> },
                { type: 'specific-dates', label: 'Specific Dates', icon: <DateRange /> }
              ].map(({ type, label, icon }) => (
                <Chip
                  key={type}
                  label={label}
                  icon={icon}
                  onClick={() => handlePeriodTypeChange(type as any)}
                  color={editedItem.periodType === type ? 'primary' : 'default'}
                  variant={editedItem.periodType === type ? 'filled' : 'outlined'}
                  clickable
                />
              ))}
            </Box>
          </Box>

          {/* Schedule Configuration - same as Workflow.tsx */}
          {editedItem.periodType === 'one-time' && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Date"
                type="date"
                value={editedItem.schedule?.date || ''}
                onChange={(e) => handleScheduleChange('date', e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ flex: '1 1 200px' }}
              />
              <TextField
                label="Time"
                type="time"
                value={editedItem.schedule?.time || ''}
                onChange={(e) => handleScheduleChange('time', e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ flex: '1 1 150px' }}
              />
            </Box>
          )}

          {editedItem.periodType === 'recurring' && (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <FormControl size="small" sx={{ flex: '1 1 150px' }}>
                  <InputLabel>Frequency</InputLabel>
                  <Select
                    value={editedItem.schedule?.frequency || 'weekly'}
                    onChange={(e) => handleScheduleChange('frequency', e.target.value)}
                    label="Frequency"
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Time"
                  type="time"
                  value={editedItem.schedule?.time || ''}
                  onChange={(e) => handleScheduleChange('time', e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: '1 1 150px' }}
                />
              </Box>
              
              {editedItem.schedule?.frequency === 'weekly' && (
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                    Select Days
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {dayOptions.map(day => (
                      <Chip
                        key={day}
                        label={getDayTranslation(day)}
                        onClick={() => {
                          const currentDays = editedItem.schedule?.days || [];
                          const newDays = currentDays.includes(day)
                            ? currentDays.filter(d => d !== day)
                            : [...currentDays, day];
                          handleScheduleChange('days', newDays);
                        }}
                        color={editedItem.schedule?.days?.includes(day) ? 'primary' : 'default'}
                        variant={editedItem.schedule?.days?.includes(day) ? 'filled' : 'outlined'}
                        clickable
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {editedItem.periodType === 'specific-dates' && (
            <Box>
              <Typography variant="body2" sx={{ mb: 2, fontWeight: 'medium' }}>
                Add Specific Dates
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <TextField
                  label="Date"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: '1 1 200px' }}
                />
                <TextField
                  label="Time"
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: '1 1 150px' }}
                />
                <Button
                  variant="outlined"
                  onClick={addSpecificDate}
                  disabled={!newDate}
                  startIcon={<Add />}
                  sx={{ flex: '0 1 auto' }}
                >
                  Add
                </Button>
              </Box>

              {/* List of Specific Dates */}
              {editedItem.schedule?.dates && editedItem.schedule.dates.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                    Scheduled Dates ({editedItem.schedule.dates.length})
                  </Typography>
                  <List dense>
                    {editedItem.schedule.dates.map((dateTime, index) => (
                      <ListItem 
                        key={index}
                        sx={{ px: 1 }}
                        secondaryAction={
                          <IconButton 
                            edge="end" 
                            size="small"
                            onClick={() => removeSpecificDate(index)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        }
                      >
                        <ListItemText
                          primary={formatDateTime(dateTime)}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>
          )}

          {/* Preview Dates */}
          {previewDates.length > 0 && (
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                Next Executions ({previewDates.length})
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <List dense>
                  {previewDates.map((date, index) => (
                    <ListItem key={index} sx={{ px: 1 }}>
                      <ListItemText
                        primary={formatDateTime(date.toISOString())}
                        secondary={getDaysUntil(date)}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        {onDelete && (
          <Button 
            onClick={handleDelete}
            color="error"
            disabled={deleting || saving}
            startIcon={deleting ? <CircularProgress size={16} /> : <Delete />}
          >
            Delete
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={saving || deleting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          variant="contained"
          disabled={saving || deleting}
          startIcon={saving ? <CircularProgress size={16} /> : <Save />}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default WorkflowEdit;
