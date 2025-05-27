import { Box, Typography, IconButton, Button, Paper, Chip } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useState, useEffect, useRef } from "react";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useGoogleCalendarStore } from "@/renderer/stores/Google/GoogleCalendarStore";
import { useMicrosoftCalendarStore } from "@/renderer/stores/MSFT/MSFTCalendarStore";
import type { ICalendarEvent, ICalendar } from "@/../../types/Calendar/Calendar";
import CalendarEventPopover from "@/renderer/components/Popover/CalendarEventPopover";

const HOUR_HEIGHT = 60;
const TOTAL_HOURS = 24;

interface DayViewProps {
  date: Date;
}

// Helper function to get event position and duration
const getEventPosition = (event: ICalendarEvent, dayStart: Date) => {
  const eventStart = event.start.dateTime ? new Date(event.start.dateTime) : dayStart;
  const eventEnd = event.end.dateTime ? new Date(event.end.dateTime) : new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
  const endMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();
  const durationMinutes = endMinutes - startMinutes;

  return {
    top: (startMinutes / 60) * HOUR_HEIGHT,
    height: Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20), // Minimum 20px height
    startTime: eventStart,
    endTime: eventEnd,
  };
};

export default function DayView({ date }: DayViewProps) {
  const intl = useIntl();
  const { setSelectedCalendarDate } = useTopicStore();
  const [currentTimeLineTop, setCurrentTimeLineTop] = useState(0);
  const timelineScrollContainerRef = useRef<HTMLDivElement>(null);

  // Get events and calendars from both providers
  const googleCalendarStore = useGoogleCalendarStore();
  const microsoftCalendarStore = useMicrosoftCalendarStore();

  // Merge events from both providers
  const googleEvents = googleCalendarStore.getVisibleEvents();
  const microsoftEvents = microsoftCalendarStore.getVisibleEvents();
  const allEvents = [...googleEvents, ...microsoftEvents];

  // Merge calendars from both providers
  const allCalendars: ICalendar[] = [
    ...googleCalendarStore.calendars,
    ...microsoftCalendarStore.calendars
  ];

  // Filter events for this specific day
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const dayEvents = allEvents.filter(event => {
    const eventStart = event.start.dateTime ? new Date(event.start.dateTime) :
      event.start.date ? new Date(event.start.date) : null;
    const eventEnd = event.end.dateTime ? new Date(event.end.dateTime) :
      event.end.date ? new Date(event.end.date) : null;

    if (!eventStart) return false;

    return eventStart < dayEnd && (!eventEnd || eventEnd > dayStart);
  });

  const isViewingToday = () => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  useEffect(() => {
    if (!isViewingToday()) {
      setCurrentTimeLineTop(0);
      return;
    }
    const updateLine = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const topPosition = (hours * HOUR_HEIGHT) + (minutes / 60 * HOUR_HEIGHT);
      setCurrentTimeLineTop(topPosition);
    };

    updateLine();
    const intervalId = setInterval(updateLine, 60000);
    return () => clearInterval(intervalId);
  }, [date]);

  useEffect(() => {
    if (timelineScrollContainerRef.current) {
      const containerHeight = timelineScrollContainerRef.current.clientHeight;
      let scrollTo = 0;
      if (isViewingToday()) {
        scrollTo = currentTimeLineTop - containerHeight / 3;
      } else {
        scrollTo = HOUR_HEIGHT * 8 - containerHeight / 3;
      }
      timelineScrollContainerRef.current.scrollTop = scrollTo > 0 ? scrollTo : 0;
    }
  }, [currentTimeLineTop, date]);

  const timeSlots = Array.from({ length: TOTAL_HOURS }, (_, i) => {
    const hour = i;
    let displayHour = hour % 12;
    if (displayHour === 0) displayHour = 12;

    const period = hour < 12 ?
      intl.formatMessage({ id: "calendar.time.am", defaultMessage: "上午" }) :
      intl.formatMessage({ id: "calendar.time.pm", defaultMessage: "下午" });

    if (hour === 0) {
      return intl.formatMessage({ id: "calendar.time.midnight", defaultMessage: "午夜" });
    }
    if (hour === 12) {
      return intl.formatMessage({ id: "calendar.time.noon", defaultMessage: "中午" });
    }

    return `${period}${intl.formatNumber(displayHour)}${intl.formatMessage({ id: "calendar.time.hourLabel", defaultMessage: "點" })}`;
  });

  const getEventColor = (event: ICalendarEvent) => {
    const calendar = allCalendars.find(cal => cal.id === event.calendarId);
    return calendar?.color || (event.provider === 'outlook' ? '#0078d4' : '#1976d2');
  };

  const handlePrevDay = () => {
    const prevDay = new Date(date);
    prevDay.setDate(date.getDate() - 1);
    setSelectedCalendarDate(prevDay);
  };

  const handleNextDay = () => {
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    setSelectedCalendarDate(nextDay);
  };

  const dayOfWeekString = new Intl.DateTimeFormat(intl.locale, { weekday: 'long' }).format(date);
  const dayNumber = date.getDate();

  const prevDayAriaLabel = intl.formatMessage({ id: "calendar.aria.prevDay", defaultMessage: "Previous day" });
  const nextDayAriaLabel = intl.formatMessage({ id: "calendar.aria.nextDay", defaultMessage: "Next day" });

  // Popover state
  const [popoverAnchorEl, setPopoverAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ICalendarEvent | null>(null);

  const handleEventClick = (event: React.MouseEvent<HTMLElement>, calendarEvent: ICalendarEvent) => {
    event.stopPropagation();
    setPopoverAnchorEl(event.currentTarget);
    setSelectedEvent(calendarEvent);
  };

  const handlePopoverClose = () => {
    setPopoverAnchorEl(null);
    setSelectedEvent(null);
  };

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      <Box
        ref={timelineScrollContainerRef}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          position: 'relative',
          borderTop: 1, borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', minHeight: TOTAL_HOURS * HOUR_HEIGHT, position: 'relative' }}>
          {/* Time Gutter */}
          <Box
            sx={{
              width: 80,
              flexShrink: 0,
              borderRight: 1,
              borderColor: 'divider',
              position: 'sticky',
              top: 0,
              zIndex: 2,
              bgcolor: 'background.paper',
            }}
          >
            {timeSlots.map((timeLabel, index) => (
              <Box
                key={index}
                sx={{
                  height: HOUR_HEIGHT,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  pt: '2px',
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                }}
              >
                {index > 0 && timeLabel}
              </Box>
            ))}
          </Box>

          {/* Event Area */}
          <Box
            sx={{
              flexGrow: 1,
              position: 'relative'
            }}
          >
            {Array.from({ length: TOTAL_HOURS }).map((_, index) => (
              <Box
                key={index}
                sx={{
                  height: HOUR_HEIGHT,
                  borderBottom: 1,
                  borderColor: 'divider',
                  boxSizing: 'border-box',
                }}
              />
            ))}

            {/* Render Events */}
            {dayEvents.map((event) => {
              if (event.allDay) {
                return (
                  <Paper
                    key={event.id}
                    elevation={2}
                    onClick={(e) => handleEventClick(e, event)}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      left: '4px',
                      right: '4px',
                      height: 24,
                      bgcolor: getEventColor(event),
                      color: 'white',
                      borderRadius: 1,
                      p: 0.5,
                      fontSize: '0.75rem',
                      overflow: 'hidden',
                      zIndex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      '&:hover': {
                        elevation: 4,
                        opacity: 0.9,
                      }
                    }}
                  >
                    <Typography variant="caption" noWrap sx={{ fontWeight: 500 }}>
                      {event.summary}
                    </Typography>
                  </Paper>
                );
              }

              const { top, height, startTime, endTime } = getEventPosition(event, dayStart);
              const startTimeStr = startTime.toLocaleTimeString(intl.locale, {
                hour: 'numeric',
                minute: '2-digit',
                hour12: false
              });
              const endTimeStr = endTime.toLocaleTimeString(intl.locale, {
                hour: 'numeric',
                minute: '2-digit',
                hour12: false
              });

              return (
                <Paper
                  key={event.id}
                  elevation={2}
                  onClick={(e) => handleEventClick(e, event)}
                  sx={{
                    position: 'absolute',
                    top: top + 32,
                    left: '4px',
                    right: '4px',
                    height: height,
                    bgcolor: getEventColor(event),
                    color: 'white',
                    borderRadius: 1,
                    p: 0.5,
                    fontSize: '0.75rem',
                    overflow: 'hidden',
                    zIndex: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      elevation: 4,
                      opacity: 0.9,
                    }
                  }}
                >
                  <Typography variant="caption" fontWeight="bold" component="div" noWrap>
                    {event.summary}
                  </Typography>
                  <Typography variant="caption" component="div" sx={{ opacity: 0.9 }}>
                    {startTimeStr} - {endTimeStr}
                  </Typography>
                  {event.location && (
                    <Typography variant="caption" component="div" sx={{ opacity: 0.8 }} noWrap>
                      📍 {event.location}
                    </Typography>
                  )}
                </Paper>
              );
            })}

            {/* Current Time Line */}
            {isViewingToday() && currentTimeLineTop > 0 && currentTimeLineTop < TOTAL_HOURS * HOUR_HEIGHT && (
              <Box
                sx={{
                  position: 'absolute',
                  top: currentTimeLineTop + 32, // Offset for all-day events
                  left: 0,
                  width: '100%',
                  height: '2px',
                  bgcolor: 'error.main',
                  zIndex: 3,
                }}
              >
                <Box sx={{ position: 'absolute', top: -3, left: -4, width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Event Popover */}
      <CalendarEventPopover
        event={selectedEvent}
        anchorEl={popoverAnchorEl}
        open={Boolean(popoverAnchorEl)}
        onClose={handlePopoverClose}
      />
    </Box>
  );
}
