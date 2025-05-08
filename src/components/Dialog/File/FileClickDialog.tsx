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

interface FileClickDialogProps {
    open: boolean;
    onClose: () => void;
    filePath: string;
}

export default function FileClickDialog({
    open,
    onClose,
    filePath
}: FileClickDialogProps) {
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
                        <FormattedMessage id="dialog.file.click.title" defaultMessage="File Selected" />
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
                            id="dialog.file.click.info"
                            defaultMessage="You clicked on file: {file}"
                            values={{
                                file: <Box component="span" fontWeight="bold">{filePath}</Box>
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