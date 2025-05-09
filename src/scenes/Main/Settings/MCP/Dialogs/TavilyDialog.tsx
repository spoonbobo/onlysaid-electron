import MCPDialog, { Field } from "@/components/Dialog/MCPDialog";

interface TavilyDialogProps {
    open: boolean;
    initialData?: Record<string, any>;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
}

const TavilyDialog = ({ open, initialData, onClose, onSave }: TavilyDialogProps) => {
    const fields: Field[] = [
        {
            key: "apiKey",
            label: "Tavily API Key",
            type: "apiKey",
            required: true,
            description: "The API key for the Tavily web search service",
            descriptionLink: {
                text: "Get API Key",
                url: "https://tavily.com/"
            }
        }
    ];

    return (
        <MCPDialog
            open={open}
            onClose={onClose}
            onSave={(data) => onSave(data)}
            title="Tavily Web Search Configuration"
            fields={fields}
            serviceType="tavily"
            initialData={initialData}
        />
    );
};

export default TavilyDialog;
