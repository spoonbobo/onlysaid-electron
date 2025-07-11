import { MenuItem, ListSubheader } from "@mui/material";
import { FormattedMessage } from "react-intl";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AppsIcon from "@mui/icons-material/Apps";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";

type PortalMenuItemsProps = {
  handleClose: () => void;
};

function PortalMenuItems({ handleClose }: PortalMenuItemsProps) {
  const setSelectedContext = useTopicStore((state) => state.setSelectedContext);

  const handleNavigateToSection = (section: string) => {
    setSelectedContext({
      type: 'portal',
      name: 'portal',
      section: section
    });
    handleClose();
  };

  return (
    <>
      <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
        <FormattedMessage id="menu.portal" />
      </ListSubheader>

      <MenuItem onClick={() => handleNavigateToSection('dashboard')} sx={{ minHeight: 36, fontSize: 14 }}>
        <DashboardIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="portal.dashboard" />
      </MenuItem>

      <MenuItem onClick={() => handleNavigateToSection('services')} sx={{ minHeight: 36, fontSize: 14 }}>
        <AppsIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="portal.services" />
      </MenuItem>
    </>
  );
}

// Add actions for portal sections
export const renderPortalActions = ({
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
    case 'services':
      return null;
    default:
      return null;
  }
};

export default PortalMenuItems;
