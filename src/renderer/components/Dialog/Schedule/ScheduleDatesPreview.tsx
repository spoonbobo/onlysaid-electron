import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Divider,
  Button,
  Chip
} from '@mui/material';
import {
  DateRange,
  Schedule,
  Delete,
  Visibility
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { ScheduleDatesPreviewProps } from './types';
import { PreviewDatesDialog } from './PreviewDatesDialog';

export function ScheduleDatesPreview({
  selectedPeriodType,
  scheduleData,
  specificDates,
  generatePreviewDates,
  formatPreviewDate,
  formatSpecificDate,
  onRemoveSpecificDate
}: ScheduleDatesPreviewProps) {
  const intl = useIntl();
  const [showAllDatesDialog, setShowAllDatesDialog] = useState(false);

  const shouldShowPreview = 
    ((selectedPeriodType === 'one-time' && scheduleData.date && scheduleData.time) || 
     (selectedPeriodType === 'recurring' && scheduleData.time) ||
     (selectedPeriodType === 'specific-dates' && specificDates.length > 0));

  if (!shouldShowPreview) {
    return null;
  }

  // Helper function to calculate days until execution
  const getDaysUntil = (date: Date | string) => {
    // ✅ FIX: Handle timezone consistently for both string and Date inputs
    let targetDate: Date;
    
    if (typeof date === 'string') {
      // For string dates (like "2024-01-15" or "2024-01-15T10:30"), 
      // parse them as local timezone to avoid UTC conversion issues
      if (date.includes('T')) {
        // Has time component
        targetDate = new Date(date);
      } else {
        // Date only - parse as local date to avoid UTC midnight issue
        const [year, month, day] = date.split('-').map(Number);
        targetDate = new Date(year, month - 1, day); // month is 0-indexed
      }
    } else {
      targetDate = date;
    }
    
    const now = new Date();
    
    // Create date-only versions in local timezone
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    
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
        defaultMessage: '{days} days' 
      }, { days: diffDays });
    }
  };

  // Generate all dates function for the dialog
  const generateAllPreviewDates = () => {
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
        const isToday = date.toDateString() === today.toDateString();
        
        if (isToday) {
          const currentTime = today.getHours() * 60 + today.getMinutes();
          const scheduleTime = parseInt(hours) * 60 + parseInt(minutes);
          
          // Only add if time hasn't passed
          if (scheduleTime > currentTime) {
            previewDates.push(date);
          }
        } else if (date > today) {
          // Future date
          previewDates.push(date);
        }
        // If it's today but time has passed, don't add anything
      }
    } else if (selectedPeriodType === 'recurring') {
      if (scheduleData.frequency && scheduleData.time) {
        const [hours, minutes] = scheduleData.time.split(':');
        
        if (scheduleData.frequency === 'daily') {
          for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            previewDates.push(date);
          }
        } else if (scheduleData.frequency === 'weekly') {
          if (scheduleData.days?.length > 0) {
            const selectedDays = scheduleData.days;
            const dayMap: Record<string, number> = {
              'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
              'Thursday': 4, 'Friday': 5, 'Saturday': 6
            };
            
            let addedDates = 0;
            for (let week = 0; week < 12 && addedDates < 50; week++) {
              selectedDays.forEach((day: string) => {
                if (addedDates >= 50) return;
                const dayIndex = dayMap[day];
                const date = new Date(today);
                const currentDay = today.getDay();
                let daysUntilTarget = (dayIndex - currentDay + 7) % 7;
                
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
          for (let i = 0; i < 12; i++) {
            const date = new Date(today);
            date.setMonth(today.getMonth() + i);
            if (date.getMonth() !== (today.getMonth() + i) % 12) {
              date.setDate(0);
            }
            date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            previewDates.push(date);
          }
        }
      }
    }
    
    return previewDates.sort((a, b) => a.getTime() - b.getTime());
  };

  const previewDates = generatePreviewDates();
  const allDates = selectedPeriodType === 'specific-dates' ? specificDates : generateAllPreviewDates();
  const hasMoreDates = allDates.length > 10;

  return (
    <>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DateRange sx={{ fontSize: '1.2rem' }} />
            {intl.formatMessage({ id: 'workflow.dialog.scheduleDates', defaultMessage: 'Schedule Dates' })}
          </Typography>
          
          {hasMoreDates && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Visibility />}
              onClick={() => setShowAllDatesDialog(true)}
              sx={{ fontSize: '0.8rem' }}
            >
              {intl.formatMessage({ 
                id: 'workflow.dialog.viewAll', 
                defaultMessage: 'View All ({count})' 
              }, { count: allDates.length })}
            </Button>
          )}
        </Box>
        <Divider sx={{ mb: 3 }} />
        
        <Box sx={{ 
          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
          p: 3, 
          borderRadius: 2,
          border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[200]}`
        }}>
          <Typography variant="subtitle2" sx={{ 
            mb: 2, 
            color: (theme) => theme.palette.mode === 'dark' ? 'primary.light' : 'primary.dark',
            fontWeight: 'medium'
          }}>
            {selectedPeriodType === 'specific-dates' ? 
              intl.formatMessage({ id: 'workflow.dialog.scheduledDates', defaultMessage: 'Scheduled Dates ({count})' }, { count: specificDates.length }) :
              intl.formatMessage({ id: 'workflow.dialog.upcomingTriggers', defaultMessage: 'Upcoming Triggers' })
            }
          </Typography>
          
          {selectedPeriodType === 'specific-dates' ? (
            specificDates.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {specificDates.slice(0, 10).map((dateTime, index) => (
                  <Box 
                    key={index}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      p: 2,
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'background.paper',
                      borderRadius: 1,
                      border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? theme.palette.grey[600] : theme.palette.grey[300]}`,
                      '&:hover': {
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.750' : 'action.hover'
                      }
                    }}
                  >
                    <Schedule sx={{ 
                      color: (theme) => theme.palette.mode === 'dark' ? 'primary.light' : 'primary.main',
                      fontSize: '1.2rem' 
                    }} />
                    <Typography variant="body2" sx={{ 
                      color: (theme) => theme.palette.mode === 'dark' ? 'grey.100' : 'text.primary',
                      fontWeight: 'medium',
                      flex: 1
                    }}>
                      {formatSpecificDate(dateTime)}
                    </Typography>
                    <Chip 
                      label={getDaysUntil(new Date(dateTime))}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        color: 'text.secondary',
                        borderColor: 'divider',
                        fontSize: '0.7rem'
                      }}
                    />
                    <IconButton 
                      size="small"
                      onClick={() => onRemoveSpecificDate(index)}
                      color="error"
                      sx={{ ml: 1 }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                
                {hasMoreDates && (
                  <Box sx={{ 
                    textAlign: 'center', 
                    mt: 2,
                    p: 2,
                    border: (theme) => `1px dashed ${theme.palette.mode === 'dark' ? theme.palette.grey[600] : theme.palette.grey[400]}`,
                    borderRadius: 1
                  }}>
                    <Typography variant="body2" sx={{
                      color: (theme) => theme.palette.mode === 'dark' ? 'grey.400' : 'text.secondary',
                      mb: 1
                    }}>
                      {intl.formatMessage({ 
                        id: 'workflow.dialog.showingFirst10', 
                        defaultMessage: 'Showing first 10 of {total} dates' 
                      }, { total: specificDates.length })}
                    </Typography>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<Visibility />}
                      onClick={() => setShowAllDatesDialog(true)}
                    >
                      {intl.formatMessage({ 
                        id: 'workflow.dialog.viewAllDates', 
                        defaultMessage: 'View All Dates' 
                      })}
                    </Button>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ 
                textAlign: 'center', 
                py: 3,
                border: (theme) => `2px dashed ${theme.palette.mode === 'dark' ? theme.palette.grey[600] : theme.palette.grey[400]}`,
                borderRadius: 1
              }}>
                <Schedule sx={{ 
                  fontSize: '2rem', 
                  color: (theme) => theme.palette.mode === 'dark' ? 'grey.500' : 'grey.400',
                  mb: 1
                }} />
                <Typography variant="body2" sx={{
                  color: (theme) => theme.palette.mode === 'dark' ? 'grey.400' : 'text.secondary'
                }}>
                  {intl.formatMessage({ id: 'workflow.dialog.addDatesToSeePreview', defaultMessage: 'Add dates above to see them here' })}
                </Typography>
              </Box>
            )
          ) : (
            previewDates.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {previewDates.map((date, index) => (
                  <Box 
                    key={index}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      p: 2,
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'background.paper',
                      borderRadius: 1,
                      border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? theme.palette.grey[600] : theme.palette.grey[300]}`,
                      '&:hover': {
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.750' : 'action.hover'
                      }
                    }}
                  >
                    <Schedule sx={{ 
                      color: (theme) => theme.palette.mode === 'dark' ? 'primary.light' : 'primary.main',
                      fontSize: '1.2rem' 
                    }} />
                    <Typography variant="body2" sx={{ 
                      color: (theme) => theme.palette.mode === 'dark' ? 'grey.100' : 'text.primary',
                      fontWeight: 'medium',
                      flex: 1
                    }}>
                      {formatPreviewDate(date)}
                    </Typography>
                    <Chip 
                      label={getDaysUntil(date)}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        color: 'text.secondary',
                        borderColor: 'divider',
                        fontSize: '0.7rem'
                      }}
                    />
                  </Box>
                ))}
                
                {hasMoreDates && (
                  <Box sx={{ 
                    textAlign: 'center', 
                    mt: 2,
                    p: 2,
                    border: (theme) => `1px dashed ${theme.palette.mode === 'dark' ? theme.palette.grey[600] : theme.palette.grey[400]}`,
                    borderRadius: 1
                  }}>
                    <Typography variant="body2" sx={{
                      color: (theme) => theme.palette.mode === 'dark' ? 'grey.400' : 'text.secondary',
                      mb: 1
                    }}>
                      {intl.formatMessage({ 
                        id: 'workflow.dialog.showingFirst10Triggers', 
                        defaultMessage: 'Showing first 10 of {total} upcoming triggers' 
                      }, { total: allDates.length })}
                    </Typography>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<Visibility />}
                      onClick={() => setShowAllDatesDialog(true)}
                    >
                      {intl.formatMessage({ 
                        id: 'workflow.dialog.viewAllTriggers', 
                        defaultMessage: 'View All Triggers' 
                      })}
                    </Button>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ 
                textAlign: 'center', 
                py: 3,
                border: (theme) => `2px dashed ${theme.palette.mode === 'dark' ? theme.palette.grey[600] : theme.palette.grey[400]}`,
                borderRadius: 1
              }}>
                <Schedule sx={{ 
                  fontSize: '2rem', 
                  color: (theme) => theme.palette.mode === 'dark' ? 'grey.500' : 'grey.400',
                  mb: 1
                }} />
                <Typography variant="body2" sx={{
                  color: (theme) => theme.palette.mode === 'dark' ? 'grey.400' : 'text.secondary'
                }}>
                  {selectedPeriodType === 'recurring' && scheduleData.frequency === 'weekly' && (!scheduleData.days || scheduleData.days.length === 0) ?
                    intl.formatMessage({ id: 'workflow.dialog.selectDaysToSeePreview', defaultMessage: 'Select days to see schedule preview' }) :
                    intl.formatMessage({ id: 'workflow.dialog.configureScheduleToSeeDates', defaultMessage: 'Configure schedule details to see trigger dates' })
                  }
                </Typography>
              </Box>
            )
          )}
        </Box>
      </Box>

      <PreviewDatesDialog
        open={showAllDatesDialog}
        onClose={() => setShowAllDatesDialog(false)}
        selectedPeriodType={selectedPeriodType}
        scheduleData={scheduleData}
        specificDates={specificDates}
        generateAllPreviewDates={generateAllPreviewDates}
        formatPreviewDate={formatPreviewDate}
        formatSpecificDate={formatSpecificDate}
        onRemoveSpecificDate={onRemoveSpecificDate}
      />
    </>
  );
} 