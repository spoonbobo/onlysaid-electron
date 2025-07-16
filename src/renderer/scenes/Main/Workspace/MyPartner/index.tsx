import { Box, Typography } from "@mui/material";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import CourseworkHelper from "./CourseworkHelper";

function MyPartner() {
  const { selectedContext, selectedTopics } = useCurrentTopicContext();
  const workspaceId = selectedContext?.id;
  const section = selectedContext?.section || '';
  const selectedSubcategory = section ? selectedTopics[section] || '' : '';

  const renderContent = () => {
    switch (selectedSubcategory) {
      case 'coursework-helper':
        return <CourseworkHelper workspaceId={workspaceId || ''} />;
      default:
        return (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              My Partner
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Select a partner service from the menu to get started.
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Box sx={{ height: "100%", overflow: "auto" }}>
      {renderContent()}
    </Box>
  );
}

export default MyPartner; 