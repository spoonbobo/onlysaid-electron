import { Box, Typography, IconButton } from "@mui/material";
import { useState } from "react";
import { useIntl } from "react-intl";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useTopicStore, useSelectedCalendarDate } from "../../../../stores/Topic/TopicStore"; // Import store and selector

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
  const selectedDate = useSelectedCalendarDate(); // Get the currently selected Date object or null

  const handleDayClick = (date: Date | null) => {
    if (date) {
      setSelectedCalendarDate(date);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDisplayDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(1); // Avoid issues with day numbers when changing months
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentDisplayDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(1); // Avoid issues with day numbers when changing months
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const currentMonth = currentDisplayDate.getMonth();
  const currentYear = currentDisplayDate.getFullYear();

  // Days of the week starting with Monday, as per the image
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
  // Adjust startingDay for Monday-first week (0=Sun, 1=Mon, ..., 6=Sat)
  let startingDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday...
  let blankCellsBefore = (startingDayOfWeek === 0) ? 6 : startingDayOfWeek - 1; // Monday is 0 blanks

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

  // Fill remaining cells to make a full grid (optional, but good for consistent layout)
  const totalCells = 42; // Max 6 weeks * 7 days
  while (calendarDays.length < totalCells && calendarDays.length % 7 !== 0) {
    calendarDays.push({ dayOfMonth: null, isToday: false, date: null });
  }

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }
  // Trim empty weeks from the end if they are all null, but ensure at least 5 weeks for stability.
  while (weeks.length > 5 && weeks[weeks.length - 1].every(day => day.dayOfMonth === null)) {
    weeks.pop();
  }


  const monthYearFormatOptions: Intl.DateTimeFormatOptions = { month: 'numeric', year: 'numeric' };
  // For "YYYY年M月" format, we might need specific handling if intl.locale doesn't directly support it.
  // Using a template for now, assuming intl.locale is 'ja' or 'zh' which might produce something close.
  // A more robust solution might involve custom formatting based on locale.
  let formattedMonthYear = new Intl.DateTimeFormat(intl.locale, monthYearFormatOptions).format(currentDisplayDate);
  if (intl.locale.startsWith('ja') || intl.locale.startsWith('zh')) {
    formattedMonthYear = `${currentYear}${intl.formatMessage({ id: "calendar.yearLabel", defaultMessage: "年" })}${currentMonth + 1}${intl.formatMessage({ id: "calendar.monthLabel", defaultMessage: "月" })}`;
  }


  return (
    <Box sx={{ p: 1, width: '100%', maxWidth: 280, margin: 'auto' }}> {/* Compact size */}
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

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" }}>
        {daysOfWeekMenu.map(day => (
          <Typography key={day} variant="caption" sx={{ p: 0.5, color: 'text.secondary' }}>
            {day}
          </Typography>
        ))}
      </Box>

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
    </Box>
  );
}