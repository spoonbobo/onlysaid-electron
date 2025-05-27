import { Box, Typography, IconButton } from "@mui/material";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useRef, useState } from "react";

export default function ChatOverlay() {
  const {
    chats,
    activeChatByContext,
    isLoading,
    chatOverlayMinimized,
    setChatOverlayMinimized
  } = useChatStore();

  const renderCountRef = useRef(0);

  // Increment render counter without causing re-renders
  renderCountRef.current += 1;

  const activeChatCount = Object.values(activeChatByContext).filter(Boolean).length;
  const totalChats = chats.length;

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
        bgcolor: 'success.light',
        color: 'success.contrastText'
      }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
          Chat Info
        </Typography>
        <IconButton
          size="small"
          onClick={() => setChatOverlayMinimized(!chatOverlayMinimized)}
          sx={{ color: 'inherit', p: 0.2, height: 20, width: 20 }}
        >
          {chatOverlayMinimized ? "+" : "-"}
        </IconButton>
      </Box>

      {!chatOverlayMinimized && (
        <Box sx={{ p: 1 }}>
          <InfoRow label="Total Chats" value={`${totalChats}`} />
          <InfoRow label="Active Chats" value={`${activeChatCount}`} />
          <InfoRow label="Loading" value={isLoading ? "Yes" : "No"} />
          <InfoRow label="Renders" value={`${renderCountRef.current}`} />
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
