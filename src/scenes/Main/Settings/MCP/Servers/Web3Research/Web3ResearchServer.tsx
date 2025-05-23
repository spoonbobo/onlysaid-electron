import { Wallet } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface Web3ResearchServerProps {
  onConfigure: () => void;
  onReset?: () => void;
  isAutoApproved?: boolean;
  onAutoApprovalToggle?: (autoApproved: boolean) => void;
}

const Web3ResearchServer = ({
  onConfigure,
  onReset,
  isAutoApproved = false,
  onAutoApprovalToggle
}: Web3ResearchServerProps) => {
  const { setServerEnabled, isServerConfigured, getAllConfiguredServers } = useMCPStore();
  const servers = getAllConfiguredServers();
  const web3ResearchEnabled = servers.web3Research?.enabled || false;
  const isConfigured = isServerConfigured('web3Research');

  const handleToggle = (enabled: boolean) => {
    setServerEnabled('web3Research', enabled);
  };

  const handleAutoApprovalToggle = (autoApproved: boolean) => {
    onAutoApprovalToggle?.(autoApproved);
  };

  return (
    <ServerCard
      title="Web3 Research MCP"
      description="MCP server for Web3 and blockchain research capabilities."
      version="0.9.0"
      isEnabled={web3ResearchEnabled}
      isConfigured={isConfigured}
      isAutoApproved={isAutoApproved}
      onToggle={handleToggle}
      onAutoApprovalToggle={handleAutoApprovalToggle}
      onConfigure={onConfigure}
      onReset={onReset}
      icon={<Wallet />}
    />
  );
};

export default withReset(Web3ResearchServer, "web3-research");
