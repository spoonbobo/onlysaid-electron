import { GitHub } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface GitHubServerProps {
  onConfigure: () => void;
  onReset?: () => void;
  isAutoApproved?: boolean;
  onAutoApprovalToggle?: (autoApproved: boolean) => void;
}

const GitHubServer = ({
  onConfigure,
  onReset,
  isAutoApproved = false,
  onAutoApprovalToggle
}: GitHubServerProps) => {
  const { setServerEnabled, isServerConfigured, getAllConfiguredServers } = useMCPStore();
  const servers = getAllConfiguredServers();
  const gitHubEnabled = servers.github?.enabled || false;
  const isConfigured = isServerConfigured('github');

  const handleToggle = (enabled: boolean) => {
    setServerEnabled('github', enabled);
  };

  const handleAutoApprovalToggle = (autoApproved: boolean) => {
    onAutoApprovalToggle?.(autoApproved);
  };

  return (
    <ServerCard
      title="GitHub MCP Server (Docker Required)"
      description="MCP server for GitHub repository management and code access."
      version="0.2.1"
      isEnabled={gitHubEnabled}
      isConfigured={isConfigured}
      isAutoApproved={isAutoApproved}
      onToggle={handleToggle}
      onAutoApprovalToggle={handleAutoApprovalToggle}
      onConfigure={onConfigure}
      onReset={onReset}
      icon={<GitHub />}
      sourceUrl="https://github.com/github/github-mcp-server"
    />
  );
};

export default withReset(GitHubServer, "github");
