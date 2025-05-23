import { DeliveryDining } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface DoorDashServerProps {
  onConfigure: () => void;
  onReset?: () => void;
  isAutoApproved?: boolean;
  onAutoApprovalToggle?: (autoApproved: boolean) => void;
}

const DoorDashServer = ({
  onConfigure,
  onReset,
  isAutoApproved = false,
  onAutoApprovalToggle
}: DoorDashServerProps) => {
  const { setServerEnabled, isServerConfigured, getAllConfiguredServers } = useMCPStore();
  const servers = getAllConfiguredServers();
  const doorDashEnabled = servers.doorDash?.enabled || false;
  const isConfigured = isServerConfigured('doorDash');

  const handleToggle = (enabled: boolean) => {
    setServerEnabled('doorDash', enabled);
  };

  const handleAutoApprovalToggle = (autoApproved: boolean) => {
    onAutoApprovalToggle?.(autoApproved);
  };

  return (
    <ServerCard
      title="DoorDash MCP Server"
      description="MCP server for food delivery integration with DoorDash."
      version="1.1.0"
      isEnabled={doorDashEnabled}
      isConfigured={isConfigured}
      isAutoApproved={isAutoApproved}
      onToggle={handleToggle}
      onAutoApprovalToggle={handleAutoApprovalToggle}
      onConfigure={onConfigure}
      onReset={onReset}
      icon={<DeliveryDining />}
    />
  );
};

export default withReset(DoorDashServer, "doordash");
