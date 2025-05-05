import * as React from "react";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import { useWindowStore } from "@/stores/Topic/WindowStore";

function Calendar() {
  const [value, setValue] = React.useState<Dayjs | null>(dayjs());
  const { selectedContext, parentId } = useCurrentTopicContext();
  const { tabs } = useWindowStore();

  // Get the parent window/tab
  const parentTab = tabs.find(tab => tab.id === parentId);

  // Use the hierarchy information if needed
  // console.log(`Window: ${parentTab?.title} > Context: ${selectedContext?.name} > Calendar`);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DateCalendar
        value={value}
        onChange={setValue}
      />
    </LocalizationProvider>
  );
}

export default Calendar;
