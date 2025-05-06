import MCPDialog, { Field } from "@/components/Dialog/MCPDialog";

interface LocationDialogProps {
    open: boolean;
    initialData?: Record<string, any>;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
}

const LocationDialog = ({ open, initialData, onClose, onSave }: LocationDialogProps) => {
    const fields: Field[] = [
        {
            key: "path",
            label: "Path to osm_mcp_server",
            type: "text",
            required: true,
            description: "The path to the osm_mcp_server executable. This is the path to the directory containing the osm_mcp_server executable.",
            descriptionLink: {
                text: "You must complete the pre-requisites before using this service.",
                url: "https://github.com/jagan-shanmugam/open-streetmap-mcp?tab=readme-ov-file#local-testing"
            }
        },
    ];

    return (
        <MCPDialog
            open={open}
            onClose={onClose}
            onSave={(data) => onSave(data)}
            title="Location Service Configuration"
            fields={fields}
            serviceType="location"
            initialData={initialData}
        />
    );
};

export default LocationDialog;