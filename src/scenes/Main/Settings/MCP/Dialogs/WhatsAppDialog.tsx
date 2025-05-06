import MCPDialog, { Field } from "@/components/Dialog/MCPDialog";

interface WhatsAppDialogProps {
    open: boolean;
    initialData?: Record<string, any>;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
}

const WhatsAppDialog = ({ open, initialData, onClose, onSave }: WhatsAppDialogProps) => {
    const fields: Field[] = [
        {
            key: "path",
            label: "Path to whatsapp-mcp repository",
            type: "text",
            required: true,
            description: "Enter the FULL path to the whatsapp-mcp repository",
            descriptionLink: {
                text: "You must complete the pre-requisites before using this service.",
                url: "https://github.com/lharries/whatsapp-mcp?tab=readme-ov-file#installation"
            }
        }
    ];

    return (
        <MCPDialog
            open={open}
            onClose={onClose}
            onSave={(data) => onSave(data)}
            title="WhatsApp MCP Configuration"
            fields={fields}
            serviceType="whatsapp"
            initialData={initialData}
        />
    );
};

export default WhatsAppDialog;