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
  Grid,
  Chip,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Paper
} from '@mui/material';
import {
  AccessTime,
  Repeat,
  DateRange,
  Add,
  Delete,
  Edit,
  Save,
  Schedule
} from '@mui/icons-material';
import { useIntl } from 'react-intl';

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
    dates?: string[]; // Changed to string array for easier handling
  };
  nextExecution?: Date;
  lastExecution?: Date;
  metadata?: Record<string, any>;
  n8nWorkflowId?: string;
}

interface WorkflowEditProps {
  open: boolean;
  item: ScheduledItem | null;
  onClose: () => void;
  onSave: (updatedItem: ScheduledItem) => void;
}

export function WorkflowEdit({ open, item, onClose, onSave }: WorkflowEditProps) {
  const intl = useIntl();
  const [editedItem, setEditedItem] = useState<ScheduledItem | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    if (item) {
      setEditedItem({ ...item });
    }
  }, [item]);

  const handleSave = () => {
    if (editedItem) {
      onSave(editedItem);
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
    
    // Reset schedule when changing period type
    let newSchedule: any = {};
    
    switch (newPeriodType) {
      case 'one-time':
        newSchedule = {
          time: editedItem.schedule?.time || '09:00',
          duration: editedItem.schedule?.duration || 60
        };
        break;
      case 'recurring':
        newSchedule = {
          frequency: 'weekly',
          days: ['Monday'],
          time: editedItem.schedule?.time || '09:00',
          duration: editedItem.schedule?.duration || 60
        };
        break;
      case 'specific-dates':
        newSchedule = {
          dates: [],
          time: editedItem.schedule?.time || '09:00',
          duration: editedItem.schedule?.duration || 60
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
    
    const dateTime = newTime ? `${newDate}T${newTime}` : newDate;
    
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
    return dt.toLocaleString();
  };

  if (!editedItem) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { minHeight: '60vh' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Edit />
          <Typography variant="h6">Edit Schedule</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: 200 }}>
              <TextField
                fullWidth
                label="Description"
                value={editedItem.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                multiline
                rows={2}
                size="small"
              />
            </Box>
          </Box>

          {/* Schedule Type */}
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
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

          {/* One-time Schedule */}
          {editedItem.periodType === 'one-time' && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: '1 1 300px', minWidth: 200 }}>
                <TextField
                  fullWidth
                  label="Time"
                  type="time"
                  value={editedItem.schedule?.time || ''}
                  onChange={(e) => handleScheduleChange('time', e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Box sx={{ flex: '1 1 300px', minWidth: 200 }}>
                <TextField
                  fullWidth
                  label="Duration (minutes)"
                  type="number"
                  value={editedItem.schedule?.duration || ''}
                  onChange={(e) => handleScheduleChange('duration', parseInt(e.target.value))}
                  size="small"
                />
              </Box>
            </Box>
          )}

          {/* Recurring Schedule */}
          {editedItem.periodType === 'recurring' && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: '1 1 300px', minWidth: 200 }}>
                <FormControl fullWidth size="small">
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
              </Box>
              <Box sx={{ flex: '1 1 300px', minWidth: 200 }}>
                <TextField
                  fullWidth
                  label="Time"
                  type="time"
                  value={editedItem.schedule?.time || ''}
                  onChange={(e) => handleScheduleChange('time', e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Box sx={{ flex: '1 1 300px', minWidth: 200 }}>
                <TextField
                  fullWidth
                  label="Duration (minutes)"
                  type="number"
                  value={editedItem.schedule?.duration || ''}
                  onChange={(e) => handleScheduleChange('duration', parseInt(e.target.value))}
                  size="small"
                />
              </Box>
              
              {editedItem.schedule?.frequency !== 'daily' && (
                <Box sx={{ flex: '1 1 300px', minWidth: 200 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Select Days
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {dayOptions.map(day => (
                      <Chip
                        key={day}
                        label={day}
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

          {/* Specific Dates Schedule */}
          {editedItem.periodType === 'specific-dates' && (
            <Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Add Specific Dates
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <Box sx={{ flex: '1 1 300px', minWidth: 200 }}>
                  <TextField
                    fullWidth
                    label="Date"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
                <Box sx={{ flex: '1 1 300px', minWidth: 200 }}>
                  <TextField
                    fullWidth
                    label="Time"
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
                <Box sx={{ flex: '1 1 300px', minWidth: 200 }}>
                  <TextField
                    fullWidth
                    label="Duration (minutes)"
                    type="number"
                    value={editedItem.schedule?.duration || ''}
                    onChange={(e) => handleScheduleChange('duration', parseInt(e.target.value))}
                    size="small"
                  />
                </Box>
                <Box sx={{ flex: '0 1 auto' }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={addSpecificDate}
                    disabled={!newDate}
                    startIcon={<Add />}
                  >
                    Add
                  </Button>
                </Box>
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
                        sx={{ 
                          px: 1,
                          borderRadius: 1,
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
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
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          variant="contained"
          startIcon={<Save />}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default WorkflowEdit;
