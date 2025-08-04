import { Box, Typography, Card, CardContent, Alert } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import SchoolIcon from "@mui/icons-material/School";
import MarkdownRenderer from "@/renderer/components/Chat/MarkdownRenderer";
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
          <MarkdownRenderer 
            content={intl.formatMessage({
              id: "workspace.mypartner.courseworkHelper.noWorkspaceSelected",
            })}
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
                  />
                </Typography>
                <MarkdownRenderer 
                  content={intl.formatMessage({
                    id: "workspace.mypartner.courseworkHelper.welcomeMessage",
                  })}
                />
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
            />
          </Typography>
        </Box>
        <Box sx={{ mb: 3 }}>
          <MarkdownRenderer 
            content={intl.formatMessage({
              id: "workspace.mypartner.courseworkHelper.description",
            })}
          />
        </Box>
      </Box>

      {/* Tab Content */}
      {renderTabContent()}
    </Box>
  );
}

export default CourseworkHelper; 