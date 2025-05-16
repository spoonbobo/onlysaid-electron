import { Box, Typography, IconButton, Button } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useState, useEffect, useRef } from "react";
import { useTopicStore } from "../../../../stores/Topic/TopicStore"; // Adjusted path

const HOUR_HEIGHT = 60; // Height of each hour slot in pixels
const TOTAL_HOURS = 24;

interface DayViewProps {
  date: Date;
}

export default function DayView({ date }: DayViewProps) {
  const intl = useIntl();
  const { setSelectedCalendarDate } = useTopicStore();
  const [currentTimeLineTop, setCurrentTimeLineTop] = useState(0);
  const timelineScrollContainerRef = useRef<HTMLDivElement>(null);

  const isViewingToday = () => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  useEffect(() => {
    if (!isViewingToday()) { // If not today, don't run the interval
      setCurrentTimeLineTop(0); // Ensure line is not shown
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
  }, [date]); // Rerun if the date changes, to stop/start interval

  useEffect(() => {
    if (timelineScrollContainerRef.current) {
      const containerHeight = timelineScrollContainerRef.current.clientHeight;
      let scrollTo = 0;
      if (isViewingToday()) {
        scrollTo = currentTimeLineTop - containerHeight / 3;
      } else {
        // For other days, scroll to the top or a sensible default like 8 AM
        scrollTo = HOUR_HEIGHT * 8 - containerHeight / 3; // e.g. scroll to show 8 AM
      }
      timelineScrollContainerRef.current.scrollTop = scrollTo > 0 ? scrollTo : 0;
    }
  }, [currentTimeLineTop, date]); // Also depends on date

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

  const dayOfWeekString = new Intl.DateTimeFormat(intl.locale, { weekday: 'long' }).format(date);
  const dayNumber = date.getDate();

  const prevDayAriaLabel = intl.formatMessage({ id: "calendar.aria.prevDay", defaultMessage: "Previous day" });
  const nextDayAriaLabel = intl.formatMessage({ id: "calendar.aria.nextDay", defaultMessage: "Next day" });

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      {/* Timeline Container - This is the main scrollable area for DayView */}
      <Box
        ref={timelineScrollContainerRef}
        sx={{
          flexGrow: 1, // Takes up available vertical space
          overflowY: 'auto',
          position: 'relative', // For current time line positioning
          borderTop: 1, borderColor: 'divider', // Keep a top border if desired for separation
        }}
      >
        {/* Wrapper for sticky gutter and event content */}
        <Box sx={{ display: 'flex', minHeight: TOTAL_HOURS * HOUR_HEIGHT, position: 'relative' }}>
          {/* Time Gutter (Sticky) */}
          <Box
            sx={{
              width: 80,
              flexShrink: 0,
              // py: 1, // Padding can be part of the overall DayView box if needed
              borderRight: 1,
              borderColor: 'divider',
              position: 'sticky', // Make gutter sticky
              top: 0, // Stick to the top of the scroll container
              zIndex: 2, // Above event grid lines
              bgcolor: 'background.paper', // Necessary for sticky to not be transparent
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

          {/* Event Area (Scrolls with parent) */}
          <Box
            sx={{
              flexGrow: 1,
              position: 'relative' // For current time line and events
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
              >
                {/* Event items would go here */}
              </Box>
            ))}
            {/* Current Time Line - Conditionally Rendered */}
            {isViewingToday() && currentTimeLineTop > 0 && currentTimeLineTop < TOTAL_HOURS * HOUR_HEIGHT && (
              <Box
                sx={{
                  position: 'absolute',
                  top: currentTimeLineTop,
                  left: 0, // Relative to the Event Area
                  width: '100%',
                  height: '2px',
                  bgcolor: 'error.main',
                  zIndex: 3, // Above gutter and event grid lines
                }}
              >
                <Box sx={{ position: 'absolute', top: -3, left: -4, width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}