import MCPDialog, { Field } from "@/components/Dialog/MCPDialog";

interface Web3ResearchDialogProps {
    open: boolean;
    initialData?: Record<string, any>;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
}

const Web3ResearchDialog = ({ open, initialData, onClose, onSave }: Web3ResearchDialogProps) => {
    const fields: Field[] = [
        { key: "apiKey", label: "API Key", type: "password", required: true },
        { key: "endpoint", label: "Service Endpoint", type: "text", required: true }
    ];

    return (
        <MCPDialog
            open={open}
            onClose={onClose}
            onSave={(data) => onSave(data)}
            title="Web3 Research MCP Configuration"
            fields={fields}
            serviceType="web3-research"
            initialData={initialData}
        />
    );
};

export default Web3ResearchDialog;