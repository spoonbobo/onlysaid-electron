import { Box, Typography, Paper } from "@mui/material";
import { useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useGoogleCalendarStore } from "@/renderer/stores/Google/GoogleCalendarStore";
import { useMicrosoftCalendarStore } from "@/renderer/stores/MSFT/MSFTCalendarStore";
import type { ICalendarEvent, ICalendar } from "@/../../types/Calendar/Calendar";

interface MonthViewProps {
  displayDate: Date;
  onEventClick: (event: React.MouseEvent<HTMLElement>, calendarEvent: ICalendarEvent) => void;
}

export default function MonthView({ displayDate, onEventClick }: MonthViewProps) {
  const intl = useIntl();
  const { setSelectedCalendarDate, setCalendarViewMode } = useTopicStore();

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

  const handleDayClick = (clickedDate: Date) => {
    setSelectedCalendarDate(new Date(clickedDate));
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

    calendarCellsData.push({
      day: cellDate.getDate(),
      isCurrentMonth: isCurrentMonthFlag,
      date: cellDate,
      isToday: isTodayFlag,
    });
    tempDate.setDate(tempDate.getDate() + 1);
  }

  const weeksToRender: typeof calendarCellsData[] = [];
  for (let i = 0; i < calendarCellsData.length; i += 7) {
    weeksToRender.push(calendarCellsData.slice(i, i + 7));
  }

  const getEventColor = (event: ICalendarEvent) => {
    const calendar = allCalendars.find(cal => cal.id === event.calendarId);
    return calendar?.color || (event.provider === 'outlook' ? '#0078d4' : '#1976d2');
  };

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
              // Get events for this day
              let dayEvents: any[] = [];
              if (cellData.date && cellData.isCurrentMonth) {
                const dayStart = new Date(cellData.date.getFullYear(), cellData.date.getMonth(), cellData.date.getDate());
                const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

                dayEvents = allEvents.filter(event => {
                  const eventStart = event.start.dateTime ? new Date(event.start.dateTime) :
                    event.start.date ? new Date(event.start.date) : null;
                  const eventEnd = event.end.dateTime ? new Date(event.end.dateTime) :
                    event.end.date ? new Date(event.end.date) : null;

                  if (!eventStart) return false;

                  return eventStart < dayEnd && (!eventEnd || eventEnd > dayStart);
                }).slice(0, 3); // Show max 3 events per day
              }

              return (
                <Box
                  key={cellData.date?.toISOString() || `empty-${weekIndex}-${dayIndex}`}
                  onClick={cellData.isCurrentMonth ? () => handleDayClick(cellData.date!) : undefined}
                  sx={{
                    p: 0.5,
                    borderRight: dayIndex < 6 ? 1 : 0,
                    borderColor: 'divider',
                    bgcolor: "background.paper",
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    minHeight: '100px',
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
                          width: 24,
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
                          p: '3px',
                          color: cellData.isCurrentMonth ? 'text.primary' : 'text.secondary',
                        }
                      }
                    >
                      {cellData.day}
                    </Typography>
                  </Box>

                  {/* Events for this day */}
                  {cellData.isCurrentMonth && (
                    <Box sx={{ flexGrow: 1, mt: 0.5, width: '100%', overflowY: 'hidden', p: 0.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      {dayEvents.map((event, eventIndex) => (
                        <Box
                          key={`${event.id}-${eventIndex}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(e, event);
                          }}
                          sx={{
                            backgroundColor: getEventColor(event),
                            color: 'white',
                            fontSize: '0.65rem',
                            height: 18,
                            maxWidth: '100%',
                            cursor: 'pointer',
                            borderRadius: '3px',
                            px: 0.5,
                            py: 0.25,
                            display: 'flex',
                            alignItems: 'center',
                            overflow: 'hidden',
                            '&:hover': {
                              opacity: 0.9,
                            }
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.65rem',
                              color: 'inherit',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              lineHeight: 1
                            }}
                          >
                            {event.summary}
                          </Typography>
                        </Box>
                      ))}
                      {allEvents.filter(event => {
                        if (!cellData.date) return false;
                        const dayStart = new Date(cellData.date.getFullYear(), cellData.date.getMonth(), cellData.date.getDate());
                        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

                        const eventStart = event.start.dateTime ? new Date(event.start.dateTime) :
                          event.start.date ? new Date(event.start.date) : null;
                        const eventEnd = event.end.dateTime ? new Date(event.end.dateTime) :
                          event.end.date ? new Date(event.end.date) : null;

                        if (!eventStart) return false;

                        return eventStart < dayEnd && (!eventEnd || eventEnd > dayStart);
                      }).length > 3 && (
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', textAlign: 'center' }}>
                            +{allEvents.filter(event => {
                              const dayStart = new Date(cellData.date!.getFullYear(), cellData.date!.getMonth(), cellData.date!.getDate());
                              const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

                              const eventStart = event.start.dateTime ? new Date(event.start.dateTime) :
                                event.start.date ? new Date(event.start.date) : null;
                              const eventEnd = event.end.dateTime ? new Date(event.end.dateTime) :
                                event.end.date ? new Date(event.end.date) : null;

                              if (!eventStart) return false;

                              return eventStart < dayEnd && (!eventEnd || eventEnd > dayStart);
                            }).length - 3} more
                          </Typography>
                        )}
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
