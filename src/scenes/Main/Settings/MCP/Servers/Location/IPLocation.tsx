import { LocationOn } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface IPLocationServerProps {
    onConfigure: () => void;
    onReset?: () => void;
    isAutoApproved?: boolean;
    onAutoApprovalToggle?: (autoApproved: boolean) => void;
}

const IPLocationServer = ({
    onConfigure,
    onReset,
    isAutoApproved = false,
    onAutoApprovalToggle
}: IPLocationServerProps) => {
    const { setServerEnabled, isServerConfigured, getAllConfiguredServers } = useMCPStore();
    const servers = getAllConfiguredServers();
    const ipLocationEnabled = servers.ipLocation?.enabled || false;
    const isConfigured = isServerConfigured('ipLocation');

    const handleToggle = (enabled: boolean) => {
        setServerEnabled('ipLocation', enabled);
    };

    const handleAutoApprovalToggle = (autoApproved: boolean) => {
        onAutoApprovalToggle?.(autoApproved);
    };

    return (
        <ServerCard
            title="ip-location-mcp"
            description="server that uses the ipinfo.io API to get detailed information about an IP address. This can be used to determine where the user is located (approximately) and what network they are used."
            version="Unknown"
            isEnabled={ipLocationEnabled}
            isConfigured={isConfigured}
            isAutoApproved={isAutoApproved}
            onToggle={handleToggle}
            onAutoApprovalToggle={handleAutoApprovalToggle}
            onConfigure={onConfigure}
            onReset={onReset}
            icon={<LocationOn />}
            sourceUrl="https://github.com/briandconnelly/mcp-server-ipinfo"
        />
    );
};

export default withReset(IPLocationServer, "ip-location");
