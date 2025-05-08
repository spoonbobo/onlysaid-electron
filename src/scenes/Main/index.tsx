import Chat from "./Chat";
import Settings from "./Settings";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { Box } from "@mui/material";

const menuComponents: Record<string, React.ReactNode> = {
    team: <Chat />,
    settings: <Settings />,
    home: <Chat />,
};

function Main() {
    const { selectedContext } = useTopicStore();

    // Use the selected context type or default to home
    const contextTypeToRender = selectedContext?.type || "home";

    return (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
                {menuComponents[contextTypeToRender] || menuComponents.home}
            </Box>
        </Box>
    );
}

export default Main;
