import { Box, Typography, Card, CardContent, Alert } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import SchoolIcon from "@mui/icons-material/School";
import AssignmentHelper from "./AssignmentHelper";
import QuizHelper from "./QuizHelper";
import ResearchHelper from "./ResearchHelper";

interface CourseworkHelperProps {
  workspaceId: string;
}

function CourseworkHelper({ workspaceId }: CourseworkHelperProps) {
  const intl = useIntl();
  const { selectedTopics } = useTopicStore();
  
  // Get the selected tab from the coursework helper tabs
  const selectedTab = selectedTopics['coursework-helper-tabs'] || 'assignments';

  if (!workspaceId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          <FormattedMessage 
            id="workspace.mypartner.courseworkHelper.noWorkspaceSelected" 
            defaultMessage="No workspace selected"
          />
        </Alert>
      </Box>
    );
  }

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'assignments':
        return <AssignmentHelper workspaceId={workspaceId} />;
      case 'quiz-help':
        return <QuizHelper workspaceId={workspaceId} />;
      case 'research':
        return <ResearchHelper workspaceId={workspaceId} />;
      default:
        return (
          <Box sx={{ p: 3 }}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <FormattedMessage 
                    id="workspace.mypartner.courseworkHelper.welcomeTitle" 
                    defaultMessage="Welcome to your Coursework Helper"
                  />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <FormattedMessage 
                    id="workspace.mypartner.courseworkHelper.welcomeMessage" 
                    defaultMessage="This AI assistant is designed to help you with your coursework, assignments, and academic tasks. Select a specific tool from the menu to get started."
                  />
                </Typography>
              </CardContent>
            </Card>
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
      {/* Header */}
      <Box sx={{ p: 3, pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SchoolIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            <FormattedMessage 
              id="workspace.mypartner.courseworkHelper.title" 
              defaultMessage="Coursework Helper"
            />
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          <FormattedMessage 
            id="workspace.mypartner.courseworkHelper.description" 
            defaultMessage="AI assistant for coursework, assignments, and academic support"
          />
        </Typography>
      </Box>

      {/* Tab Content */}
      {renderTabContent()}
    </Box>
  );
}

export default CourseworkHelper; 