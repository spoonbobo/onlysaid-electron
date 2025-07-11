import React from 'react';
import { Box, Typography } from "@mui/material";
import { useThreeStore } from "@/renderer/stores/Avatar/ThreeStore";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import Avatar3DRender from "../3DRender";
import Chat from "@/renderer/scenes/Main/Chat";

function AvatarDisplay() {
  const { selectedModel, getModelById } = useThreeStore();
  const currentModel = getModelById(selectedModel || 'alice-3d');

  return (
    <Box sx={{ height: '100%', display: 'flex', p: 2, gap: 2 }}>
      {/* Avatar Display - 35% of screen */}
      <Box sx={{ 
        width: '35%',
        display: 'flex', 
        flexDirection: 'column',
        gap: 2
      }}>
        {/* 3D Avatar */}
        <Box sx={{ 
          flex: 1,
          position: 'relative',
          minHeight: 400
        }}>
          <Avatar3DRender 
            width={undefined} 
            height={undefined}
            showName={false} 
            showPreviewText={false}
            enableControls={true}
            autoRotate={true}
          />
          
          {/* Status Indicator with Avatar Name */}
          <Box sx={{ 
            position: 'absolute', 
            top: 12, 
            right: 12, 
            bgcolor: 'success.main', 
            color: 'white', 
            px: 1.5, 
            py: 0.5, 
            borderRadius: 1.5,
            fontSize: '0.75rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}>
            <Box sx={{ 
              width: 6, 
              height: 6, 
              borderRadius: '50%', 
              bgcolor: 'white',
              animation: 'pulse 2s infinite'
            }} />
            <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
              {currentModel?.name || 'Avatar'} • ACTIVE
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Chat Component - 65% of screen */}
      <Box sx={{ 
        width: '65%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden'
      }}>
        <Chat />
      </Box>
    </Box>
  );
}

export default AvatarDisplay; 