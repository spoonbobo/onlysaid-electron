import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box
} from "@mui/material";
import { FormattedMessage } from "react-intl";
import { TopicContext } from "@/stores/Topic/TopicStore";
import { useState } from "react";

interface ExitWorkspaceDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    workspace: TopicContext | null;
}

function ExitWorkspaceDialog({ open, onClose, onConfirm, workspace }: ExitWorkspaceDialogProps) {
    const [isExiting, setIsExiting] = useState(false);

    const handleExit = async () => {
        if (!workspace) return;

        setIsExiting(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error("Error exiting workspace:", error);
        } finally {
            setIsExiting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <FormattedMessage id="workspace.exit.title" defaultMessage="Exit Workspace" />
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body1">
                        <FormattedMessage
                            id="workspace.exit.confirmation"
                            defaultMessage="Are you sure you want to exit workspace '{name}'? You will no longer have access to this workspace."
                            values={{ name: workspace?.name || "" }}
                        />
                    </Typography>
                    <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
                        <FormattedMessage
                            id="workspace.exit.warning"
                            defaultMessage="You can rejoin this workspace later with an invite code if needed."
                        />
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isExiting}>
                    <FormattedMessage id="common.cancel" defaultMessage="Cancel" />
                </Button>
                <Button
                    onClick={handleExit}
                    variant="contained"
                    color="primary"
                    disabled={isExiting}
                >
                    {isExiting ? (
                        <FormattedMessage id="common.exiting" defaultMessage="Exiting..." />
                    ) : (
                        <FormattedMessage id="common.exit" defaultMessage="Exit" />
                    )}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ExitWorkspaceDialog;
