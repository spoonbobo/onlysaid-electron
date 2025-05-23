import { WbSunny } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface WeatherForecastServerProps {
    onConfigure: () => void;
    onReset?: () => void;
    isAutoApproved?: boolean;
    onAutoApprovalToggle?: (autoApproved: boolean) => void;
}

const WeatherForecastServer = ({
    onConfigure,
    onReset,
    isAutoApproved = false,
    onAutoApprovalToggle
}: WeatherForecastServerProps) => {
    const { setServerEnabled, isServerConfigured, getAllConfiguredServers } = useMCPStore();
    const servers = getAllConfiguredServers();
    const weatherForecastEnabled = servers.weatherForecast?.enabled || false;
    const isConfigured = isServerConfigured('weatherForecast');

    const handleToggle = (enabled: boolean) => {
        setServerEnabled('weatherForecast', enabled);
    };

    const handleAutoApprovalToggle = (autoApproved: boolean) => {
        onAutoApprovalToggle?.(autoApproved);
    };

    return (
        <ServerCard
            title="Weekly Weather MCP Server"
            description="A weather forecast MCP (Model Context Protocol) server providing 8-day global weather forecasts and current weather conditions."
            version="1.2.0"
            isEnabled={weatherForecastEnabled}
            isConfigured={isConfigured}
            isAutoApproved={isAutoApproved}
            onToggle={handleToggle}
            onAutoApprovalToggle={handleAutoApprovalToggle}
            onConfigure={onConfigure}
            onReset={onReset}
            icon={<WbSunny />}
            sourceUrl="https://github.com/rossshannon/weekly-weather-mcp"
        />
    );
};

// Enhance WeatherServer with reset functionality
export default withReset(WeatherForecastServer, "weather-forecast");
