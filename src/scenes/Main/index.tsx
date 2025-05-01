import Chatroom from "./Chatroom";
import Settings from "./Settings";
import { useTopicStore } from "../../stores/Topic/TopicStore";
import { Box, Typography } from "@mui/material";

const menuComponents: Record<string, React.ReactNode> = {
  team: <Chatroom />,
  settings: <Settings />,
  home: <Chatroom />,
};

function Main() {
  const selectedContext = useTopicStore((state) => state.selectedContext);
  console.log(selectedContext?.name);
  console.log("menuComponents mapping:", {
    team: menuComponents.team,
    settings: menuComponents.settings,
    home: menuComponents.home
  });

  console.log("Selected context:", selectedContext);
  console.log("Component being rendered:", menuComponents[selectedContext?.type || ""]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          {selectedContext?.name ? selectedContext.name.charAt(0).toUpperCase() + selectedContext.name.slice(1) : ""}
        </Typography>
      </Box>
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {menuComponents[selectedContext?.type || ""] || null}
      </Box>
    </Box>
  );
}

export default Main;