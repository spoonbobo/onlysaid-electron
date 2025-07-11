import { Box, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import SchoolIcon from "@mui/icons-material/School";
import { useUserStore } from "@/renderer/stores/User/UserStore";

function AdminPanel() {
  const selectedContext = useTopicStore((state) => state.selectedContext);
  const user = useUserStore((state) => state.user);
  const selectedSection = selectedContext?.section;

  // Check if user has admin privileges (you can modify this logic)
  const isAdmin = true;

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          <FormattedMessage id="admin.access.denied" />
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <FormattedMessage id="admin.access.denied.description" />
        </Typography>
      </Box>
    );
  }

  const renderDashboard = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <SupervisorAccountIcon sx={{ mr: 1 }} />
        <FormattedMessage id="admin.dashboard" />
      </Typography>
    </Box>
  );

  const renderLecturerSetup = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <SchoolIcon sx={{ mr: 1 }} />
        <FormattedMessage id="admin.lecturer.setup" />
      </Typography>
      <Typography variant="body1" color="text.secondary">
        <FormattedMessage id="admin.lecturer.setup.placeholder" />
      </Typography>
    </Box>
  );

  const renderContent = () => {
    switch (selectedSection) {
      case 'dashboard':
        return renderDashboard();
      case 'lecturer-setup':
        return renderLecturerSetup();
      default:
        return renderDashboard();
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {renderContent()}
    </Box>
  );
}

export default AdminPanel;
