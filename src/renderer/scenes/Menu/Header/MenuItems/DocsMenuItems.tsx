import { MenuItem, ListSubheader } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import StorageIcon from "@mui/icons-material/Storage";
import BugReportIcon from "@mui/icons-material/BugReport";

type DocsMenuItemsProps = {
  handleClose: () => void;
};

function DocsMenuItems({ handleClose }: DocsMenuItemsProps) {
  const setSelectedContext = useTopicStore((state) => state.setSelectedContext);

  const handleNavigateToSection = (section: string) => {
    setSelectedContext({
      type: 'docs',
      name: 'docs',
      section: section
    });
    handleClose();
  };

  return (
    <>
      <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
        <FormattedMessage id="menu.docs" defaultMessage="Documentation" />
      </ListSubheader>
      
      <MenuItem onClick={() => handleNavigateToSection('knowledgeBase')} sx={{ minHeight: 36, fontSize: 14 }}>
        <StorageIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="docs.knowledgeBase" defaultMessage="Knowledge Base Testing" />
      </MenuItem>

      <MenuItem onClick={() => handleNavigateToSection('mcp-tools')} sx={{ minHeight: 36, fontSize: 14 }}>
        <BugReportIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="docs.mcpTools" defaultMessage="MCP Tools & Testing" />
      </MenuItem>
    </>
  );
}

export const renderDocsActions = ({ selectedSection, handleAction }: { selectedSection: string, handleAction: (action: string) => void }) => {
  // No specific actions needed for docs sections yet
  return null;
};

export default DocsMenuItems;
