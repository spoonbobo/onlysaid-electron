import { LocationOn } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface LocationServerProps {
  onConfigure: () => void;
  onReset?: () => void;
  isAutoApproved?: boolean;
  onAutoApprovalToggle?: (autoApproved: boolean) => void;
}

const LocationServer = ({
  onConfigure,
  onReset,
  isAutoApproved = false,
  onAutoApprovalToggle
}: LocationServerProps) => {
  const { setServerEnabled, isServerConfigured, getAllConfiguredServers } = useMCPStore();
  const servers = getAllConfiguredServers();
  const locationEnabled = servers.location?.enabled || false;
  const isConfigured = isServerConfigured('location');

  const handleToggle = (enabled: boolean) => {
    setServerEnabled('location', enabled);
  };

  const handleAutoApprovalToggle = (autoApproved: boolean) => {
    onAutoApprovalToggle?.(autoApproved);
  };

  return (
    <ServerCard
      title="open-streetmap-mcp"
      description="An OpenStreetMap MCP server implementation that enhances LLM capabilities with location-based services and geospatial data."
      version="unknown"
      isEnabled={locationEnabled}
      isConfigured={isConfigured}
      isAutoApproved={isAutoApproved}
      onToggle={handleToggle}
      onAutoApprovalToggle={handleAutoApprovalToggle}
      onConfigure={onConfigure}
      onReset={onReset}
      icon={<LocationOn />}
      sourceUrl="https://github.com/jagan-shanmugam/open-streetmap-mcp"
    />
  );
};

export default withReset(LocationServer, "location");
