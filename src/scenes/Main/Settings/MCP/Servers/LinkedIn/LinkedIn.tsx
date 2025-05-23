import { LinkedIn } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface LinkedInServerProps {
  onConfigure: () => void;
  onReset?: () => void;
  isAutoApproved?: boolean;
  onAutoApprovalToggle?: (autoApproved: boolean) => void;
}

const LinkedInServer = ({
  onConfigure,
  onReset,
  isAutoApproved = false,
  onAutoApprovalToggle
}: LinkedInServerProps) => {
  const { setServerEnabled, isServerConfigured, getAllConfiguredServers } = useMCPStore();
  const servers = getAllConfiguredServers();
  const linkedInEnabled = servers.linkedIn?.enabled || false;
  const isConfigured = isServerConfigured('linkedIn');

  const handleToggle = (enabled: boolean) => {
    setServerEnabled('linkedIn', enabled);
  };

  const handleAutoApprovalToggle = (autoApproved: boolean) => {
    onAutoApprovalToggle?.(autoApproved);
  };

  return (
    <ServerCard
      title="LinkedIn MCP Server"
      description="MCP server for LinkedIn professional network integration."
      version="1.0.0"
      isEnabled={linkedInEnabled}
      isConfigured={isConfigured}
      isAutoApproved={isAutoApproved}
      onToggle={handleToggle}
      onAutoApprovalToggle={handleAutoApprovalToggle}
      onConfigure={onConfigure}
      onReset={onReset}
      icon={<LinkedIn />}
      sourceUrl="https://github.com/adhikasp/mcp-linkedin"
    />
  );
};

export default withReset(LinkedInServer, "linkedin");
