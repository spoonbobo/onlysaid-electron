import { Box, Typography, Card, CardContent, Alert } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import AssignmentIcon from "@mui/icons-material/Assignment";

interface AssignmentHelperProps {
  workspaceId: string;
}

function AssignmentHelper({ workspaceId }: AssignmentHelperProps) {
  const intl = useIntl();

  return (
    <Box sx={{ p: 3, pt: 0 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AssignmentIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">
              <FormattedMessage 
                id="workspace.mypartner.coursework.assignments.title" 
                defaultMessage="Assignment Helper"
              />
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            <FormattedMessage 
              id="workspace.mypartner.coursework.assignments.description" 
              defaultMessage="Get help with your assignments, essays, and written work."
            />
          </Typography>
          
          <Alert severity="info">
            <Typography variant="body2">
              <FormattedMessage 
                id="workspace.mypartner.coursework.assignments.comingSoon" 
                defaultMessage="Assignment analysis, structure suggestions, citation help, and plagiarism checking coming soon..."
              />
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
}

export default AssignmentHelper;
