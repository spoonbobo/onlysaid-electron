import MCPDialog, { Field } from "@/components/Dialog/MCPDialog";

interface IPLocationDialogProps {
    open: boolean;
    initialData?: Record<string, any>;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
}

const IPLocationDialog = ({ open, initialData, onClose, onSave }: IPLocationDialogProps) => {
    const fields: Field[] = [
        {
            key: "apiKey",
            label: "API Token",
            type: "apiKey",
            required: true,
            description: "Your ipinfo.io API token. Create a free account at ipinfo.io to get an API token.",
            descriptionLink: {
                text: "Get an API token",
                url: "https://ipinfo.io/signup"
            }
        }
    ];

    return (
        <MCPDialog
            open={open}
            onClose={onClose}
            onSave={(data) => onSave(data)}
            title="IP Location Service Configuration"
            fields={fields}
            serviceType="ip-location"
            initialData={initialData}
        />
    );
};

export default IPLocationDialog;