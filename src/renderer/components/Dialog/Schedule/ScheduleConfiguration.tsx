import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Button,
  Divider
} from '@mui/material';
import {
  Schedule,
  AccessTime,
  Repeat,
  DateRange,
  Add
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { ScheduleConfigurationProps } from './types';

export function ScheduleConfiguration({
  selectedPeriodType,
  scheduleData,
  newDate,
  newTime,
  onPeriodTypeChange,
  onScheduleChange,
  onNewDateChange,
  onNewTimeChange,
  onAddSpecificDate,
  getCurrentTime,
  getCurrentDate,
  getDayTranslation
}: ScheduleConfigurationProps) {
  const intl = useIntl();

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Schedule sx={{ fontSize: '1.2rem' }} />
        {intl.formatMessage({ id: 'workflow.dialog.scheduleConfig', defaultMessage: 'Schedule Configuration' })}
      </Typography>
      <Divider sx={{ mb: 3 }} />
      
      {/* Schedule Type Selection */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          {intl.formatMessage({ id: 'workflow.dialog.scheduleType', defaultMessage: 'Schedule Type' })}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {[
            { type: 'one-time', label: intl.formatMessage({ id: 'workflow.periodType.oneTime', defaultMessage: 'One Time' }), icon: <AccessTime /> },
            { type: 'recurring', label: intl.formatMessage({ id: 'workflow.periodType.recurring', defaultMessage: 'Recurring' }), icon: <Repeat /> },
            { type: 'specific-dates', label: intl.formatMessage({ id: 'workflow.periodType.specificDates', defaultMessage: 'Specific Dates' }), icon: <DateRange /> }
          ].map(({ type, label, icon }) => (
            <Chip
              key={type}
              label={label}
              icon={icon}
              onClick={() => onPeriodTypeChange(type as any)}
              color={selectedPeriodType === type ? 'primary' : 'default'}
              variant={selectedPeriodType === type ? 'filled' : 'outlined'}
              clickable
            />
          ))}
        </Box>
      </Box>

      {/* Schedule Details */}
      <Box sx={{ bgcolor: 'action.hover', p: 3, borderRadius: 1 }}>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          {intl.formatMessage({ id: 'workflow.dialog.scheduleDetails', defaultMessage: 'Schedule Details' })}
        </Typography>
        
        {/* One-time Schedule */}
        {selectedPeriodType === 'one-time' && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={intl.formatMessage({ id: 'workflow.field.date', defaultMessage: 'Date' })}
                type="date"
                value={scheduleData.date || getCurrentDate()}
                onChange={(e) => onScheduleChange('date', e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={intl.formatMessage({ id: 'workflow.field.time', defaultMessage: 'Time' })}
                type="time"
                value={scheduleData.time || getCurrentTime()}
                onChange={(e) => onScheduleChange('time', e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        )}

        {/* Recurring Schedule */}
        {selectedPeriodType === 'recurring' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>{intl.formatMessage({ id: 'workflow.field.frequency', defaultMessage: 'Frequency' })}</InputLabel>
                  <Select
                    value={scheduleData.frequency || 'weekly'}
                    onChange={(e) => onScheduleChange('frequency', e.target.value)}
                    label={intl.formatMessage({ id: 'workflow.field.frequency', defaultMessage: 'Frequency' })}
                  >
                    <MenuItem value="daily">{intl.formatMessage({ id: 'workflow.frequency.daily', defaultMessage: 'Daily' })}</MenuItem>
                    <MenuItem value="weekly">{intl.formatMessage({ id: 'workflow.frequency.weekly', defaultMessage: 'Weekly' })}</MenuItem>
                    <MenuItem value="monthly">{intl.formatMessage({ id: 'workflow.frequency.monthly', defaultMessage: 'Monthly' })}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label={intl.formatMessage({ id: 'workflow.field.time', defaultMessage: 'Time' })}
                  type="time"
                  value={scheduleData.time || getCurrentTime()}
                  onChange={(e) => onScheduleChange('time', e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            
            {scheduleData.frequency !== 'daily' && (
              <Box>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {intl.formatMessage({ id: 'workflow.field.selectDays', defaultMessage: 'Select Days' })}
                </Typography>
                
                {/* Connected rectangle style for days */}
                <Box sx={{ 
                  display: 'flex', 
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden'
                }}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => {
                    const isSelected = scheduleData.days?.includes(day);
                    const isFirstDay = index === 0;
                    
                    return (
                      <Box
                        key={day}
                        onClick={() => {
                          const currentDays = scheduleData.days || [];
                          const newDays = currentDays.includes(day)
                            ? currentDays.filter((d: string) => d !== day)
                            : [...currentDays, day];
                          onScheduleChange('days', newDays);
                        }}
                        sx={{ 
                          flex: 1,
                          py: 1.5,
                          px: 1,
                          textAlign: 'center',
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'primary.main' : 'transparent',
                          color: isSelected ? 'primary.contrastText' : 'text.primary',
                          borderLeft: !isFirstDay ? '1px solid' : 'none',
                          borderColor: 'divider',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: isSelected ? 'primary.dark' : 'action.hover'
                          },
                          userSelect: 'none'
                        }}
                      >
                        <Typography variant="body2" sx={{ 
                          fontWeight: isSelected ? 'medium' : 'normal',
                          fontSize: '0.875rem'
                        }}>
                          {getDayTranslation(day)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* Specific Dates Schedule */}
        {selectedPeriodType === 'specific-dates' && (
          <Box>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {intl.formatMessage({ id: 'workflow.dialog.addSpecificDates', defaultMessage: 'Add Specific Dates' })}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 200px', minWidth: 150 }}>
                <TextField
                  fullWidth
                  label={intl.formatMessage({ id: 'workflow.field.date', defaultMessage: 'Date' })}
                  type="date"
                  value={newDate || getCurrentDate()}
                  onChange={(e) => onNewDateChange(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: 150 }}>
                <TextField
                  fullWidth
                  label={intl.formatMessage({ id: 'workflow.field.time', defaultMessage: 'Time' })}
                  type="time"
                  value={newTime || getCurrentTime()}
                  onChange={(e) => onNewTimeChange(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              <Box sx={{ flex: '0 1 auto' }}>
                <Button
                  variant="outlined"
                  onClick={onAddSpecificDate}
                  disabled={!newDate || !newTime}
                  startIcon={<Add />}
                  size="small"
                  sx={{ height: '40px' }}
                >
                  {intl.formatMessage({ id: 'workflow.dialog.add', defaultMessage: 'Add' })}
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
} 