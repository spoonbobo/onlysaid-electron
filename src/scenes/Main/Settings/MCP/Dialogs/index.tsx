import { useMemo } from "react";
import WeatherDialog from "./WeatherDialog";
import LocationDialog from "./LocationDialog";
import NearbySearchDialog from "./NearbySearchDialog";
import Web3ResearchDialog from "./Web3ResearchDialog";
import DoorDashDialog from "./DoorDashDialog";
import WhatsAppDialog from "./WhatsAppDialog";
import GitHubDialog from "./GitHubDialog";
import IPLocationDialog from "./IPLocation";
import WeatherForecastDialog from "./WeatherForecastDialog";
import TavilyDialog from "./TavilyDialog";
import LinkedInDialog from "./LinkedInDialog";

interface ServiceDialogProps {
    open: boolean;
    serviceType: string;
    initialData?: Record<string, any>;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
}

const ServiceDialog = ({ open, serviceType, initialData, onClose, onSave }: ServiceDialogProps) => {
    // Map service types to their specialized dialog components
    const DialogComponent = useMemo(() => {
        switch (serviceType) {
            case "weather":
                return WeatherDialog;
            case "location":
                return LocationDialog;
            case "nearby-search":
                return NearbySearchDialog;
            case "web3-research":
                return Web3ResearchDialog;
            case "doordash":
                return DoorDashDialog;
            case "whatsapp":
                return WhatsAppDialog;
            case "github":
                return GitHubDialog;
            case "ip-location":
                return IPLocationDialog;
            case "weather-forecast":
                return WeatherForecastDialog;
            case "tavily":
                return TavilyDialog;
            case "linkedin":
                return LinkedInDialog;
            default:
                return null;
        }
    }, [serviceType]);

    if (!DialogComponent) return null;

    return (
        <DialogComponent
            open={open}
            initialData={initialData}
            onClose={onClose}
            onSave={onSave}
        />
    );
};

export default ServiceDialog;