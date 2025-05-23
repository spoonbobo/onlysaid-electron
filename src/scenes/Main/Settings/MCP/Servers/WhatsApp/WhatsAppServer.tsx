import { WhatsApp } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface WhatsAppServerProps {
  onConfigure: () => void;
  onReset?: () => void;
  isAutoApproved?: boolean;
  onAutoApprovalToggle?: (autoApproved: boolean) => void;
}

const WhatsAppServer = ({
  onConfigure,
  onReset,
  isAutoApproved = false,
  onAutoApprovalToggle
}: WhatsAppServerProps) => {
  const { setServerEnabled, isServerConfigured, getAllConfiguredServers } = useMCPStore();
  const servers = getAllConfiguredServers();
  const whatsAppEnabled = servers.whatsApp?.enabled || false;
  const isConfigured = isServerConfigured('whatsApp');

  const handleToggle = (enabled: boolean) => {
    setServerEnabled('whatsApp', enabled);
  };

  const handleAutoApprovalToggle = (autoApproved: boolean) => {
    onAutoApprovalToggle?.(autoApproved);
  };

  return (
    <ServerCard
      title="WhatsApp MCP Server (Only on Linux)"
      description="MCP server for WhatsApp messaging integration."
      version="0.0.1"
      isEnabled={whatsAppEnabled}
      isConfigured={isConfigured}
      isAutoApproved={isAutoApproved}
      onToggle={handleToggle}
      onAutoApprovalToggle={handleAutoApprovalToggle}
      onConfigure={onConfigure}
      onReset={onReset}
      icon={<WhatsApp />}
      sourceUrl="https://github.com/lharries/whatsapp-mcp?tab=readme-ov-file#installation"
    />
  );
};

export default withReset(WhatsAppServer, "whatsapp");