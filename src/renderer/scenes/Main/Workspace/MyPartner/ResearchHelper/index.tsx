import { Box, Typography, Card, CardContent, Alert } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";

interface ResearchHelperProps {
  workspaceId: string;
}

function ResearchHelper({ workspaceId }: ResearchHelperProps) {
  const intl = useIntl();

  if (!workspaceId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          <FormattedMessage 
            id="workspace.mypartner.research.noWorkspaceSelected" 
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
            <LibraryBooksIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">
              <FormattedMessage 
                id="workspace.mypartner.research.title" 
                defaultMessage="Research Helper"
              />
            </Typography>
          </Box>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            <FormattedMessage 
              id="workspace.mypartner.research.description" 
              defaultMessage="Get support with research methods, source finding, and academic investigation."
            />
          </Typography>

          <Alert severity="info">
            <FormattedMessage 
              id="workspace.mypartner.research.comingSoon" 
              defaultMessage="Research Helper functionality is coming soon! This will include assistance with topic exploration, literature search, source evaluation, citation help, and research methodology."
            />
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
}

export default ResearchHelper; 