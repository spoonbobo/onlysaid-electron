import { LocationOn } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface IPLocationServerProps {
    onConfigure: () => void;
    onReset?: () => void;
}

const IPLocationServer = ({ onConfigure, onReset }: IPLocationServerProps) => {
    const { ipLocationEnabled, setIPLocationEnabled, isIPLocationConfigured } = useMCPStore();
    const isConfigured = isIPLocationConfigured();

    return (
        <ServerCard
            title="ip-location-mcp"
            description="server that uses the ipinfo.io API to get detailed information about an IP address. This can be used to determine where the user is located (approximately) and what network they are used."
            version="Unknown"
            isEnabled={ipLocationEnabled}
            isConfigured={isConfigured}
            onToggle={setIPLocationEnabled}
            onConfigure={onConfigure}
            onReset={onReset}
            icon={<LocationOn />}
            sourceUrl="https://github.com/briandconnelly/mcp-server-ipinfo"
        />
    );
};

export default withReset(IPLocationServer, "ip-location");