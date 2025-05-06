import { LocationSearching } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface NearbySearchServerProps {
    onConfigure: () => void;
    onReset?: () => void;
}

const NearbySearchServer = ({ onConfigure, onReset }: NearbySearchServerProps) => {
    const { nearbySearchEnabled, setNearbySearchEnabled, isNearbySearchConfigured } = useMCPStore();
    const isConfigured = isNearbySearchConfigured();

    return (
        <ServerCard
            title="Nearby Search MCP"
            description="MCP server for nearby place searches with IP-based location detection. Uses Google Places API."
            version="1.0.0"
            isEnabled={nearbySearchEnabled}
            isConfigured={isConfigured}
            onToggle={setNearbySearchEnabled}
            onConfigure={onConfigure}
            onReset={onReset}
            icon={<LocationSearching />}
            sourceUrl="https://github.com/kukapay/nearby-search-mcp"
        />
    );
};

export default withReset(NearbySearchServer, "nearby-search");