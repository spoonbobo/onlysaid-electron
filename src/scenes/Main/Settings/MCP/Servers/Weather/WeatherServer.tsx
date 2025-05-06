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
            title="mcp-weather"
            description="A simple MCP server that provides hourly weather forecasts using the AccuWeather API."
            version="unknown"
            isEnabled={weatherEnabled}
            isConfigured={isConfigured}
            onToggle={setWeatherEnabled}
            onConfigure={onConfigure}
            onReset={onReset}
            icon={<WbSunny />}
            sourceUrl="https://github.com/adhikasp/mcp-weather"
        />
    );
};

// Enhance WeatherServer with reset functionality
export default withReset(WeatherServer, "weather");