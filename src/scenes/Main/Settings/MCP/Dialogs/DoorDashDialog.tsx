import MCPDialog, { Field } from "@/components/Dialog/MCPDialog";

interface DoorDashDialogProps {
    open: boolean;
    initialData?: Record<string, any>;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
}

const DoorDashDialog = ({ open, initialData, onClose, onSave }: DoorDashDialogProps) => {
    const fields: Field[] = [
        { key: "apiKey", label: "API Key", type: "password", required: true },
        { key: "endpoint", label: "Service Endpoint", type: "text", required: true },
        { key: "region", label: "Region", type: "select", options: ["us", "ca", "au", "uk"], required: true }
    ];

    return (
        <MCPDialog
            open={open}
            onClose={onClose}
            onSave={(data) => onSave(data)}
            title="DoorDash MCP Configuration"
            fields={fields}
            serviceType="doordash"
            initialData={initialData}
        />
    );
};

export default DoorDashDialog;