import { Box, Typography, Paper, Divider, IconButton, Button, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
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

  const handleDayClick = (clickedDate: Date) => {
    setSelectedCalendarDate(new Date(clickedDate)); // Ensure a new Date object is set
    setCalendarViewMode('day');
  };

  // Week starts on Monday, as per the image
  const daysOfWeek = [
    intl.formatMessage({ id: "calendar.day.mon", defaultMessage: "Mon" }),
    intl.formatMessage({ id: "calendar.day.tue", defaultMessage: "Tue" }),
    intl.formatMessage({ id: "calendar.day.wed", defaultMessage: "Wed" }),
    intl.formatMessage({ id: "calendar.day.thu", defaultMessage: "Thu" }),
    intl.formatMessage({ id: "calendar.day.fri", defaultMessage: "Fri" }),
    intl.formatMessage({ id: "calendar.day.sat", defaultMessage: "Sat" }),
    intl.formatMessage({ id: "calendar.day.sun", defaultMessage: "Sun" })
  ];

  const currentMonth = displayDate.getMonth();
  const currentYear = displayDate.getFullYear();
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today's date for accurate comparison

  const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
  let dayOfWeekOfFirst = firstDayOfCurrentMonth.getDay(); // 0=Sun, 1=Mon, ...
  // Adjust so Monday is 0, ..., Sunday is 6
  dayOfWeekOfFirst = (dayOfWeekOfFirst === 0) ? 6 : dayOfWeekOfFirst - 1;

  const firstCalendarDate = new Date(firstDayOfCurrentMonth);
  firstCalendarDate.setDate(firstDayOfCurrentMonth.getDate() - dayOfWeekOfFirst);

  const calendarCellsData: { day: number; isCurrentMonth: boolean; date: Date; isToday: boolean; lunar?: string; }[] = [];
  const tempDate = new Date(firstCalendarDate);

  for (let i = 0; i < 42; i++) { // Always render 6 weeks (42 days)
    const cellDate = new Date(tempDate);
    cellDate.setHours(0, 0, 0, 0); // Normalize for comparison

    const isCurrentMonthFlag = cellDate.getMonth() === currentMonth && cellDate.getFullYear() === currentYear;
    const isTodayFlag = cellDate.getTime() === today.getTime();

    // Placeholder for lunar date - this would come from a library or service
    // const lunarDateStr = getLunarDate(cellDate);

    calendarCellsData.push({
      day: cellDate.getDate(),
      isCurrentMonth: isCurrentMonthFlag,
      date: cellDate,
      isToday: isTodayFlag,
      // lunar: lunarDateStr // Example
    });
    tempDate.setDate(tempDate.getDate() + 1);
  }

  const weeksToRender: typeof calendarCellsData[] = [];
  for (let i = 0; i < calendarCellsData.length; i += 7) {
    weeksToRender.push(calendarCellsData.slice(i, i + 7));
  }

  return (
    <Paper elevation={0} sx={{ m: 1, mt: 0, mb: 0, overflow: "hidden", flexGrow: 1, display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider', borderTop: 0 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {daysOfWeek.map((dayName, index) => (
          <Box key={`${dayName}-${index}`} sx={{ py: 0.5, px: 1, textAlign: "center", fontWeight: "normal", fontSize: '0.8rem', color: "text.secondary", borderBottom: 1, borderColor: 'divider' }}>
            {dayName}
          </Box>
        ))}
      </Box>
      <Box sx={{ flexGrow: 1, display: 'grid', gridTemplateRows: `repeat(${weeksToRender.length}, 1fr)` }}>
        {weeksToRender.map((weekData, weekIndex) => (
          <Box key={`week-${weekIndex}`} sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", flexGrow: 1, borderBottom: weekIndex < weeksToRender.length - 1 ? 1 : 0, borderColor: 'divider' }}>
            {weekData.map((cellData, dayIndex) => {
              return (
                <Box
                  key={cellData.date.toISOString()}
                  onClick={cellData.isCurrentMonth ? () => handleDayClick(cellData.date) : undefined}
                  sx={{
                    p: 0.5,
                    borderRight: dayIndex < 6 ? 1 : 0,
                    borderColor: 'divider',
                    bgcolor: "background.paper",
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    minHeight: '100px', // Adjust as needed, image implies ~1/6th of available height
                    cursor: cellData.isCurrentMonth ? 'pointer' : 'default',
                    '&:hover': {
                      bgcolor: cellData.isCurrentMonth && !cellData.isToday ? 'action.hover' : undefined,
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', p: 0.5 }}>
                    <Typography
                      variant="body2"
                      component="span"
                      sx={
                        cellData.isToday ? {
                          bgcolor: 'primary.main',
                          color: 'common.white',
                          width: 24, // Smaller circle
                          height: 24,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'medium',
                          fontSize: '0.8rem'
                        } : {
                          fontSize: '0.8rem',
                          fontWeight: cellData.isCurrentMonth ? 'medium' : 'normal',
                          p: '3px', // to align with circle size
                          color: cellData.isCurrentMonth ? 'text.primary' : 'text.secondary',
                        }
                      }
                    >
                      {cellData.day}
                    </Typography>
                    {/* Placeholder for Lunar Date */}
                    {cellData.lunar && (
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: cellData.isCurrentMonth ? 'text.secondary' : 'text.disabled', pt: '2px' }}>
                        {cellData.lunar}
                      </Typography>
                    )}
                  </Box>
                  {cellData.isCurrentMonth && (
                    <Box sx={{ flexGrow: 1, mt: 0.5, width: '100%', overflowY: 'auto', p: 0.5, fontSize: '0.75rem' }}>
                      {/* Event rendering area. Example: */}
                      {/* {cellData.day === 1 && <Chip label="Labour Day" size="small" sx={{backgroundColor: '#e6f4ea', color: '#137333', maxWidth: '100%'}} />} */}
                    </Box>
                  )}
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
      <Typography
        variant="h5"
        component="h1"
        gutterBottom
        sx={{
          fontWeight: 500,
          px: 2,
          pt: 1.5,
          color: 'text.primary'
        }}
      >
        <FormattedMessage id="calendar.pageTitle" defaultMessage="Calendar" />
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: 'space-between',
          p: 1.5,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton onClick={handlePrev} aria-label="Previous" sx={{ color: 'text.secondary' }}>
            <ChevronLeftIcon />
          </IconButton>
          {viewHeaderDisplay}
          <IconButton onClick={handleNext} aria-label="Next" sx={{ color: 'text.secondary' }}>
            <ChevronRightIcon />
          </IconButton>
        </Box>

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