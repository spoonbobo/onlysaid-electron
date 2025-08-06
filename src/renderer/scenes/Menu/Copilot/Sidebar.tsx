import React from 'react';
import { Box } from "@mui/material";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import CopilotMenu from "./index";

export default function CopilotSidebarMenu() {
  const { selectedContext } = useCurrentTopicContext();
  const section = selectedContext?.section || '';

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      p: 1 
    }}>
      {section.includes('copilot') && <CopilotMenu />}
    </Box>
  );
}