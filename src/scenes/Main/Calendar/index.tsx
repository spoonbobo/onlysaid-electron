import { Box, Typography, Paper, Divider, IconButton, Button, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useState, useEffect } from "react";
import { useTopicStore, useSelectedCalendarDate, CalendarViewMode } from "../../../stores/Topic/TopicStore";
import DayView from "./DayView/DayView";
import WeekView from "./WeekView/WeekView";

interface MonthViewInternalProps {
  displayDate: Date;
}

function MonthViewInternal({ displayDate }: MonthViewInternalProps) {
  const intl = useIntl();
  const { setSelectedCalendarDate, setCalendarViewMode } = useTopicStore();

  const handleDayClick = (day: number) => {
    const newSelectedDate = new Date(displayDate.getFullYear(), displayDate.getMonth(), day);
    setSelectedCalendarDate(newSelectedDate);
    setCalendarViewMode('day');
  };

  const daysOfWeek = [
    intl.formatMessage({ id: "calendar.day.sun", defaultMessage: "Sun" }),
    intl.formatMessage({ id: "calendar.day.mon", defaultMessage: "Mon" }),
    intl.formatMessage({ id: "calendar.day.tue", defaultMessage: "Tue" }),
    intl.formatMessage({ id: "calendar.day.wed", defaultMessage: "Wed" }),
    intl.formatMessage({ id: "calendar.day.thu", defaultMessage: "Thu" }),
    intl.formatMessage({ id: "calendar.day.fri", defaultMessage: "Fri" }),
    intl.formatMessage({ id: "calendar.day.sat", defaultMessage: "Sat" })
  ];
  const currentMonth = displayDate.getMonth();
  const currentYear = displayDate.getFullYear();

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const startingDay = firstDayOfMonth.getDay();

  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  const calendarDays = [];
  for (let i = 0; i < startingDay; i++) { calendarDays.push(null); }
  for (let i = 1; i <= daysInMonth; i++) { calendarDays.push(i); }

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];
  calendarDays.forEach((day, index) => {
    week.push(day);
    if ((index + 1) % 7 === 0 || index === calendarDays.length - 1) {
      weeks.push([...week]);
      week = [];
    }
  });
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push([...week]);
  }
  const today = new Date();

  return (
    <Paper elevation={0} sx={{ m: 3, mt: 1, mb: 1, overflow: "hidden", flexGrow: 1, display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {daysOfWeek.map((dayName, index) => (
          <Box key={`${dayName}-${index}`} sx={{ p: 1, textAlign: "center", fontWeight: "bold", bgcolor: "primary.light", color: "primary.contrastText" }}>
            {dayName}
          </Box>
        ))}
      </Box>
      <Divider />
      <Box sx={{ flexGrow: 1, display: 'grid', gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((weekData, weekIndex) => (
          <Box key={`week-${weekIndex}`} sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", flexGrow: 1, borderBottom: weekIndex < weeks.length - 1 ? 1 : 0, borderColor: 'divider' }}>
            {weekData.map((day, dayIndex) => {
              const isCurrentMonthDay = day !== null;
              const isToday = isCurrentMonthDay && day === today.getDate() &&
                currentMonth === today.getMonth() &&
                currentYear === today.getFullYear();
              return (
                <Box
                  key={`day-${weekIndex}-${dayIndex}`}
                  onClick={isCurrentMonthDay ? () => handleDayClick(day as number) : undefined}
                  sx={{
                    p: 1,
                    borderRight: dayIndex < 6 ? 1 : 0,
                    borderColor: 'divider',
                    bgcolor: isToday ? "primary.50" : (isCurrentMonthDay ? "background.paper" : "action.disabledBackground"),
                    fontWeight: isToday ? "bold" : "normal",
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    color: isToday ? 'primary.main' : (isCurrentMonthDay ? 'text.primary' : 'text.disabled'),
                    minHeight: '80px',
                    flexGrow: 1,
                    cursor: isCurrentMonthDay ? 'pointer' : 'default',
                    '&:hover': {
                      bgcolor: isCurrentMonthDay && !isToday ? 'action.hover' : undefined,
                    }
                  }}
                >
                  {day}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

export default function Calendar() {
  const intl = useIntl();
  const selectedDate = useSelectedCalendarDate();
  const calendarViewMode = useTopicStore((state) => state.calendarViewMode);
  const { setCalendarViewMode, setSelectedCalendarDate } = useTopicStore();

  const [activeDateForView, setActiveDateForView] = useState<Date>(() => selectedDate || new Date());
  const [headerDisplayDate, setHeaderDisplayDate] = useState<Date>(() => activeDateForView);

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
      viewContent = <MonthViewInternal displayDate={headerDisplayDate} />;
      break;
  }

  return (
    <Box sx={{ height: "100%", display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          p: 1.5,
          flexShrink: 0,
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <CalendarMonthIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h5" component="h1" fontWeight={600} sx={{ color: 'text.primary', mr: 2 }}>
            <FormattedMessage id="workspace.calendar.title" defaultMessage="Calendar" />
          </Typography>
          <IconButton onClick={handlePrev} aria-label="Previous" sx={{ color: 'text.secondary' }}>
            <ChevronLeftIcon />
          </IconButton>
          {viewHeaderDisplay}
          <IconButton onClick={handleNext} aria-label="Next" sx={{ color: 'text.secondary' }}>
            <ChevronRightIcon />
          </IconButton>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: "flex", alignItems: "center" }}>
          <FormControl size="small"
            sx={{
              minWidth: 120,
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
    </Box>
  );
}