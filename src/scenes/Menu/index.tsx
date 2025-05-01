import { Box, Typography } from "@mui/material";
import Chatroom from "./Chatroom";
import UserSettings from "./Settings/UserSettings";
import { useIntl } from "../../providers/IntlProvider";
import { useTopicStore } from "../../stores/Topic/TopicStore";
import { useCurrentTopicContext } from "../../stores/Topic/TopicStore";
import { FormattedMessage } from "react-intl";

const menuComponentMap: Record<string, React.ReactNode> = {
  team: <Chatroom />,
  settings: <UserSettings />,
};

function Menu() {
  const intl = useIntl();
  const selectedContext = useTopicStore((state) => state.selectedContext);
  const selectedContextType = selectedContext?.type || "";
  console.log(selectedContext?.name);

  const ContentComponent = menuComponentMap[selectedContextType] || (
    <Box p={2}>Select a menu item</Box>
  );

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          <FormattedMessage id={`menu.${selectedContext?.name}`} />
        </Typography>
      </Box>
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {ContentComponent}
      </Box>
    </Box>
  );
}

export default Menu;