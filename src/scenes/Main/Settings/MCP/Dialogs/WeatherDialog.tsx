import MCPDialog, { Field } from "@/components/Dialog/MCPDialog";

interface WeatherDialogProps {
    open: boolean;
    initialData?: Record<string, any>;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
}

const WeatherDialog = ({ open, initialData, onClose, onSave }: WeatherDialogProps) => {
    const fields: Field[] = [
        {
            key: "apiKey",
            label: "AccuWeather API Key",
            type: "password",
            required: true,
            description: "The API key for the AccuWeather service",
            descriptionLink: {
                text: "Get API Key",
                url: "https://developer.accuweather.com/user/me"
            }
        }
    ];

    return (
        <MCPDialog
            open={open}
            onClose={onClose}
            onSave={(data) => onSave(data)}
            title="Weather Service Configuration"
            fields={fields}
            serviceType="weather"
            initialData={initialData}
        />
    );
};

export default WeatherDialog;