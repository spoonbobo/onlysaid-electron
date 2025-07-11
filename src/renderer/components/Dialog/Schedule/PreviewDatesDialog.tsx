import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Paper,
  Chip
} from '@mui/material';
import {
  DateRange,
  Schedule,
  Delete,
  Close
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { PreviewDatesDialogProps } from './types';

export function PreviewDatesDialog({
  open,
  onClose,
  selectedPeriodType,
  scheduleData,
  specificDates,
  generateAllPreviewDates,
  formatPreviewDate,
  formatSpecificDate,
  onRemoveSpecificDate
}: PreviewDatesDialogProps) {
  const intl = useIntl();

  const allDates = selectedPeriodType === 'specific-dates' ? specificDates : generateAllPreviewDates();
  const totalCount = allDates.length;

  // Helper function to calculate days until execution
  const getDaysUntil = (date: Date | string) => {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    
    // Compare calendar dates, not time differences
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    
    const diffMs = targetDateOnly.getTime() - nowDate.getTime();
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

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ 
        sx: { 
          minHeight: '60vh',
          maxHeight: '80vh'
        } 
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DateRange />
            <Typography variant="h6">
              {selectedPeriodType === 'specific-dates' ? 
                intl.formatMessage({ 
                  id: 'workflow.dialog.allScheduledDates', 
                  defaultMessage: 'All Scheduled Dates ({count})' 
                }, { count: totalCount }) :
                intl.formatMessage({ 
                  id: 'workflow.dialog.allUpcomingTriggers', 
                  defaultMessage: 'All Upcoming Triggers ({count})' 
                }, { count: totalCount })
              }
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {totalCount === 0 ? (
          <Box sx={{ 
            textAlign: 'center', 
            py: 4,
            border: (theme) => `2px dashed ${theme.palette.mode === 'dark' ? theme.palette.grey[600] : theme.palette.grey[400]}`,
            borderRadius: 1
          }}>
            <Schedule sx={{ 
              fontSize: '3rem', 
              color: (theme) => theme.palette.mode === 'dark' ? 'grey.500' : 'grey.400',
              mb: 2
            }} />
            <Typography variant="body1" sx={{
              color: (theme) => theme.palette.mode === 'dark' ? 'grey.400' : 'text.secondary'
            }}>
              {intl.formatMessage({ 
                id: 'workflow.dialog.noScheduledDates', 
                defaultMessage: 'No scheduled dates to display' 
              })}
            </Typography>
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ maxHeight: '50vh', overflow: 'auto' }}>
            <List sx={{ p: 0 }}>
              {selectedPeriodType === 'specific-dates' ? (
                /* Show specific dates with delete functionality */
                specificDates.map((dateTime, index) => (
                  <React.Fragment key={index}>
                    <ListItem sx={{ py: 2 }}>
                      <ListItemIcon>
                        <Schedule color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={formatSpecificDate(dateTime)}
                        primaryTypographyProps={{ 
                          fontWeight: 'medium',
                          color: 'text.primary'
                        }}
                      />
                      <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                          edge="end" 
                          aria-label="delete"
                          onClick={() => onRemoveSpecificDate(index)}
                          color="error"
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < specificDates.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              ) : (
                /* Show generated preview dates (read-only) */
                generateAllPreviewDates().map((date, index) => (
                  <React.Fragment key={index}>
                    <ListItem sx={{ py: 2 }}>
                      <ListItemIcon>
                        <Schedule color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={formatPreviewDate(date)}
                        primaryTypographyProps={{ 
                          fontWeight: 'medium',
                          color: 'text.primary'
                        }}
                      />
                      <ListItemSecondaryAction>
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
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < generateAllPreviewDates().length - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
            </List>
          </Paper>
        )}

        {/* Summary information */}
        {totalCount > 0 && (
          <Box sx={{ 
            mt: 3, 
            p: 2, 
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
            borderRadius: 1,
            border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[200]}`
          }}>
            <Typography variant="body2" color="text.secondary">
              {selectedPeriodType === 'specific-dates' ? 
                intl.formatMessage({ 
                  id: 'workflow.dialog.specificDatesSummary', 
                  defaultMessage: 'Total of {count} specific dates scheduled' 
                }, { count: totalCount }) :
                selectedPeriodType === 'recurring' ?
                  intl.formatMessage({ 
                    id: 'workflow.dialog.recurringDatesSummary', 
                    defaultMessage: 'Showing next {count} occurrences based on your recurring schedule' 
                  }, { count: totalCount }) :
                  intl.formatMessage({ 
                    id: 'workflow.dialog.oneTimeDateSummary', 
                    defaultMessage: 'One-time execution scheduled' 
                  })
              }
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          {intl.formatMessage({ id: 'workflow.dialog.close', defaultMessage: 'Close' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
