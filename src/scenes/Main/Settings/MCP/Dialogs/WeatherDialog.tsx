import MCPDialog, { Field } from "@/components/Dialog/MCPDialog";

interface WeatherDialogProps {
    open: boolean;
    initialData?: Record<string, any>;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
}

const WeatherDialog = ({ open, initialData, onClose, onSave }: WeatherDialogProps) => {
    const fields: Field[] = [
        { key: "apiKey", label: "API Key", type: "password", required: true },
        { key: "endpoint", label: "Service Endpoint", type: "text", required: true },
        { key: "units", label: "Units", type: "select", options: ["metric", "imperial"], required: true }
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