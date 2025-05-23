import { Search } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface TavilyServerProps {
  onConfigure: () => void;
  onReset?: () => void;
  isAutoApproved?: boolean;
  onAutoApprovalToggle?: (autoApproved: boolean) => void;
}

const TavilyServer = ({
  onConfigure,
  onReset,
  isAutoApproved = false,
  onAutoApprovalToggle
}: TavilyServerProps) => {
  const { setServerEnabled, isServerConfigured, getAllConfiguredServers } = useMCPStore();
  const servers = getAllConfiguredServers();
  const tavilyEnabled = servers.tavily?.enabled || false;
  const isConfigured = isServerConfigured('tavily');

  const handleToggle = (enabled: boolean) => {
    setServerEnabled('tavily', enabled);
  };

  const handleAutoApprovalToggle = (autoApproved: boolean) => {
    onAutoApprovalToggle?.(autoApproved);
  };

  return (
    <ServerCard
      title="Tavily Web Search MCP Server"
      description="MCP server for Tavily AI-powered web search integration."
      version="unknown"
      isEnabled={tavilyEnabled}
      isConfigured={isConfigured}
      isAutoApproved={isAutoApproved}
      onToggle={handleToggle}
      onAutoApprovalToggle={handleAutoApprovalToggle}
      onConfigure={onConfigure}
      onReset={onReset}
      icon={<Search />}
      sourceUrl="https://github.com/tavily-ai/tavily-mcp"
    />
  );
};

export default withReset(TavilyServer, "tavily");
