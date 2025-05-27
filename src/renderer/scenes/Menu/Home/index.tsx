import { Box } from "@mui/material";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import AgentsMenu from "./Agents";
import FriendsMenu from "./Friends";

export default function HomeMenu() {
  const selectedContext = useTopicStore((state) => state.selectedContext);

  const activeSection = selectedContext?.type === 'home'
    ? selectedContext.section || 'agents'
    : null;

  const contextId = selectedContext ? `${selectedContext.name}:${selectedContext.type}` : '';
  const menuKey = `${contextId}`;

  return (
    <Box key={menuKey}>
      {activeSection === 'agents' && <AgentsMenu />}
      {activeSection === 'friends' && <FriendsMenu />}
    </Box>
  );
}
