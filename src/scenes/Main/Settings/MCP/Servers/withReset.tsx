import { useMCPStore } from "@/stores/MCP/MCPStore";
import { ComponentType } from "react";

// Define the service types
type ServiceType =
  | "weather"
  | "location"
  | "nearby-search"
  | "web3-research"
  | "doordash"
  | "whatsapp"
  | "github"
  | "ip-location"
  | "weather-forecast"
  | "airbnb"
  | "tavily"
  | "linkedin";

// Map service types to server names
const SERVICE_TO_SERVER_MAP: Record<ServiceType, string> = {
  "weather": "weather",
  "location": "location",
  "nearby-search": "nearbySearch",
  "web3-research": "web3Research",
  "doordash": "doorDash",
  "whatsapp": "whatsApp",
  "github": "github",
  "ip-location": "ipLocation",
  "weather-forecast": "weatherForecast",
  "airbnb": "airbnb",
  "tavily": "tavily",
  "linkedin": "linkedIn"
};

// Define the props interface for components that can be enhanced
interface ConfigurableComponentProps {
  onConfigure: () => void;
}

// Define the enhanced props
interface EnhancedComponentProps extends ConfigurableComponentProps {
  onReset?: () => void;
  isAutoApproved?: boolean;
  onAutoApprovalToggle?: (autoApproved: boolean) => void;
}

// Create the HOC
const withReset = <P extends ConfigurableComponentProps>(
  WrappedComponent: ComponentType<P>,
  serviceType: ServiceType
) => {
  const EnhancedComponent = (props: Omit<P, keyof EnhancedComponentProps> & EnhancedComponentProps) => {
    const { setServerEnabled, setServerConfig, setServerAutoApproved, getServerAutoApproved, servers } = useMCPStore();

    const handleReset = () => {
      const serverName = SERVICE_TO_SERVER_MAP[serviceType];
      const server = servers[serverName];

      if (server) {
        // Reset to default config, disable, and reset auto-approval
        server.setConfig(server.defaultConfig);
        server.setEnabled(false);
        server.setAutoApproved && server.setAutoApproved(false);
      } else {
        console.warn(`Unknown server for service type: ${serviceType}`);
      }
    };

    const handleAutoApprovalToggle = (autoApproved: boolean) => {
      const serverName = SERVICE_TO_SERVER_MAP[serviceType];
      setServerAutoApproved(serverName, autoApproved);
    };

    const isAutoApproved = getServerAutoApproved(SERVICE_TO_SERVER_MAP[serviceType]);

    // Enhanced component with reset and auto-approval functionality
    return (
      <WrappedComponent
        {...props as P}
        onReset={handleReset}
        isAutoApproved={isAutoApproved}
        onAutoApprovalToggle={handleAutoApprovalToggle}
      />
    );
  };

  return EnhancedComponent;
};

export default withReset;