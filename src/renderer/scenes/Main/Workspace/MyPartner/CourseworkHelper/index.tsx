import { Box, Typography, Card, CardContent, Alert } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import SchoolIcon from "@mui/icons-material/School";

interface CourseworkHelperProps {
  workspaceId: string;
}

function CourseworkHelper({ workspaceId }: CourseworkHelperProps) {
  const intl = useIntl();

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

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SchoolIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            <FormattedMessage 
              id="workspace.mypartner.courseworkHelper.title" 
              defaultMessage="Coursework Helper"
            />
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          <FormattedMessage 
            id="workspace.mypartner.courseworkHelper.description" 
            defaultMessage="AI assistant for coursework, assignments, and academic support"
          />
        </Typography>
      </Box>

      {/* Main Content */}
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
              defaultMessage="This AI assistant is designed to help you with your coursework, assignments, and academic tasks. Start by asking questions or uploading your course materials."
            />
          </Typography>
        </CardContent>
      </Card>

      {/* Features Coming Soon */}
      <Alert severity="info">
        <Typography variant="body2">
          <FormattedMessage 
            id="workspace.mypartner.courseworkHelper.comingSoon" 
            defaultMessage="Features coming soon: Assignment analysis, Citation help, Research assistance, Study planning, and more..."
          />
        </Typography>
      </Alert>
    </Box>
  );
}

export default CourseworkHelper; 