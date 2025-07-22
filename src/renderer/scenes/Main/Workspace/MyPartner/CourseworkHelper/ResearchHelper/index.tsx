import { Box, Typography, Card, CardContent, Alert } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";

interface ResearchHelperProps {
  workspaceId: string;
}

function ResearchHelper({ workspaceId }: ResearchHelperProps) {
  const intl = useIntl();

  return (
    <Box sx={{ p: 3, pt: 0 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <LibraryBooksIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">
              <FormattedMessage 
                id="workspace.mypartner.coursework.research.title" 
                defaultMessage="Research Helper"
              />
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            <FormattedMessage 
              id="workspace.mypartner.coursework.research.description" 
              defaultMessage="Research assistance, source finding, and literature review support."
            />
          </Typography>
          
          <Alert severity="warning">
            <Typography variant="body2">
              <FormattedMessage 
                id="workspace.mypartner.coursework.research.disabled" 
                defaultMessage="Research Helper is currently disabled. This feature is under development."
              />
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
}

export default ResearchHelper;