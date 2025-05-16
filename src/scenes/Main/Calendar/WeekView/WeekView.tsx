import { Box, Typography, /* IconButton, */ Paper } from "@mui/material"; // IconButton removed
import { FormattedMessage, useIntl } from "react-intl";
// import ChevronLeftIcon from "@mui/icons-material/ChevronLeft"; // Removed
// import ChevronRightIcon from "@mui/icons-material/ChevronRight"; // Removed
import { useState, useEffect, useRef } from "react";

const HOUR_HEIGHT = 60;
const TOTAL_HOURS = 24;
const DAY_COLUMN_MIN_WIDTH = 100;
const TIME_GUTTER_WIDTH = 80; // Define as a constant

interface WeekViewProps {
  currentDate: Date; // This date is any date within the week to be displayed. Week start is calculated.
  onDateChange?: (newDate: Date) => void; // For parent to update selected date if week nav happens inside
}

const getWeekStartDate = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0); // Normalize to start of the day
  return d;
};

export default function WeekView({ currentDate, onDateChange }: WeekViewProps) {
  const intl = useIntl();
  const [currentWeekStartDate, setCurrentWeekStartDate] = useState<Date>(getWeekStartDate(currentDate));
  const [currentTimeLineTop, setCurrentTimeLineTop] = useState(0);
  const timelineScrollContainerRef = useRef<HTMLDivElement>(null);
  const dayHeadersRef = useRef<HTMLDivElement>(null); // Ref for day headers container
  const eventGridAreaRef = useRef<HTMLDivElement>(null); // Ref for event grid area

  useEffect(() => {
    setCurrentWeekStartDate(getWeekStartDate(currentDate));
  }, [currentDate]);

  const daysInWeek: Date[] = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(currentWeekStartDate);
    day.setDate(currentWeekStartDate.getDate() + i);
    return day;
  });

  const isViewingCurrentWeek = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return daysInWeek.some(dayInWeek => dayInWeek.getTime() === today.getTime());
  };

  useEffect(() => {
    if (!isViewingCurrentWeek()) {
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
  }, [currentWeekStartDate]);

  useEffect(() => {
    if (timelineScrollContainerRef.current) {
      const containerHeight = timelineScrollContainerRef.current.clientHeight;
      let scrollTo = HOUR_HEIGHT * 7 - containerHeight / 3; // Default scroll to show 7 AM
      if (isViewingCurrentWeek() && currentTimeLineTop > 0) {
        scrollTo = currentTimeLineTop - containerHeight / 3;
      }
      timelineScrollContainerRef.current.scrollTop = scrollTo > 0 ? scrollTo : 0;
    }
  }, [currentTimeLineTop, currentWeekStartDate]);

  const timeSlots = Array.from({ length: TOTAL_HOURS }, (_, i) => {
    const hour = i;
    let displayHour = hour % 12;
    if (displayHour === 0) displayHour = 12;
    const period = hour < 12 ?
      intl.formatMessage({ id: "calendar.time.am", defaultMessage: "上午" }) :
      intl.formatMessage({ id: "calendar.time.pm", defaultMessage: "下午" });
    if (hour === 0) return intl.formatMessage({ id: "calendar.time.midnight", defaultMessage: "午夜" });
    if (hour === 12) return intl.formatMessage({ id: "calendar.time.noon", defaultMessage: "中午" });
    return `${period}${intl.formatNumber(displayHour)}${intl.formatMessage({ id: "calendar.time.hourLabel", defaultMessage: "點" })}`;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Attempt to synchronize widths if scrollbar is present
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  useEffect(() => {
    if (timelineScrollContainerRef.current) {
      const currentScrollbarWidth = timelineScrollContainerRef.current.offsetWidth - timelineScrollContainerRef.current.clientWidth;
      setScrollbarWidth(currentScrollbarWidth > 0 ? currentScrollbarWidth : 0);
    }
  }, []); // Calculate on mount, might need resize observer for dynamic changes

  return (
    <Box sx={{ height: "100%", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header for Week Navigation and Date Range is removed. Handled by parent. */}

      {/* Day Headers Row - Adjust paddingRight to account for potential scrollbar */}
      <Box
        ref={dayHeadersRef}
        sx={{
          display: 'flex',
          flexShrink: 0,
          bgcolor: 'primary.dark',
          color: 'primary.contrastText',
          // Apply paddingRight to the container of day cells, not the GMT cell
        }}
      >
        <Box sx={{ width: TIME_GUTTER_WIDTH, flexShrink: 0, py: 0.5, borderRight: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'inherit', opacity: 0.8 }}>GMT+08</Typography>
        </Box>
        {/* This Box will contain the day headers and its width should align with the event grid area below */}
        <Box sx={{ display: 'flex', flexGrow: 1, pr: `${scrollbarWidth}px` /* Account for scrollbar */ }}>
          {daysInWeek.map((day, index) => {
            const isToday = day.getTime() === today.getTime();
            return (
              <Box
                key={index}
                sx={{
                  flex: 1, // Distribute space equally
                  minWidth: DAY_COLUMN_MIN_WIDTH, // Ensure min width
                  py: 0.5,
                  textAlign: 'center',
                  borderRight: index < daysInWeek.length - 1 ? 1 : 0,
                  borderColor: 'rgba(255,255,255,0.2)', // Lighter divider for dark bg
                  borderBottom: 1,
                }}
              >
                <Typography variant="caption" component="div" sx={{ fontSize: '0.7rem', color: 'inherit', opacity: 0.8 }}>
                  {new Intl.DateTimeFormat(intl.locale, { weekday: 'short' }).format(day)}
                </Typography>
                <Typography
                  variant="h6"
                  component="div"
                  sx={{
                    color: isToday ? 'secondary.light' : 'inherit',
                    fontWeight: isToday ? 'bold' : 'normal',
                    fontSize: '1.25rem',
                    lineHeight: 1.2
                  }}
                >
                  {day.getDate()}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Scrollable Timeline Content */}
      <Box
        ref={timelineScrollContainerRef}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          position: 'relative',
        }}>
        <Box sx={{ display: 'flex', minHeight: TOTAL_HOURS * HOUR_HEIGHT, position: 'relative' }}>
          <Box
            sx={{
              width: TIME_GUTTER_WIDTH, // Use constant
              flexShrink: 0,
              borderRight: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              position: 'sticky',
              left: 0,
              top: 0,
              zIndex: 2,
            }}
          >
            {timeSlots.map((timeLabel, index) => (
              <Box
                key={`time-${index}`}
                sx={{
                  height: HOUR_HEIGHT,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  pt: '2px',
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                }}
              >
                {index > 0 && timeLabel}
              </Box>
            ))}
          </Box>

          {/* Event Grid Area */}
          <Box
            ref={eventGridAreaRef}
            sx={{ flexGrow: 1, display: 'flex', overflowX: 'auto', position: 'relative' }}
          >
            {daysInWeek.map((day, dayIndex) => (
              <Box
                key={`day-col-${dayIndex}`}
                sx={{
                  flex: `1 0 ${DAY_COLUMN_MIN_WIDTH}px`,
                  minWidth: DAY_COLUMN_MIN_WIDTH,
                  position: 'relative',
                  borderRight: dayIndex < daysInWeek.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                }}
              >
                {Array.from({ length: TOTAL_HOURS }).map((_, hourIndex) => (
                  <Box
                    key={`hour-slot-${dayIndex}-${hourIndex}`}
                    sx={{
                      height: HOUR_HEIGHT,
                      borderBottom: 1,
                      borderColor: 'divider',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Placeholder event from image */}
                    {dayIndex === 0 && hourIndex === 10 && ( // Assuming event starts at 10 AM on the first day shown
                      <Paper elevation={1} sx={{
                        position: 'absolute',
                        top: HOUR_HEIGHT * 10 + 2, // Starts at 10 AM, +2 for slight offset
                        left: '2px',
                        width: `calc(100% - 4px)`,
                        height: HOUR_HEIGHT * 9 - 4, // Spans 9 hours (10 AM to 7 PM), -4 for padding
                        bgcolor: 'primary.light', // Changed to primary.light for better contrast if primary.dark is very dark
                        opacity: 0.9, // Adjusted opacity
                        borderRadius: 1,
                        p: 0.5,
                        fontSize: '0.65rem',
                        overflow: 'hidden',
                        zIndex: 1, // Below current time indicator but above grid lines
                        boxSizing: 'border-box',
                        color: 'primary.contrastText' // Ensuring text in event is readable
                      }}>
                        <Typography variant="caption" fontWeight="bold" component="div" noWrap sx={{ fontSize: 'inherit' }}>
                          <FormattedMessage id="calendar.event.untitled" defaultMessage="(無標題)" />
                        </Typography>
                        <Typography variant="caption" component="div" noWrap sx={{ fontSize: 'inherit' }}>
                          <FormattedMessage id="calendar.event.timeRange" defaultMessage="上午10點 - 下午7點" />
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                ))}
              </Box>
            ))}
            {/* Current Time Line - Spans across all day columns */}
            {isViewingCurrentWeek() && currentTimeLineTop > 0 && currentTimeLineTop < TOTAL_HOURS * HOUR_HEIGHT && (
              <Box
                sx={{
                  position: 'absolute', // Positioned relative to the horizontally scrolling day columns container
                  top: currentTimeLineTop,
                  left: 0, // Starts from the beginning of the first day column
                  width: '100%', // Spans the entire width of the visible day columns
                  height: '2px',
                  bgcolor: 'error.main',
                  zIndex: 3, // Highest zIndex to be on top
                }}
              >
                {/* The dot needs to be positioned relative to the main scroll container's left edge for consistency */}
                {/* This is tricky because the line itself is on a scrolling container. */}
                {/* A simpler approach for the dot is to attach it to the start of the line, assuming LTR layout */}
                <Box sx={{ position: 'absolute', top: -3, left: -4, width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}