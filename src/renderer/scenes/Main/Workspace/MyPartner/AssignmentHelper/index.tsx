import { Box, Typography, Card, CardContent, Alert } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import AssignmentIcon from "@mui/icons-material/Assignment";

interface AssignmentHelperProps {
  workspaceId: string;
}

function AssignmentHelper({ workspaceId }: AssignmentHelperProps) {
  const intl = useIntl();

  if (!workspaceId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          <FormattedMessage 
            id="workspace.mypartner.assignment.noWorkspaceSelected" 
            defaultMessage="No workspace selected"
          />
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, pt: 0 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AssignmentIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">
              <FormattedMessage 
                id="workspace.mypartner.assignment.title" 
                defaultMessage="Assignment Helper"
              />
            </Typography>
          </Box>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            <FormattedMessage 
              id="workspace.mypartner.assignment.description" 
              defaultMessage="Get help with various types of assignments and academic writing tasks."
            />
          </Typography>

          <Alert severity="info">
            <FormattedMessage 
              id="workspace.mypartner.assignment.comingSoon" 
              defaultMessage="Assignment Helper functionality is coming soon! This will include assistance with essay writing, research papers, project proposals, literature reviews, and case studies."
            />
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
}

export default AssignmentHelper; 