import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography
} from "@mui/material";
import { useState } from "react";
import { useTopicStore, TopicContext } from "@/stores/Topic/TopicStore";
import { FormattedMessage } from "react-intl";

interface AddWorkspaceDialogProps {
    open: boolean;
    onClose: () => void;
}

function AddWorkspaceDialog({ open, onClose }: AddWorkspaceDialogProps) {
    const [workspaceName, setWorkspaceName] = useState("");
    const [error, setError] = useState("");
    const { addContext, setSelectedContext } = useTopicStore();

    const handleCreateWorkspace = () => {
        // Validate
        if (!workspaceName.trim()) {
            setError("Workspace name is required");
            return;
        }

        // Create the new workspace context
        const newWorkspaceContext: TopicContext = {
            name: workspaceName.trim().toLowerCase(),
            type: "workspace" as const
        };

        // Add to contexts
        addContext(newWorkspaceContext);

        // Set as selected context
        setSelectedContext(newWorkspaceContext);

        // Close the dialog
        setWorkspaceName("");
        setError("");
        onClose();
    };

    const handleCancel = () => {
        setWorkspaceName("");
        setError("");
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <FormattedMessage id="workspace.create.title" defaultMessage="Create Workspace" />
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 1 }}>
                    <TextField
                        autoFocus
                        label={<FormattedMessage id="workspace.create.name" defaultMessage="Workspace Name" />}
                        fullWidth
                        value={workspaceName}
                        onChange={(e) => {
                            setWorkspaceName(e.target.value);
                            setError("");
                        }}
                        error={!!error}
                        helperText={error}
                        sx={{ mb: 2 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                        <FormattedMessage id="workspace.create.description" defaultMessage="Create a new workspace to organize your content and collaborate with others." />
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel}>
                    <FormattedMessage id="common.close" />
                </Button>
                <Button onClick={handleCreateWorkspace} variant="contained" color="primary">
                    <FormattedMessage id="common.create" />
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default AddWorkspaceDialog;
