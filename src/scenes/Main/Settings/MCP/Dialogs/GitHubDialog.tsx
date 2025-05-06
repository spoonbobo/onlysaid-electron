import MCPDialog, { Field } from "@/components/Dialog/MCPDialog";

interface GitHubDialogProps {
    open: boolean;
    initialData?: Record<string, any>;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
}

const GitHubDialog = ({ open, initialData, onClose, onSave }: GitHubDialogProps) => {
    const fields: Field[] = [
        {
            key: "accessToken",
            label: "Access Token",
            type: "password",
            required: true,
            description: "Enter your GitHub personal access token",
            descriptionLink: {
                text: "Learn more",
                url: "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token"
            }
        },
    ];

    return (
        <MCPDialog
            open={open}
            onClose={onClose}
            onSave={(data) => onSave(data)}
            title="GitHub MCP Configuration"
            fields={fields}
            serviceType="github"
            initialData={initialData}
        />
    );
};

export default GitHubDialog;