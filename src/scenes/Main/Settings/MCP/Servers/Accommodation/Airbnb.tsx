import { WbSunny } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface AirbnbServerProps {
  onConfigure: () => void;
  onReset?: () => void;
  isAutoApproved?: boolean;
  onAutoApprovalToggle?: (autoApproved: boolean) => void;
}

const AirbnbServer = ({
  onConfigure,
  onReset,
  isAutoApproved = false,
  onAutoApprovalToggle
}: AirbnbServerProps) => {
  const { setServerEnabled, isServerConfigured, getAllConfiguredServers } = useMCPStore();
  const servers = getAllConfiguredServers();
  const airbnbEnabled = servers.airbnb?.enabled || false;
  const isConfigured = isServerConfigured('airbnb');

  const handleToggle = (enabled: boolean) => {
    setServerEnabled('airbnb', enabled);
  };

  const handleAutoApprovalToggle = (autoApproved: boolean) => {
    onAutoApprovalToggle?.(autoApproved);
  };

  return (
    <ServerCard
      title="Airbnb MCP Server"
      description="MCP Server for searching Airbnb and get listing details."
      version="unknown"
      isEnabled={airbnbEnabled}
      isConfigured={isConfigured}
      isAutoApproved={isAutoApproved}
      onToggle={handleToggle}
      onAutoApprovalToggle={handleAutoApprovalToggle}
      onConfigure={onConfigure}
      onReset={onReset}
      icon={<WbSunny />}
      sourceUrl="https://github.com/openbnb-org/mcp-server-airbnb"
    />
  );
};

// Enhance AirbnbServer with reset and auto-approval functionality
export default withReset(AirbnbServer, "airbnb");
