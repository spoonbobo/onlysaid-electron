import { Box, Typography, Paper, Card, CardContent } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AppsIcon from "@mui/icons-material/Apps";

function Portal() {
  const selectedContext = useTopicStore((state) => state.selectedContext);
  const selectedSection = selectedContext?.section;

  const renderDashboard = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <FormattedMessage id="portal.dashboard" />
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        <FormattedMessage id="portal.dashboard.description" />
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DashboardIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  <FormattedMessage id="portal.overview" />
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                <FormattedMessage id="portal.overview.description" />
              </Typography>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AppsIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  <FormattedMessage id="portal.quickAccess" />
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                <FormattedMessage id="portal.quickAccess.description" />
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );

  const renderServices = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <FormattedMessage id="portal.services" />
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        <FormattedMessage id="portal.services.description" />
      </Typography>
      
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <AppsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          <FormattedMessage id="portal.services.placeholder" />
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage id="portal.services.placeholder.description" />
        </Typography>
      </Paper>
    </Box>
  );

  const renderDefault = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <FormattedMessage id="menu.portal" />
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        <FormattedMessage id="portal.welcome" />
      </Typography>
      
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <DashboardIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          <FormattedMessage id="portal.getStarted" />
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage id="portal.getStarted.description" />
        </Typography>
      </Paper>
    </Box>
  );

  const renderContent = () => {
    switch (selectedSection) {
      case 'dashboard':
        return renderDashboard();
      case 'services':
        return renderServices();
      default:
        return renderDefault();
    }
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {renderContent()}
      </Box>
    </Box>
  );
}

export default Portal;
