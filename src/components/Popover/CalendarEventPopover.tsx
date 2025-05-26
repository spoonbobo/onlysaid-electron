import React from 'react';
import {
  Popover,
  Box,
  Typography,
  Divider,
  IconButton,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  Close as CloseIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Description as DescriptionIcon,
  Event as EventIcon,
  Launch as LaunchIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import type { ICalendarEvent } from '@/../../types/Calendar/Calendar';
import { useGoogleCalendarStore } from '@/stores/Google/GoogleCalendarStore';

interface CalendarEventPopoverProps {
  event: ICalendarEvent | null;
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}

const CalendarEventPopover: React.FC<CalendarEventPopoverProps> = ({
  event,
  anchorEl,
  open,
  onClose,
}) => {
  const intl = useIntl();
  const { calendars } = useGoogleCalendarStore();

  if (!event) return null;

  const calendar = calendars.find(cal => cal.id === event.calendarId);
  const eventColor = calendar?.color || '#1976d2';

  const formatDateTime = (dateTime: string | undefined, date: string | undefined, allDay: boolean) => {
    if (allDay) {
      return intl.formatMessage({ id: 'calendar.event.allDay', defaultMessage: '全天' });
    }

    if (dateTime) {
      const eventDate = new Date(dateTime);
      return new Intl.DateTimeFormat(intl.locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: false,
      }).format(eventDate);
    }

    if (date) {
      const eventDate = new Date(date);
      return new Intl.DateTimeFormat(intl.locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(eventDate);
    }

    return '';
  };

  const getTimeRange = () => {
    if (event.allDay) {
      return intl.formatMessage({ id: 'calendar.event.allDay', defaultMessage: '全天' });
    }

    const startTime = formatDateTime(event.start.dateTime, event.start.date, !!event.allDay);
    const endTime = formatDateTime(event.end.dateTime, event.end.date, !!event.allDay);

    if (startTime === endTime) {
      return startTime;
    }

    return `${startTime} - ${endTime}`;
  };

  const handleOpenInGoogle = () => {
    if (event.url) {
      window.electron.shell.openExternal(event.url);
    } else if (event.provider === 'google' && event.id) {
      // Fallback Google Calendar URL format
      window.electron.shell.openExternal(`https://calendar.google.com/calendar/event?eid=${event.id}`);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'tentative': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getProviderDisplayName = (provider: string) => {
    switch (provider) {
      case 'google': return 'Google Calendar';
      case 'outlook': return 'Outlook';
      case 'apple': return 'Apple Calendar';
      default: return 'Calendar';
    }
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      PaperProps={{
        sx: {
          maxWidth: 400,
          minWidth: 320,
        }
      }}
    >
      <Box sx={{ p: 0 }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            p: 2,
            pb: 1,
            bgcolor: eventColor,
            color: 'white',
          }}
        >
          <Box sx={{ flexGrow: 1, pr: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600, flexGrow: 1, pr: 1 }}>
                {event.summary}
              </Typography>

              {/* Open in Provider Button */}
              {(event.url || event.provider) && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<LaunchIcon />}
                  onClick={handleOpenInGoogle}
                  sx={{
                    fontSize: '0.75rem',
                    minWidth: 'auto',
                    px: 1,
                    py: 0.25,
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.5)',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    }
                  }}
                >
                  {getProviderDisplayName(event.provider || 'google')}
                </Button>
              )}
            </Box>

            {calendar && (
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {calendar.name}
                {calendar.primary && (
                  <Chip
                    label={intl.formatMessage({ id: 'calendar.primary', defaultMessage: '主要' })}
                    size="small"
                    sx={{ ml: 1, height: 16, fontSize: '0.6rem', color: 'inherit', bgcolor: 'rgba(255,255,255,0.2)' }}
                  />
                )}
              </Typography>
            )}
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: 'white', mt: -0.5, mr: -0.5 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ p: 2, pt: 1 }}>
          {/* Time */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <TimeIcon sx={{ color: 'text.secondary', mr: 1.5, mt: 0.25, fontSize: 20 }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {getTimeRange()}
              </Typography>
              {event.start.timezone && (
                <Typography variant="caption" color="text.secondary">
                  {event.start.timezone}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Location */}
          {event.location && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <LocationIcon sx={{ color: 'text.secondary', mr: 1.5, mt: 0.25, fontSize: 20 }} />
              <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                {event.location}
              </Typography>
            </Box>
          )}

          {/* Description */}
          {event.description && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <DescriptionIcon sx={{ color: 'text.secondary', mr: 1.5, mt: 0.25, fontSize: 20 }} />
              <Typography
                variant="body2"
                sx={{
                  wordBreak: 'break-word',
                  maxHeight: 100,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {event.description}
              </Typography>
            </Box>
          )}

          {/* Status */}
          {event.status && event.status !== 'confirmed' && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EventIcon sx={{ color: 'text.secondary', mr: 1.5, fontSize: 20 }} />
              <Chip
                label={event.status}
                size="small"
                color={getStatusColor(event.status) as any}
                variant="outlined"
              />
            </Box>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PersonIcon sx={{ color: 'text.secondary', mr: 1.5, fontSize: 20 }} />
                <Typography variant="body2" fontWeight={500}>
                  {intl.formatMessage(
                    { id: 'calendar.event.attendees', defaultMessage: '參與者 ({count})' },
                    { count: event.attendees.length }
                  )}
                </Typography>
              </Box>
              <List dense sx={{ pl: 4.5, py: 0 }}>
                {event.attendees.slice(0, 5).map((attendee, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 0.25 }}>
                    <ListItemAvatar sx={{ minWidth: 32 }}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                        {attendee.name ? attendee.name[0].toUpperCase() : attendee.email[0].toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={attendee.name || attendee.email}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {attendee.email !== (attendee.name || attendee.email) && (
                            <Typography variant="caption" color="text.secondary">
                              {attendee.email}
                            </Typography>
                          )}
                          {attendee.organizer && (
                            <Chip
                              label={intl.formatMessage({ id: 'calendar.event.organizer', defaultMessage: '組織者' })}
                              size="small"
                              variant="outlined"
                              sx={{ height: 16, fontSize: '0.6rem' }}
                            />
                          )}
                          {attendee.optional && (
                            <Chip
                              label={intl.formatMessage({ id: 'calendar.event.optional', defaultMessage: '可選' })}
                              size="small"
                              variant="outlined"
                              sx={{ height: 16, fontSize: '0.6rem' }}
                            />
                          )}
                        </Box>
                      }
                      primaryTypographyProps={{ variant: 'body2', fontSize: '0.875rem' }}
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItem>
                ))}
                {event.attendees.length > 5 && (
                  <ListItem sx={{ px: 0, py: 0.25 }}>
                    <ListItemText
                      primary={
                        <Typography variant="caption" color="text.secondary">
                          {intl.formatMessage(
                            { id: 'calendar.event.moreAttendees', defaultMessage: '還有 {count} 人...' },
                            { count: event.attendees.length - 5 }
                          )}
                        </Typography>
                      }
                    />
                  </ListItem>
                )}
              </List>
            </Box>
          )}

          {/* Metadata */}
          {(event.created || event.updated) && (
            <Box sx={{ mt: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
              {event.created && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {intl.formatMessage({ id: 'calendar.event.created', defaultMessage: '建立於' })}: {' '}
                  {new Intl.DateTimeFormat(intl.locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  }).format(new Date(event.created))}
                </Typography>
              )}
              {event.updated && event.updated !== event.created && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {intl.formatMessage({ id: 'calendar.event.updated', defaultMessage: '更新於' })}: {' '}
                  {new Intl.DateTimeFormat(intl.locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  }).format(new Date(event.updated))}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Popover>
  );
};

export default CalendarEventPopover;
