import { WbSunny } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface WeatherServerProps {
  onConfigure: () => void;
  onReset?: () => void;
  isAutoApproved?: boolean;
  onAutoApprovalToggle?: (autoApproved: boolean) => void;
}

const WeatherServer = ({
  onConfigure,
  onReset,
  isAutoApproved = false,
  onAutoApprovalToggle
}: WeatherServerProps) => {
  const { setServerEnabled, isServerConfigured, getAllConfiguredServers } = useMCPStore();
  const servers = getAllConfiguredServers();
  const weatherEnabled = servers.weather?.enabled || false;
  const isConfigured = isServerConfigured('weather');

  const handleToggle = (enabled: boolean) => {
    setServerEnabled('weather', enabled);
  };

  const handleAutoApprovalToggle = (autoApproved: boolean) => {
    onAutoApprovalToggle?.(autoApproved);
  };

  return (
    <ServerCard
      title="mcp-weather"
      description="A simple MCP server that provides hourly weather forecasts using the AccuWeather API."
      version="unknown"
      isEnabled={weatherEnabled}
      isConfigured={isConfigured}
      isAutoApproved={isAutoApproved}
      onToggle={handleToggle}
      onAutoApprovalToggle={handleAutoApprovalToggle}
      onConfigure={onConfigure}
      onReset={onReset}
      icon={<WbSunny />}
      sourceUrl="https://github.com/adhikasp/mcp-weather"
    />
  );
};

// Enhance WeatherServer with reset functionality
export default withReset(WeatherServer, "weather");
