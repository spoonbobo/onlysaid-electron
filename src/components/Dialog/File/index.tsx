import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { FormattedMessage } from "react-intl";

interface FileDropDialogProps {
    open: boolean;
    onClose: () => void;
    sourcePath: string;
    targetPath: string;
}

export interface FileClickDialogProps {
    open: boolean;
    onClose: () => void;
    filePath: string;
}

export default function FileDropDialog({
    open,
    onClose,
    sourcePath,
    targetPath
}: FileDropDialogProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                        <FormattedMessage id="dialog.file.drop.title" defaultMessage="File Dropped" />
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Box mt={1}>
                    <Typography variant="body1" gutterBottom>
                        <FormattedMessage
                            id="dialog.file.drop.info"
                            defaultMessage="File from {source} was dropped onto {target}"
                            values={{
                                source: <Box component="span" fontWeight="bold">{sourcePath}</Box>,
                                target: <Box component="span" fontWeight="bold">{targetPath}</Box>
                            }}
                        />
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>
                    <FormattedMessage id="common.close" defaultMessage="Close" />
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export function FileClickDialog({
    open,
    onClose,
    filePath
}: FileClickDialogProps) {
    // existing code...
}
