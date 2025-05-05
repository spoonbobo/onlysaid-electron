import { Box, Typography, IconButton } from "@mui/material";
import { useDebugStore } from "../../../stores/Debug/DebugStore";
import { useWindowStore } from "../../../stores/Topic/WindowStore";
import { useTopicStore } from "../../../stores/Topic/TopicStore";
import { useRef, useState } from "react";

export default function DebugOverlay() {
  const { tabs, activeTabId } = useWindowStore();
  const { selectedContext, contextParents } = useTopicStore();
  const { debugOverlayMinimized, setDebugOverlayMinimized } = useDebugStore();

  const renderCountRef = useRef(0);
  const [startTime] = useState(Date.now());

  // Increment render counter without causing re-renders
  renderCountRef.current += 1;

  const activeTab = tabs.find(tab => tab.id === activeTabId);
  const contextId = selectedContext ? `${selectedContext.name}:${selectedContext.type}` : 'none';
  const parentId = selectedContext ? contextParents[contextId] || 'none' : 'none';
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  return (
    <Box sx={{
      width: '100%',
      bgcolor: 'background.paper',
      borderRadius: 1,
      overflow: 'hidden',
      border: '1px solid rgba(0, 0, 0, 0.08)'
    }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 1,
        bgcolor: 'primary.light',
        color: 'primary.contrastText'
      }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
          Debug Info
        </Typography>
        <IconButton
          size="small"
          onClick={() => setDebugOverlayMinimized(!debugOverlayMinimized)}
          sx={{ color: 'inherit', p: 0.2, height: 20, width: 20 }}
        >
          {debugOverlayMinimized ? "+" : "-"}
        </IconButton>
      </Box>

      {!debugOverlayMinimized && (
        <Box sx={{ p: 1 }}>
          <InfoRow label="Active Tab" value={activeTab ? `${activeTab.title} (${activeTab.id.substring(0, 8)}...)` : 'None'} />
          <InfoRow label="Context" value={selectedContext ? `${selectedContext.name}:${selectedContext.type}` : 'None'} />
          <InfoRow label="Parent ID" value={parentId !== 'none' ? `${parentId.substring(0, 8)}...` : 'None'} />
          <InfoRow label="Tabs" value={`${tabs.length}`} />
          <InfoRow label="Renders" value={`${renderCountRef.current}`} />
          <InfoRow label="Uptime" value={`${uptime}s`} />
        </Box>
      )}
    </Box>
  );
}

function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
        {label}:
      </Typography>
      <Typography variant="caption" sx={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value}
      </Typography>
    </Box>
  );
}
