import { Box, Alert, Typography } from "@mui/material";
import { useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import MoodleInsights from "./Moodle";
import MeetingSummarizer from "./Meetings";

function WorkspaceInsights() {
  const intl = useIntl();
  const { selectedContext, selectedTopics } = useTopicStore();
  const workspaceId = selectedContext?.id;
  const section = selectedContext?.section || '';
  
  // Get the selected insight service from the store
  const selectedInsightService = selectedTopics[section] || '';

  if (!workspaceId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          {intl.formatMessage({ id: "workspace.insights.noWorkspaceSelected", defaultMessage: "No workspace selected. Please select a workspace to view insights." })}
        </Alert>
      </Box>
    );
  }

  if (!selectedInsightService) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Typography variant="h5" sx={{ mb: 2, color: 'text.secondary' }}>
            {intl.formatMessage({ id: "workspace.insights.selectService", defaultMessage: "Select an Insight Service" })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {intl.formatMessage({ id: "workspace.insights.selectServiceDescription", defaultMessage: "Choose an insight service from the menu to get started with analytics and reporting." })}
          </Typography>
        </Box>
      </Box>
    );
  }

  const renderInsightService = () => {
    switch (selectedInsightService) {
      case 'moodle':
        return <MoodleInsights />;
      case 'meeting-summarizer':
        return <MeetingSummarizer />;
      default:
        return (
          <Box sx={{ p: 3 }}>
            <Alert severity="info">
              {intl.formatMessage(
                { id: "workspace.insights.serviceNotImplemented" },
                { service: selectedInsightService }
              )}
            </Alert>
          </Box>
        );
    }
  };

  return (
    <Box sx={{ 
      height: "100%",
      overflow: "auto",
      bgcolor: "background.default"
    }}>
      {renderInsightService()}
    </Box>
  );
}

export default WorkspaceInsights;
