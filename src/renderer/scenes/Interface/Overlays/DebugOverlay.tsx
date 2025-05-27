import { Box, Typography, IconButton } from "@mui/material";
import { useDebugStore } from "@/renderer/stores/Debug/DebugStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useRef, useState } from "react";

interface DebugOverlayProps {
  mainInterfaceRenderCount: number;
}

export default function DebugOverlay({ mainInterfaceRenderCount }: DebugOverlayProps) {
  const { selectedContext, lastSections, selectedTopics } = useTopicStore();
  const { debugOverlayMinimized, setDebugOverlayMinimized } = useDebugStore();

  const renderCountRef = useRef(0);
  const [startTime] = useState(Date.now());

  // Increment render counter without causing re-renders
  renderCountRef.current += 1;

  const contextId = selectedContext ? `${selectedContext.name}:${selectedContext.type}` : 'none';
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
          <InfoRow
            label="Current Context"
            value={selectedContext
              ? (selectedContext.type === "workspace"
                ? `${selectedContext.id}:workspace`
                : `${selectedContext.name}:${selectedContext.type}`)
              : 'None'}
          />
          <InfoRow label="Context ID" value={selectedContext?.id || contextId || 'None'} />
          <InfoRow label="Section" value={selectedContext?.section || 'None'} />
          <InfoRow label="Last Section" value={selectedContext?.type ? lastSections[selectedContext.type] || 'None' : 'None'} />
          <InfoRow label="Selected Topic" value={selectedContext?.section ? selectedTopics[selectedContext.section] || 'None' : 'None'} />
          <InfoRow label="DebugOverlay Renders" value={`${renderCountRef.current}`} />
          <InfoRow label="MainIF Renders" value={`${mainInterfaceRenderCount}`} />
          <InfoRow label="Uptime" value={`${uptime}s`} />
        </Box>
      )}
    </Box>
  );
}

export function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
        {label}:
      </Typography>
      <Typography variant="caption" sx={{
        maxWidth: '150px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        userSelect: 'text'
      }}>
        {value}
      </Typography>
    </Box>
  );
}
