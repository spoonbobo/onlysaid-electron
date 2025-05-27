import { Box, Typography, Paper, Divider, IconButton, Button, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent, Chip } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useState, useEffect } from "react";
import { useTopicStore, useSelectedCalendarDate, CalendarViewMode } from "@/renderer/stores/Topic/TopicStore";
import DayView from "./DayView/DayView";
import WeekView from "./WeekView/WeekView";
import MonthView from "./MonthView/MonthView";
import { useGoogleCalendarStore } from "@/renderer/stores/Google/GoogleCalendarStore";
import { useMicrosoftCalendarStore } from "@/renderer/stores/MSFT/MSFTCalendarStore";
import { useUserTokenStore } from "@/renderer/stores/User/UserToken";
import CalendarEventPopover from "@/renderer/components/Popover/CalendarEventPopover";
import type { ICalendarEvent } from "@/../../types/Calendar/Calendar";

export default function Calendar() {
  const intl = useIntl();
  const selectedDate = useSelectedCalendarDate();
  const calendarViewMode = useTopicStore((state) => state.calendarViewMode);
  const { setCalendarViewMode, setSelectedCalendarDate } = useTopicStore();

  // Google Calendar integration
  const googleCalendarStore = useGoogleCalendarStore();
  const { googleCalendarConnected } = useUserTokenStore();

  // Microsoft Calendar integration
  const microsoftCalendarStore = useMicrosoftCalendarStore();
  const { microsoftCalendarConnected } = useUserTokenStore();

  const [activeDateForView, setActiveDateForView] = useState<Date>(() => selectedDate || new Date());
  const [headerDisplayDate, setHeaderDisplayDate] = useState<Date>(() => activeDateForView);
  const [eventSearchTerm, setEventSearchTerm] = useState('');

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

  // Fetch events when view mode or date changes
  useEffect(() => {
    const hasConnectedCalendars =
      (googleCalendarConnected && googleCalendarStore.calendars.length > 0) ||
      (microsoftCalendarConnected && microsoftCalendarStore.calendars.length > 0);

    if (!hasConnectedCalendars) return;

    const fetchEventsForCurrentView = async () => {
      let timeMin: string, timeMax: string;
      const baseDate = new Date(activeDateForView);

      switch (calendarViewMode) {
        case 'day':
          timeMin = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()).toISOString();
          timeMax = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1).toISOString();
          break;
        case 'week':
          const weekStart = new Date(baseDate);
          weekStart.setDate(baseDate.getDate() - baseDate.getDay() + (baseDate.getDay() === 0 ? -6 : 1));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7);
          timeMin = weekStart.toISOString();
          timeMax = weekEnd.toISOString();
          break;
        case 'month':
        default:
          const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
          const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
          timeMin = monthStart.toISOString();
          timeMax = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate() + 1).toISOString();
          break;
      }

      // Fetch from both providers
      const fetchPromises = [];

      if (googleCalendarConnected && googleCalendarStore.calendars.length > 0) {
        fetchPromises.push(googleCalendarStore.fetchEventsForSelectedCalendars(timeMin, timeMax));
      }

      if (microsoftCalendarConnected && microsoftCalendarStore.calendars.length > 0) {
        fetchPromises.push(microsoftCalendarStore.fetchEventsForSelectedCalendars(timeMin, timeMax));
      }

      if (fetchPromises.length > 0) {
        await Promise.allSettled(fetchPromises);
      }
    };

    fetchEventsForCurrentView();
  }, [
    calendarViewMode,
    activeDateForView,
    googleCalendarConnected,
    googleCalendarStore.calendars,
    microsoftCalendarConnected,
    microsoftCalendarStore.calendars,
    googleCalendarStore.fetchEventsForSelectedCalendars,
    microsoftCalendarStore.fetchEventsForSelectedCalendars
  ]);

  useEffect(() => {
    setActiveDateForView(currentActiveDate => {
      const newBaseDate = selectedDate || new Date();
      if (
        currentActiveDate.getFullYear() !== newBaseDate.getFullYear() ||
        currentActiveDate.getMonth() !== newBaseDate.getMonth() ||
        currentActiveDate.getDate() !== newBaseDate.getDate() ||
        (selectedDate && currentActiveDate.getTime() !== newBaseDate.getTime())
      ) {
        return newBaseDate;
      }
      return currentActiveDate;
    });
  }, [selectedDate]);

  useEffect(() => {
    setHeaderDisplayDate(currentHeaderDate => {
      if (currentHeaderDate.getTime() !== activeDateForView.getTime()) {
        return activeDateForView;
      }
      return currentHeaderDate;
    });
  }, [activeDateForView]);

  const handleViewModeChange = (event: SelectChangeEvent<CalendarViewMode>) => {
    const newMode = event.target.value as CalendarViewMode;
    setCalendarViewMode(newMode);
    setHeaderDisplayDate(activeDateForView);
  };

  const handlePrev = () => {
    const newDateToSet = new Date(headerDisplayDate);
    if (calendarViewMode === 'month') {
      newDateToSet.setDate(1);
      newDateToSet.setMonth(newDateToSet.getMonth() - 1);
    } else if (calendarViewMode === 'week') {
      newDateToSet.setDate(newDateToSet.getDate() - 7);
    } else {
      newDateToSet.setDate(newDateToSet.getDate() - 1);
    }
    setSelectedCalendarDate(newDateToSet);
  };

  const handleNext = () => {
    const newDateToSet = new Date(headerDisplayDate);
    if (calendarViewMode === 'month') {
      newDateToSet.setDate(1);
      newDateToSet.setMonth(newDateToSet.getMonth() + 1);
    } else if (calendarViewMode === 'week') {
      newDateToSet.setDate(newDateToSet.getDate() + 7);
    } else {
      newDateToSet.setDate(newDateToSet.getDate() + 1);
    }
    setSelectedCalendarDate(newDateToSet);
  };

  const getWeekDateRange = (date: Date): string => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (start.getFullYear() !== end.getFullYear()) {
      return `${new Intl.DateTimeFormat(intl.locale, { ...opts, year: 'numeric' }).format(start)} - ${new Intl.DateTimeFormat(intl.locale, { ...opts, year: 'numeric' }).format(end)}`;
    }
    if (start.getMonth() !== end.getMonth()) {
      return `${new Intl.DateTimeFormat(intl.locale, opts).format(start)} - ${new Intl.DateTimeFormat(intl.locale, { ...opts, year: 'numeric' }).format(end)}`;
    }
    return `${new Intl.DateTimeFormat(intl.locale, { month: 'long' }).format(start)} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
  };

  let viewHeaderDisplay: React.ReactNode;
  let viewContent;

  // Common text color for the header, since background will be lighter
  const headerTextColor = 'text.primary';
  const headerSubTextColor = 'text.secondary';

  switch (calendarViewMode) {
    case 'day':
      const dayNumber = headerDisplayDate.getDate();
      const dayNameFull = new Intl.DateTimeFormat(intl.locale, { weekday: 'long' }).format(headerDisplayDate);
      viewHeaderDisplay = (
        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', textAlign: 'center', px: 1 }}>
          <Typography variant="h5" component="span" fontWeight={500} sx={{ lineHeight: 1, mr: 1, color: headerTextColor }}>
            {dayNumber}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', mb: 0.3, textAlign: 'left' }}>
            <Typography variant="body2" component="span" fontWeight={400} sx={{ lineHeight: 1, color: headerTextColor }}>
              {dayNameFull}
            </Typography>
            <Typography variant="caption" component="span" sx={{ lineHeight: 1, color: headerSubTextColor }}>
              GMT+08
            </Typography>
          </Box>
        </Box>
      );
      viewContent = <DayView date={headerDisplayDate} />;
      break;
    case 'week':
      viewHeaderDisplay = (
        <Typography variant="h6" component="h2" fontWeight={500} sx={{ textAlign: 'center', color: headerTextColor, px: 1 }}>
          {getWeekDateRange(headerDisplayDate)}
        </Typography>
      );
      viewContent = <WeekView currentDate={headerDisplayDate} onDateChange={setSelectedCalendarDate} />;
      break;
    case 'month':
    default:
      viewHeaderDisplay = (
        <Typography variant="h6" component="h2" fontWeight={500} sx={{ textAlign: 'center', color: headerTextColor, px: 1 }}>
          {new Intl.DateTimeFormat(intl.locale, { month: 'long', year: 'numeric' }).format(headerDisplayDate)}
        </Typography>
      );
      viewContent = <MonthView displayDate={headerDisplayDate} onEventClick={handleEventClick} />;
      break;
  }

  const handleEventSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEventSearchTerm(event.target.value);
  };

  return (
    <Box sx={{ height: "100%", display: 'flex', flexDirection: 'column' }}>
      {/* Compact Header */}
      <Box sx={{
        px: 2,
        py: 1,
        borderBottom: 1,
        borderColor: 'divider',
        flexShrink: 0
      }}>
        <Box sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: 'space-between'
        }}>
          {/* Left side: Title + Navigation */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              variant="h6"
              component="h1"
              sx={{
                fontWeight: 500,
                color: 'text.primary',
                mr: 1
              }}
            >
              <FormattedMessage id="calendar.pageTitle" defaultMessage="Calendar" />
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center" }}>
              <IconButton
                onClick={handlePrev}
                aria-label="Previous"
                size="small"
                sx={{ color: 'text.secondary' }}
              >
                <ChevronLeftIcon />
              </IconButton>
              {viewHeaderDisplay}
              <IconButton
                onClick={handleNext}
                aria-label="Next"
                size="small"
                sx={{ color: 'text.secondary' }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Right side: View selector */}
          <FormControl size="small"
            sx={{
              minWidth: 100,
              '.MuiInputLabel-root': { color: 'text.secondary' },
              '.MuiSelect-select': { color: 'text.primary' },
              '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.23)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.87)' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
              '.MuiSelect-icon': { color: 'text.secondary' },
            }}
          >
            <InputLabel id="calendar-view-mode-label">
              <FormattedMessage id="calendar.viewMode.label" defaultMessage="View" />
            </InputLabel>
            <Select
              labelId="calendar-view-mode-label"
              value={calendarViewMode}
              label={<FormattedMessage id="calendar.viewMode.label" defaultMessage="View" />}
              onChange={handleViewModeChange}
            >
              <MenuItem value="month"><FormattedMessage id="calendar.viewMode.month" defaultMessage="Month" /></MenuItem>
              <MenuItem value="week"><FormattedMessage id="calendar.viewMode.week" defaultMessage="Week" /></MenuItem>
              <MenuItem value="day"><FormattedMessage id="calendar.viewMode.day" defaultMessage="Day" /></MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', p: 0, m: 0 }}>
        {viewContent}
      </Box>

      {/* Event Popover for Month View */}
      {calendarViewMode === 'month' && (
        <CalendarEventPopover
          event={selectedEvent}
          anchorEl={popoverAnchorEl}
          open={Boolean(popoverAnchorEl)}
          onClose={handlePopoverClose}
        />
      )}
    </Box>
  );
}
