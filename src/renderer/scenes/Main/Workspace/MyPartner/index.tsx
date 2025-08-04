import { Box, Alert, Typography } from "@mui/material";
import { useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import AssignmentHelper from "./AssignmentHelper";
import QuizHelper from "./QuizHelper";
import ResearchHelper from "./ResearchHelper";

function MyPartner() {
  const intl = useIntl();
  const { selectedContext, selectedTopics } = useTopicStore();
  const workspaceId = selectedContext?.id;
  const section = selectedContext?.section || '';
  
  // Get the selected partner service from the store
  const selectedPartnerService = selectedTopics[section] || '';

  if (!workspaceId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          {intl.formatMessage({ id: "workspace.mypartner.noWorkspaceSelected", defaultMessage: "No workspace selected. Please select a workspace to access partner services." })}
        </Alert>
      </Box>
    );
  }

  if (!selectedPartnerService) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Typography variant="h5" sx={{ mb: 2, color: 'text.secondary' }}>
            {intl.formatMessage({ id: "workspace.mypartner.selectService", defaultMessage: "Select a Partner Service" })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {intl.formatMessage({ id: "workspace.mypartner.selectServiceDescription", defaultMessage: "Choose a partner service from the menu to get started with AI-powered academic assistance." })}
          </Typography>
        </Box>
      </Box>
    );
  }

  const renderPartnerService = () => {
    switch (selectedPartnerService) {
      case 'assignment':
        return <AssignmentHelper workspaceId={workspaceId || ''} />;
      case 'quiz-helper':
        return <QuizHelper workspaceId={workspaceId || ''} />;
      case 'research':
        return <ResearchHelper workspaceId={workspaceId || ''} />;
      // Keep backward compatibility for old coursework-helper
      case 'coursework-helper':
        return <QuizHelper workspaceId={workspaceId || ''} />;
      default:
        return (
          <Box sx={{ p: 3 }}>
            <Alert severity="info">
              {intl.formatMessage(
                { id: "workspace.mypartner.serviceNotImplemented", defaultMessage: "Service '{service}' is not yet implemented." },
                { service: selectedPartnerService }
              )}
            </Alert>
          </Box>
        );
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {renderPartnerService()}
    </Box>
  );
}

export default MyPartner; 