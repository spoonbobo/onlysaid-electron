import { Box, Typography, Divider } from "@mui/material";
import WeatherServer from "./Weather/WeatherServer";
import LocationServer from "./Location/LocationServer";
import NearbySearchServer from "./NearbySearch/NearbySearchServer";
import Web3ResearchServer from "./Web3Research/Web3ResearchServer";
import DoorDashServer from "./DoorDash/DoorDashServer";
import WhatsAppServer from "./WhatsApp/WhatsAppServer";
import GitHubServer from "./GitHub/GitHubServer";
import IPLocationServer from "./Location/IPLocation";
import { FormattedMessage } from "react-intl";
import WeatherForecastServer from "./Weather/WeatherForecast";
import AirbnbServer from "./Accommodation/Airbnb";

// Service configuration interface
interface ServiceConfig {
    type: string;
    enabledFlag: boolean;
    config: any;
    humanName: string;
    category: string;
}

interface ServersProps {
    services: ServiceConfig[];
    configureHandlers: Record<string, () => void>;
}

const Servers = ({
    services,
    configureHandlers
}: ServersProps) => {
    // Render the appropriate server component based on type
    const renderServerComponent = (service: ServiceConfig) => {
        const configHandler = configureHandlers[service.type];

        switch (service.type) {
            case "weather":
                return <WeatherServer key={service.type} onConfigure={configHandler} />;
            case "location":
                return <LocationServer key={service.type} onConfigure={configHandler} />;
            case "nearby-search":
                return <NearbySearchServer key={service.type} onConfigure={configHandler} />;
            case "web3-research":
                return <Web3ResearchServer key={service.type} onConfigure={configHandler} />;
            case "doordash":
                return <DoorDashServer key={service.type} onConfigure={configHandler} />;
            case "whatsapp":
                return <WhatsAppServer key={service.type} onConfigure={configHandler} />;
            case "github":
                return <GitHubServer key={service.type} onConfigure={configHandler} />;
            case "ip-location":
                return <IPLocationServer key={service.type} onConfigure={configHandler} />;
            case "weather-forecast":
                return <WeatherForecastServer key={service.type} onConfigure={configHandler} />;
            case "airbnb":
                return <AirbnbServer key={service.type} onConfigure={configHandler} />;
            default:
                return null;
        }
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                <FormattedMessage id="settings.mcp.availableServers" />
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {services.map(service => renderServerComponent(service))}
        </Box>
    );
};

export default Servers;