import MCPDialog, { Field } from "@/components/Dialog/MCPDialog";

interface NearbySearchDialogProps {
    open: boolean;
    initialData?: Record<string, any>;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
}

const NearbySearchDialog = ({ open, initialData, onClose, onSave }: NearbySearchDialogProps) => {
    const fields: Field[] = [
        { key: "apiKey", label: "Google API Key", type: "password", required: true },
        { key: "endpoint", label: "Service Endpoint", type: "text", required: true },
        { key: "defaultRadius", label: "Default Search Radius (meters)", type: "number", required: true }
    ];

    return (
        <MCPDialog
            open={open}
            onClose={onClose}
            onSave={(data) => onSave(data)}
            title="Nearby Search MCP Configuration"
            fields={fields}
            serviceType="nearby-search"
            initialData={initialData}
        />
    );
};

export default NearbySearchDialog;