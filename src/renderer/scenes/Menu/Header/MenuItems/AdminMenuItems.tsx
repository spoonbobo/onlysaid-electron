import { MenuItem, ListSubheader, Divider } from "@mui/material";
import { FormattedMessage } from "react-intl";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import SchoolIcon from "@mui/icons-material/School";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";

type AdminMenuItemsProps = {
  handleClose: () => void;
};

function AdminMenuItems({ handleClose }: AdminMenuItemsProps) {
  const setSelectedContext = useTopicStore((state) => state.setSelectedContext);

  const handleNavigateToSection = (section: string) => {
    setSelectedContext({
      type: 'admin',
      name: 'admin',
      section: section
    });
    handleClose();
  };

  return (
    <>
      <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
        <FormattedMessage id="menu.admin" />
      </ListSubheader>

      <MenuItem onClick={() => handleNavigateToSection('dashboard')} sx={{ minHeight: 36, fontSize: 14 }}>
        <SupervisorAccountIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="admin.dashboard" />
      </MenuItem>

      <MenuItem onClick={() => handleNavigateToSection('lecturer-setup')} sx={{ minHeight: 36, fontSize: 14 }}>
        <SchoolIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="admin.lecturer.setup" />
      </MenuItem>
    </>
  );
}

// Add actions for admin sections
export const renderAdminActions = ({
  selectedSection,
  handleAction
}: {
  selectedSection: string | null,
  handleAction?: (action: string) => void
}) => {
  if (!selectedSection) return null;

  switch (selectedSection) {
    case 'dashboard':
      return null;
    case 'lecturer-setup':
      return null;
    default:
      return null;
  }
};

export default AdminMenuItems; 