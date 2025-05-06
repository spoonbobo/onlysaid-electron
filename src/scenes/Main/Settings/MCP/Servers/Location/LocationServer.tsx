import { LocationOn } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface LocationServerProps {
    onConfigure: () => void;
    onReset?: () => void;
}

const LocationServer = ({ onConfigure, onReset }: LocationServerProps) => {
    const { locationEnabled, setLocationEnabled, isLocationConfigured } = useMCPStore();
    const isConfigured = isLocationConfigured();

    return (
        <ServerCard
            title="open-streetmap-mcp"
            description="An OpenStreetMap MCP server implementation that enhances LLM capabilities with location-based services and geospatial data."
            version="unknown"
            isEnabled={locationEnabled}
            isConfigured={isConfigured}
            onToggle={setLocationEnabled}
            onConfigure={onConfigure}
            onReset={onReset}
            icon={<LocationOn />}
            sourceUrl="https://github.com/jagan-shanmugam/open-streetmap-mcp"
        />
    );
};

export default withReset(LocationServer, "location");