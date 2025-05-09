import MCPDialog, { Field } from "@/components/Dialog/MCPDialog";

interface LinkedInDialogProps {
    open: boolean;
    initialData?: Record<string, any>;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
}

const LinkedInDialog = ({ open, initialData, onClose, onSave }: LinkedInDialogProps) => {
    const fields: Field[] = [
        {
            key: "email",
            label: "LinkedIn Email",
            type: "text",
            required: true,
            description: "The email address used for your LinkedIn account"
        },
        {
            key: "password",
            label: "LinkedIn Password",
            type: "password",
            required: true,
            description: "Your LinkedIn account password"
        }
    ];

    return (
        <MCPDialog
            open={open}
            onClose={onClose}
            onSave={(data) => onSave(data)}
            title="LinkedIn Integration Configuration"
            fields={fields}
            serviceType="linkedin"
            initialData={initialData}
        />
    );
};

export default LinkedInDialog;
