import { Box, Typography, Paper, Divider } from "@mui/material";
import { FormattedMessage } from "react-intl";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

interface CalendarProps {
    workspaceName?: string;
}

function Calendar({ workspaceName = "Workspace" }: CalendarProps) {
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Get the first day of the month
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const startingDay = firstDayOfMonth.getDay();

    // Get the number of days in the month
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // Create calendar days
    const calendarDays = [];
    let dayCount = 1;

    // Create blanks for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
        calendarDays.push(null);
    }

    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(i);
    }

    // Create weeks for the calendar
    const weeks = [];
    let week = [];

    calendarDays.forEach((day, index) => {
        week.push(day);
        if (index % 7 === 6 || index === calendarDays.length - 1) {
            weeks.push([...week]);
            week = [];
        }
    });

    return (
        <Box sx={{ p: 3, height: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <CalendarMonthIcon sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="h5" component="h1" fontWeight={600}>
                    {workspaceName} <FormattedMessage id="workspace.calendar.title" defaultMessage="Calendar" />
                </Typography>
            </Box>

            <Typography variant="subtitle1" gutterBottom>
                {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate)}
            </Typography>

            <Paper elevation={2} sx={{ mt: 2, overflow: "hidden" }}>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                    {daysOfWeek.map(day => (
                        <Box key={day} sx={{ p: 1, textAlign: "center", fontWeight: "bold", bgcolor: "primary.light", color: "primary.contrastText" }}>
                            {day}
                        </Box>
                    ))}
                </Box>
                <Divider />
                {weeks.map((week, weekIndex) => (
                    <Box key={`week-${weekIndex}`} sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                        {week.map((day, dayIndex) => (
                            <Box
                                key={`day-${weekIndex}-${dayIndex}`}
                                sx={{
                                    p: 2,
                                    height: 60,
                                    textAlign: "center",
                                    borderRight: dayIndex < 6 ? 1 : 0,
                                    borderBottom: 1,
                                    borderColor: "divider",
                                    bgcolor: day === currentDate.getDate() ? "primary.50" : "background.paper",
                                    fontWeight: day === currentDate.getDate() ? "bold" : "normal"
                                }}
                            >
                                {day}
                            </Box>
                        ))}
                    </Box>
                ))}
            </Paper>
        </Box>
    );
}

export default Calendar;
