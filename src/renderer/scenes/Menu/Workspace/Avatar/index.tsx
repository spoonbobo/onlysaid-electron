import { Box, Typography, List, Divider } from "@mui/material";
import { FormattedMessage } from "react-intl";
import BrushIcon from "@mui/icons-material/Brush";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { useAvatarStore } from "@/renderer/stores/Avatar/AvatarStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import MenuListItem from "@/renderer/components/Navigation/MenuListItem";
import AvatarChatMenu from "./Chat";

function AvatarMenu() {
  const { 
    selectedDesignSubsection,
    setSelectedDesignSubsection
  } = useAvatarStore();
  
  const { setSelectedTopic } = useTopicStore();
  const { selectedContext } = useCurrentTopicContext();

  const handleDesignSubsectionClick = (subsectionId: string) => {
    setSelectedDesignSubsection(subsectionId);
    // Update the topic store for main content navigation
    setSelectedTopic('workspace:avatar', `design:${subsectionId}`);
  };

  return (
    <Box sx={{ 
      height: 'calc(100vh - 200px)', // Take up available height minus header/footer space
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '400px' // Ensure minimum height
    }}>
      {/* Chat Menu - flexible content */}
      <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <AvatarChatMenu />
      </Box>

      {/* Design Buttons - Fixed at bottom */}
      <Box sx={{ 
        flexShrink: 0,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <List dense sx={{ py: 0 }}>
          <MenuListItem
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BrushIcon sx={{ mr: 1, fontSize: 'small' }} />
                <Typography variant="body2">
                  <FormattedMessage id="workspace.avatar.appearance" />
                </Typography>
              </Box>
            }
            isSelected={selectedDesignSubsection === 'appearance'}
            onClick={() => handleDesignSubsectionClick('appearance')}
            sx={{ py: 0.5, pl: 2 }}
          />
          
          <MenuListItem
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <VolumeUpIcon sx={{ mr: 1, fontSize: 'small' }} />
                <Typography variant="body2">
                  <FormattedMessage id="workspace.avatar.voice" />
                </Typography>
              </Box>
            }
            isSelected={selectedDesignSubsection === 'voice'}
            onClick={() => handleDesignSubsectionClick('voice')}
            sx={{ py: 0.5, pl: 2 }}
          />
        </List>
      </Box>
    </Box>
  );
}

export default AvatarMenu;
