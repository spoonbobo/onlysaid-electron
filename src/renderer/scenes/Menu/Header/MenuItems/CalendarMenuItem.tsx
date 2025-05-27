import { MenuItem, ListSubheader, Box } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";

type CalendarMenuItemsProps = {
  handleClose: () => void;
};

function CalendarMenuItems({ handleClose }: CalendarMenuItemsProps) {
  const { setSelectedContext, selectedContext } = useTopicStore();

  const handleMenuItemClick = (section: string) => {
    const sectionId = `calendar:${section}`;

    setSelectedContext({
      ...selectedContext,
      name: "calendar",
      type: "calendar",
      section: sectionId
    });
    handleClose();
  };

  return (
    <>
      <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
        <FormattedMessage id="menu.calendar" />
      </ListSubheader>
      {/* No menu items yet - waiting for ideas */}
    </>
  );
}

export const RenderCalendarActions = ({
  selectedSection,
  handleAction
}: {
  selectedSection: string | null,
  handleAction?: (action: string) => void
}) => {
  // No actions yet - waiting for ideas
  return null;
};

export default CalendarMenuItems;
