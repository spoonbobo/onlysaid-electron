import MCPDialog, { Field } from "@/components/Dialog/MCPDialog";

interface WeatherForecastDialogProps {
    open: boolean;
    initialData?: Record<string, any>;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
}

const WeatherForecastDialog = ({ open, initialData, onClose, onSave }: WeatherForecastDialogProps) => {
    const fields: Field[] = [
        {
            key: "path",
            label: "Path to the weather forecast script",
            type: "text",
            required: true,
            description: "Full path to the weather forecast script",
            descriptionLink: {
                text: "Clone the repository",
                url: "https://github.com/rossshannon/weekly-weather-mcp"
            }
        },
        {
            key: "apiKey",
            label: "OpenWeatherMap API Key",
            type: "password",
            required: true,
            description: "The API key for the OpenWeatherMap service",
            descriptionLink: {
                text: "Get API Key",
                url: "https://openweathermap.org/api"
            }
        }
    ];

    return (
        <MCPDialog
            open={open}
            onClose={onClose}
            onSave={(data) => onSave(data)}
            title="Weekly Weather Forecast Service Configuration"
            fields={fields}
            serviceType="weather-forecast"
            initialData={initialData}
        />
    );
};

export default WeatherForecastDialog;