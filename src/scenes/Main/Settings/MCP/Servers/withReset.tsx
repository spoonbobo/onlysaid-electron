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
    | "weather-forecast";

// Define the props interface for components that can be enhanced
interface ConfigurableComponentProps {
    onConfigure: () => void;
}

// Define the enhanced props
interface EnhancedComponentProps extends ConfigurableComponentProps {
    onReset?: () => void;
}

// Create the HOC
const withReset = <P extends ConfigurableComponentProps>(
    WrappedComponent: ComponentType<P>,
    serviceType: ServiceType
) => {
    const EnhancedComponent = (props: Omit<P, keyof EnhancedComponentProps> & EnhancedComponentProps) => {
        const {
            setWeatherConfig,
            setLocationConfig,
            setNearbySearchConfig,
            setWeb3ResearchConfig,
            setDoorDashConfig,
            setWhatsAppConfig,
            setGitHubConfig,
            setIPLocationConfig,
            setWeatherEnabled,
            setLocationEnabled,
            setNearbySearchEnabled,
            setWeb3ResearchEnabled,
            setDoorDashEnabled,
            setWhatsAppEnabled,
            setGitHubEnabled,
            setIPLocationEnabled
        } = useMCPStore();

        // Map service types to their default configurations
        const handleReset = () => {
            switch (serviceType) {
                case "weather":
                    setWeatherConfig({
                        apiKey: "",
                        endpoint: "",
                        units: "metric"
                    });
                    setWeatherEnabled(false);
                    break;
                case "location":
                    setLocationConfig({
                        path: "",
                    });
                    setLocationEnabled(false);
                    break;
                case "nearby-search":
                    setNearbySearchConfig({
                        apiKey: "",
                        endpoint: "",
                        defaultRadius: 1500
                    });
                    setNearbySearchEnabled(false);
                    break;
                case "web3-research":
                    setWeb3ResearchConfig({
                        apiKey: "",
                        endpoint: ""
                    });
                    setWeb3ResearchEnabled(false);
                    break;
                case "doordash":
                    setDoorDashConfig({
                        apiKey: "",
                        endpoint: "",
                        region: "us"
                    });
                    setDoorDashEnabled(false);
                    break;
                case "whatsapp":
                    setWhatsAppConfig({
                        path: ""
                    });
                    setWhatsAppEnabled(false);
                    break;
                case "github":
                    setGitHubConfig({
                        accessToken: ""
                    });
                    setGitHubEnabled(false);
                    break;
                case "ip-location":
                    setIPLocationConfig({
                        apiKey: "",
                    });
                    setIPLocationEnabled(false);
                    break;
            }
        };

        // Enhanced component with reset functionality
        return <WrappedComponent {...props as P} onReset={handleReset} />;
    };

    return EnhancedComponent;
};

export default withReset;