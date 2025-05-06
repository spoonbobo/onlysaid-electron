import { WbSunny } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface WeatherServerProps {
    onConfigure: () => void;
    onReset?: () => void;
}

const WeatherServer = ({ onConfigure, onReset }: WeatherServerProps) => {
    const { weatherEnabled, setWeatherEnabled, isWeatherConfigured } = useMCPStore();
    const isConfigured = isWeatherConfigured();

    return (
        <ServerCard
            title="weather-mcp-server"
            description="Provides real-time weather data for your application from various weather APIs."
            version="1.0.0"
            isEnabled={weatherEnabled}
            isConfigured={isConfigured}
            onToggle={setWeatherEnabled}
            onConfigure={onConfigure}
            onReset={onReset}
            icon={<WbSunny />}
        />
    );
};

// Enhance WeatherServer with reset functionality
export default withReset(WeatherServer, "weather");