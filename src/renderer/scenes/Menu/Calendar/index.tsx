import { Box, Typography, IconButton, Checkbox, FormControlLabel, Divider, CircularProgress } from "@mui/material";
import { useState, useEffect } from "react";
import { useIntl } from "react-intl";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import GoogleIcon from "@mui/icons-material/Google";
import { useTopicStore, useSelectedCalendarDate } from "@/renderer/stores/Topic/TopicStore";
import { useGoogleCalendarStore } from "@/renderer/stores/Google/GoogleCalendarStore";
import { useMicrosoftCalendarStore } from "@/renderer/stores/MSFT/MSFTCalendarStore";
import { useUserTokenStore } from "@/renderer/stores/User/UserToken";
import WorkIcon from "@mui/icons-material/Work";
import EmailIcon from "@mui/icons-material/Email";

// Define a type for the day objects to include full date for potential future use
interface CalendarDay {
  dayOfMonth: number | null;
  isToday: boolean;
  date: Date | null;
}

export default function MenuCalendar() {
  const intl = useIntl();
  const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date());
  const { setSelectedCalendarDate } = useTopicStore();
  const selectedDate = useSelectedCalendarDate();

  // Google Calendar state
  const googleCalendarStore = useGoogleCalendarStore();
  const { googleCalendarConnected, googleCalendarToken } = useUserTokenStore();

  // Microsoft Calendar state
  const microsoftCalendarStore = useMicrosoftCalendarStore();
  const { microsoftCalendarConnected, microsoftCalendarToken } = useUserTokenStore();

  // Fetch calendars when connected
  useEffect(() => {
    if (googleCalendarConnected && googleCalendarToken && googleCalendarStore.calendars.length === 0) {
      googleCalendarStore.fetchCalendars();
    }
  }, [googleCalendarConnected, googleCalendarToken, googleCalendarStore.calendars.length, googleCalendarStore.fetchCalendars]);

  useEffect(() => {
    if (microsoftCalendarConnected && microsoftCalendarToken && microsoftCalendarStore.calendars.length === 0) {
      microsoftCalendarStore.fetchCalendars();
    }
  }, [microsoftCalendarConnected, microsoftCalendarToken, microsoftCalendarStore.calendars.length, microsoftCalendarStore.fetchCalendars]);

  const handleDayClick = (date: Date | null) => {
    if (date) {
      setSelectedCalendarDate(date);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDisplayDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(1);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentDisplayDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(1);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const handleGoogleCalendarToggle = (calendarId: string) => {
    googleCalendarStore.toggleCalendar(calendarId);
  };

  const handleMicrosoftCalendarToggle = (calendarId: string) => {
    microsoftCalendarStore.toggleCalendar(calendarId);
  };

  const currentMonth = currentDisplayDate.getMonth();
  const currentYear = currentDisplayDate.getFullYear();

  // Days of the week starting with Monday
  const daysOfWeekMenu = [
    intl.formatMessage({ id: "calendar.menu.day.mon", defaultMessage: "一" }),
    intl.formatMessage({ id: "calendar.menu.day.tue", defaultMessage: "二" }),
    intl.formatMessage({ id: "calendar.menu.day.wed", defaultMessage: "三" }),
    intl.formatMessage({ id: "calendar.menu.day.thu", defaultMessage: "四" }),
    intl.formatMessage({ id: "calendar.menu.day.fri", defaultMessage: "五" }),
    intl.formatMessage({ id: "calendar.menu.day.sat", defaultMessage: "六" }),
    intl.formatMessage({ id: "calendar.menu.day.sun", defaultMessage: "日" })
  ];

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  let startingDayOfWeek = firstDayOfMonth.getDay();
  let blankCellsBefore = (startingDayOfWeek === 0) ? 6 : startingDayOfWeek - 1;

  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  const calendarDays: CalendarDay[] = [];
  for (let i = 0; i < blankCellsBefore; i++) {
    calendarDays.push({ dayOfMonth: null, isToday: false, date: null });
  }

  const today = new Date();
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(currentYear, currentMonth, i);
    const isToday = date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
    calendarDays.push({ dayOfMonth: i, isToday, date });
  }

  const totalCells = 42;
  while (calendarDays.length < totalCells && calendarDays.length % 7 !== 0) {
    calendarDays.push({ dayOfMonth: null, isToday: false, date: null });
  }

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }
  while (weeks.length > 5 && weeks[weeks.length - 1].every(day => day.dayOfMonth === null)) {
    weeks.pop();
  }

  const monthYearFormatOptions: Intl.DateTimeFormatOptions = { month: 'numeric', year: 'numeric' };
  let formattedMonthYear = new Intl.DateTimeFormat(intl.locale, monthYearFormatOptions).format(currentDisplayDate);
  if (intl.locale.startsWith('ja') || intl.locale.startsWith('zh')) {
    formattedMonthYear = `${currentYear}${intl.formatMessage({ id: "calendar.yearLabel", defaultMessage: "年" })}${currentMonth + 1}${intl.formatMessage({ id: "calendar.monthLabel", defaultMessage: "月" })}`;
  }

  return (
    <Box sx={{ p: 1, width: '100%', maxWidth: 280, margin: 'auto' }}>
      {/* Calendar Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="body2" fontWeight="medium">
          {formattedMonthYear}
        </Typography>
        <Box>
          <IconButton onClick={handlePrevMonth} size="small" aria-label={intl.formatMessage({ id: "calendar.aria.prevMonth", defaultMessage: "Previous month" })}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <IconButton onClick={handleNextMonth} size="small" aria-label={intl.formatMessage({ id: "calendar.aria.nextMonth", defaultMessage: "Next month" })}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Days of Week */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" }}>
        {daysOfWeekMenu.map(day => (
          <Typography key={day} variant="caption" sx={{ p: 0.5, color: 'text.secondary' }}>
            {day}
          </Typography>
        ))}
      </Box>

      {/* Calendar Grid */}
      {weeks.map((week, weekIndex) => (
        <Box key={`week-${weekIndex}`} sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" }}>
          {week.map((dayObj, dayIndex) => {
            const isSelected = selectedDate && dayObj.date &&
              selectedDate.getFullYear() === dayObj.date.getFullYear() &&
              selectedDate.getMonth() === dayObj.date.getMonth() &&
              selectedDate.getDate() === dayObj.date.getDate();
            return (
              <Box
                key={`day-${weekIndex}-${dayIndex}`}
                onClick={() => handleDayClick(dayObj.date)}
                sx={{
                  p: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 30,
                  cursor: dayObj.dayOfMonth !== null ? 'pointer' : 'default',
                }}
              >
                {dayObj.dayOfMonth !== null && (
                  <Typography
                    variant="body2"
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: dayObj.isToday ? "primary.main" : (isSelected ? "secondary.main" : "transparent"),
                      color: dayObj.isToday || isSelected ? "primary.contrastText" : "text.primary",
                      fontWeight: dayObj.isToday || isSelected ? "bold" : "normal",
                      border: isSelected && !dayObj.isToday ? `1px solid ${isSelected ? 'secondary.dark' : 'transparent'}` : 'none',
                      '&:hover': {
                        bgcolor: dayObj.isToday ? 'primary.dark' : (isSelected ? 'secondary.dark' : 'action.hover')
                      }
                    }}
                  >
                    {dayObj.dayOfMonth}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      ))}

      <Divider sx={{ my: 2 }} />

      {/* Calendars Section */}
      <Box>
        <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
          {intl.formatMessage({ id: "calendar.calendars", defaultMessage: "日曆" })}
        </Typography>

        {/* Workspaces Section */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
            <WorkIcon sx={{ fontSize: 16 }} />
            {intl.formatMessage({ id: "calendar.workspaces", defaultMessage: "工作區" })}
          </Typography>
          <Box sx={{ pl: 2 }}>
            {/* Empty for now */}
          </Box>
        </Box>

        {/* Google Calendar Section */}
        {googleCalendarConnected && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
              <GoogleIcon sx={{ fontSize: 16 }} />
              Google
              {googleCalendarStore.loading && <CircularProgress size={12} />}
            </Typography>
            <Box sx={{ pl: 2 }}>
              {googleCalendarStore.calendars.length === 0 && !googleCalendarStore.loading ? (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {intl.formatMessage({ id: "calendar.noCalendars", defaultMessage: "No calendars found" })}
                </Typography>
              ) : (
                googleCalendarStore.calendars.map((calendar) => (
                  <FormControlLabel
                    key={calendar.id}
                    control={
                      <Checkbox
                        checked={calendar.selected}
                        onChange={() => handleGoogleCalendarToggle(calendar.id)}
                        size="small"
                        sx={{
                          color: calendar.color || 'primary.main',
                          '&.Mui-checked': {
                            color: calendar.color || 'primary.main',
                          },
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        {calendar.name}
                        {calendar.primary && (
                          <Typography component="span" variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                            ({intl.formatMessage({ id: "calendar.primary", defaultMessage: "主要" })})
                          </Typography>
                        )}
                      </Typography>
                    }
                    sx={{
                      width: '100%',
                      m: 0,
                      '& .MuiFormControlLabel-label': {
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }
                    }}
                  />
                ))
              )}
              {googleCalendarStore.error && (
                <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>
                  {googleCalendarStore.error}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Microsoft Outlook Section */}
        {microsoftCalendarConnected && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmailIcon sx={{ fontSize: 16 }} />
              {intl.formatMessage({ id: "calendar.outlook", defaultMessage: "Outlook" })}
              {microsoftCalendarStore.loading && <CircularProgress size={12} />}
            </Typography>
            <Box sx={{ pl: 2 }}>
              {microsoftCalendarStore.calendars.length === 0 && !microsoftCalendarStore.loading ? (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {intl.formatMessage({ id: "calendar.noCalendars", defaultMessage: "No calendars found" })}
                </Typography>
              ) : (
                microsoftCalendarStore.calendars.map((calendar) => (
                  <FormControlLabel
                    key={calendar.id}
                    control={
                      <Checkbox
                        checked={calendar.selected}
                        onChange={() => handleMicrosoftCalendarToggle(calendar.id)}
                        size="small"
                        sx={{
                          color: calendar.color || '#0078d4',
                          '&.Mui-checked': {
                            color: calendar.color || '#0078d4',
                          },
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        {calendar.name}
                        {calendar.primary && (
                          <Typography component="span" variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                            ({intl.formatMessage({ id: "calendar.primary", defaultMessage: "主要" })})
                          </Typography>
                        )}
                      </Typography>
                    }
                    sx={{
                      width: '100%',
                      m: 0,
                      '& .MuiFormControlLabel-label': {
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }
                    }}
                  />
                ))
              )}
              {microsoftCalendarStore.error && (
                <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>
                  {microsoftCalendarStore.error}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Show message when no calendars are connected */}
        {!googleCalendarConnected && !microsoftCalendarConnected && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {intl.formatMessage({
                id: "calendar.noConnectedCalendars",
                defaultMessage: "Connect your calendars in Settings"
              })}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
