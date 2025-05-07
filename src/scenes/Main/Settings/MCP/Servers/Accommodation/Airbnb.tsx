import { WbSunny } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface AirbnbServerProps {
    onConfigure: () => void;
    onReset?: () => void;
}

const AirbnbServer = ({ onConfigure, onReset }: AirbnbServerProps) => {
    const { airbnbEnabled, setAirbnbEnabled, isAirbnbConfigured } = useMCPStore();
    const isConfigured = isAirbnbConfigured();

    return (
        <ServerCard
            title="Airbnb MCP Server"
            description="MCP Server for searching Airbnb and get listing details."
            version="unknown"
            isEnabled={airbnbEnabled}
            isConfigured={isConfigured}
            onToggle={setAirbnbEnabled}
            onConfigure={onConfigure}
            onReset={onReset}
            icon={<WbSunny />}
            sourceUrl="https://github.com/openbnb-org/mcp-server-airbnb"
        />
    );
};

// Enhance WeatherServer with reset functionality
export default withReset(AirbnbServer, "airbnb");