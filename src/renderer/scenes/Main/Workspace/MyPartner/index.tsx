import { Box, Alert, Typography } from "@mui/material";
import { useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import CourseworkHelper from "./CourseworkHelper";

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
      case 'coursework-helper':
        return <CourseworkHelper workspaceId={workspaceId || ''} />;
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
    <Box sx={{ 
      height: "100%",
      overflow: "auto",
      bgcolor: "background.default"
    }}>
      {renderPartnerService()}
    </Box>
  );
}

export default MyPartner; 