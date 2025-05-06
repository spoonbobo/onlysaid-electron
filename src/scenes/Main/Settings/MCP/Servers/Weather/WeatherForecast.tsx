import { WbSunny } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface WeatherForecastServerProps {
    onConfigure: () => void;
    onReset?: () => void;
}

const WeatherForecastServer = ({ onConfigure, onReset }: WeatherForecastServerProps) => {
    const { weatherForecastEnabled, setWeatherForecastEnabled, isWeatherForecastConfigured } = useMCPStore();
    const isConfigured = isWeatherForecastConfigured();

    return (
        <ServerCard
            title="Weekly Weather MCP Server"
            description="A weather forecast MCP (Model Context Protocol) server providing 8-day global weather forecasts and current weather conditions."
            version="1.2.0"
            isEnabled={weatherForecastEnabled}
            isConfigured={isConfigured}
            onToggle={setWeatherForecastEnabled}
            onConfigure={onConfigure}
            onReset={onReset}
            icon={<WbSunny />}
            sourceUrl="https://github.com/rossshannon/weekly-weather-mcp"
        />
    );
};

// Enhance WeatherServer with reset functionality
export default withReset(WeatherForecastServer, "weather-forecast");