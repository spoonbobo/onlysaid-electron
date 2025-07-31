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
              defaultMessage: "⚠️ **No workspace selected**\n\nPlease select a workspace to access the Coursework Helper tools and features."
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
                    defaultMessage="Welcome to your Coursework Helper"
                  />
                </Typography>
                <MarkdownRenderer 
                  content={intl.formatMessage({
                    id: "workspace.mypartner.courseworkHelper.welcomeMessage",
                    defaultMessage: "This AI assistant is designed to help you with your **coursework**, **assignments**, and **academic tasks**.\n\n## Available Tools:\n\n### 📝 **Quiz Helper**\n- Generate practice questions from your knowledge base\n- Support for multiple choice, short answer, and true/false questions\n- AI-powered answer evaluation with detailed feedback\n- Mathematical expressions: *a = Δv/Δt*, *F = ma*, *E = mc²*\n\n### 📚 **Assignment Helper**\n- Get assistance with academic writing and research\n- Structured approach to complex assignments\n- Citation and reference support\n\n### 🔬 **Research Helper**\n- Advanced research and analysis tools\n- Literature review assistance\n- Data analysis and interpretation\n\n**Select a specific tool from the menu to get started!**"
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
              defaultMessage="Coursework Helper"
            />
          </Typography>
        </Box>
        <Box sx={{ mb: 3 }}>
          <MarkdownRenderer 
            content={intl.formatMessage({
              id: "workspace.mypartner.courseworkHelper.description",
              defaultMessage: "AI assistant for **coursework**, **assignments**, and **academic support**. Features include:\n\n• **Quiz Helper** - Generate practice questions from your knowledge base\n• **Assignment Helper** - Get assistance with academic tasks\n• **Research Helper** - Support for research and analysis\n\nSelect a tool from the menu to get started with your academic work."
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