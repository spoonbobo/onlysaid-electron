import { LocationSearching } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface NearbySearchServerProps {
  onConfigure: () => void;
  onReset?: () => void;
  isAutoApproved?: boolean;
  onAutoApprovalToggle?: (autoApproved: boolean) => void;
}

const NearbySearchServer = ({
  onConfigure,
  onReset,
  isAutoApproved = false,
  onAutoApprovalToggle
}: NearbySearchServerProps) => {
  const { setServerEnabled, isServerConfigured, getAllConfiguredServers } = useMCPStore();
  const servers = getAllConfiguredServers();
  const nearbySearchEnabled = servers.nearbySearch?.enabled || false;
  const isConfigured = isServerConfigured('nearbySearch');

  const handleToggle = (enabled: boolean) => {
    setServerEnabled('nearbySearch', enabled);
  };

  const handleAutoApprovalToggle = (autoApproved: boolean) => {
    onAutoApprovalToggle?.(autoApproved);
  };

  return (
    <ServerCard
      title="Nearby Search MCP"
      description="MCP server for nearby place searches with IP-based location detection. Uses Google Places API."
      version="1.0.0"
      isEnabled={nearbySearchEnabled}
      isConfigured={isConfigured}
      isAutoApproved={isAutoApproved}
      onToggle={handleToggle}
      onAutoApprovalToggle={handleAutoApprovalToggle}
      onConfigure={onConfigure}
      onReset={onReset}
      icon={<LocationSearching />}
      sourceUrl="https://github.com/kukapay/nearby-search-mcp"
    />
  );
};

export default withReset(NearbySearchServer, "nearby-search");
