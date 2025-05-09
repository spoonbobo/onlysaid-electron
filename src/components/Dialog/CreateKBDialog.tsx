import { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    IconButton,
    Grid,
    Paper,
    InputAdornment,
    DialogContentText,
    Link,
    Alert,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FolderIcon from "@mui/icons-material/Folder";
import StorageIcon from "@mui/icons-material/Storage";
import { FormattedMessage } from "react-intl";
import { KnowledgeBase } from "@/stores/KB/KBConfigurationStore";
import { useKBSettingsStore } from "@/stores/KB/KBSettingStore";
import { EmbeddingModel, EmbeddingService } from "@/service/ai";

// Since we're in an Electron environment, we need to access the IPC renderer
// This import would typically be configured in your electron app


interface CreateKBDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; description: string; path: string; sourceType: string; embeddingEngine: string; }) => void;
    database?: KnowledgeBase | null;
    mode?: 'create' | 'edit';
}

export default function CreateKBDialog({
    open,
    onClose,
    onSubmit,
    database = null,
    mode = 'create'
}: CreateKBDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [path, setPath] = useState("");
    const [sourceType, setSourceType] = useState("local-store");
    const [nameError, setNameError] = useState(false);
    const [pathError, setPathError] = useState(false);
    const { embeddingEngine: defaultEmbeddingEngine, isKBUsable } = useKBSettingsStore();
    const [embeddingModels, setEmbeddingModels] = useState<EmbeddingModel[]>([]);
    const [selectedEmbeddingEngine, setSelectedEmbeddingEngine] = useState<string>("");

    useEffect(() => {
        if (open) {
            if (mode === 'edit' && database) {
                setName(database.name);
                setDescription(database.description);
                setPath(database.source);
                // Embedding engine is not editable for existing KBs in this dialog
                setSelectedEmbeddingEngine(database.embedding_engine);
            } else if (mode === 'create') {
                // Reset form for create mode
                resetForm();
                setSelectedEmbeddingEngine(defaultEmbeddingEngine !== "none" ? defaultEmbeddingEngine : "");
            }

            const embeddingService = new EmbeddingService();
            embeddingService.GetEmbeddingModels()
                .then(models => {
                    setEmbeddingModels(models);
                    if (mode === 'create' && (defaultEmbeddingEngine === "none" || defaultEmbeddingEngine === "") && models.length > 0) {
                        // If no default engine or 'none', and models are available, select the first one
                        // Or, keep it empty to force user selection if default is "none"
                        if (defaultEmbeddingEngine === "none" || defaultEmbeddingEngine === "") {
                            setSelectedEmbeddingEngine(""); // Force user selection
                        } else if (models.find(m => m.id === defaultEmbeddingEngine)) {
                            setSelectedEmbeddingEngine(defaultEmbeddingEngine);
                        } else if (models.length > 0 && (selectedEmbeddingEngine === "" || selectedEmbeddingEngine === "none")) {
                            // if current selection is empty or none, and there's no valid default, pick first.
                            // This handles case where defaultEmbeddingEngine might not be in list.
                            // setSelectedEmbeddingEngine(models[0].id); // Decided to keep it empty or default from settings
                        }
                    } else if (mode === 'create' && (defaultEmbeddingEngine !== "none" && defaultEmbeddingEngine !== "")) {
                        setSelectedEmbeddingEngine(defaultEmbeddingEngine);
                    }
                })
                .catch(error => {
                    console.error("Failed to load embedding models:", error);
                });
        }
    }, [database, mode, open, defaultEmbeddingEngine]);

    const handleSubmit = () => {
        if (mode === "create" && (!selectedEmbeddingEngine || selectedEmbeddingEngine === "none")) {
            console.error("Embedding engine must be selected.");
            // Optionally, set an error state here to show in UI
            return;
        }

        onSubmit({
            name,
            description,
            path,
            sourceType,
            embeddingEngine: selectedEmbeddingEngine
        });
        if (mode === 'create') {
            resetForm();
        }
    };

    const resetForm = () => {
        setName("");
        setDescription("");
        setPath("");
        setSourceType("local-store"); // Assuming this is the only type for now
        setSelectedEmbeddingEngine(defaultEmbeddingEngine !== "none" ? defaultEmbeddingEngine : "");
        setNameError(false);
        setPathError(false);
    };

    const handleClose = () => {
        if (mode === 'create') {
            resetForm();
        }
        onClose();
    };

    const handleBrowseFolder = async () => {
        try {
            // Use the existing fileSystem.openFolderDialog method from preload
            const result = await window.electron.fileSystem.openFolderDialog();

            if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
                const selectedPath = result.filePaths[0];
                setPath(selectedPath);
                setPathError(false);
            }
        } catch (error) {
            console.error("Error selecting directory:", error);
        }
    };

    const showEngineWarning = mode === "create" && (!selectedEmbeddingEngine || selectedEmbeddingEngine === "none") && embeddingModels.length > 0;
    const isCreateDisabled = mode === "create" && (!selectedEmbeddingEngine || selectedEmbeddingEngine === "none" || !name || !path);

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                        {mode === 'create' ? (
                            <FormattedMessage id="settings.kb.createKB.title" defaultMessage="新增知識庫" />
                        ) : (
                            <FormattedMessage id="settings.kb.editKB.title" defaultMessage="編輯知識庫" />
                        )}
                    </Typography>
                    <IconButton onClick={handleClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent>
                <Box mt={1}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        <FormattedMessage id="dialog.createKB.name" defaultMessage="名稱" />
                        <Box component="span" sx={{ color: "error.main" }}>*</Box>
                    </Typography>
                    <TextField
                        fullWidth
                        placeholder="例如：公司文件"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setNameError(false);
                        }}
                        error={nameError}
                        helperText={nameError ? "請輸入知識庫名稱" : ""}
                        size="small"
                        sx={{ mb: 2 }}
                    />

                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        <FormattedMessage id="dialog.createKB.description" defaultMessage="描述" />
                    </Typography>
                    <TextField
                        fullWidth
                        placeholder="此知識庫的簡要描述"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        multiline
                        rows={2}
                        size="small"
                        sx={{ mb: 2 }}
                    />

                    {mode === 'create' && (
                        <>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                <FormattedMessage id="dialog.createKB.source" defaultMessage="來源類型" />
                            </Typography>

                            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                                <StorageIcon sx={{ color: "primary.main", mr: 1 }} />
                                <Typography variant="body2">Local Store</Typography>
                            </Box>
                        </>
                    )}

                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        <FormattedMessage id="dialog.createKB.path" defaultMessage="路徑" />
                        <Box component="span" sx={{ color: "error.main" }}>*</Box>
                    </Typography>
                    <TextField
                        fullWidth
                        placeholder="輸入文件或目錄路徑"
                        value={path}
                        onChange={(e) => {
                            setPath(e.target.value);
                            setPathError(false);
                        }}
                        error={pathError}
                        helperText={pathError ? "請選擇有效的路徑" : ""}
                        size="small"
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <Link
                                        component="button"
                                        variant="body2"
                                        onClick={handleBrowseFolder}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            textDecoration: 'none',
                                            cursor: 'pointer',
                                            color: 'primary.main'
                                        }}
                                    >
                                        <FolderIcon fontSize="small" sx={{ mr: 0.5 }} />
                                        瀏覽
                                    </Link>
                                </InputAdornment>
                            )
                        }}
                    />

                    {mode === 'create' && (
                        <>
                            <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>
                                <FormattedMessage id="settings.kb.embeddingEngine" defaultMessage="Embedding Engine" />
                                <Box component="span" sx={{ color: "error.main" }}>*</Box>
                            </Typography>
                            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                <InputLabel id="embedding-engine-select-label">
                                    <FormattedMessage id="settings.kb.selectEmbeddingEngine" defaultMessage="Select Embedding Engine" />
                                </InputLabel>
                                <Select
                                    labelId="embedding-engine-select-label"
                                    value={selectedEmbeddingEngine}
                                    onChange={(e) => setSelectedEmbeddingEngine(e.target.value)}
                                    label={<FormattedMessage id="settings.kb.selectEmbeddingEngine" defaultMessage="Select Embedding Engine" />}
                                >
                                    <MenuItem value="" disabled>
                                        <em><FormattedMessage id="settings.kb.pleaseSelect" defaultMessage="Please select" /></em>
                                    </MenuItem>
                                    {embeddingModels.map((model) => (
                                        <MenuItem key={model.id} value={model.id}>
                                            {model.name}
                                        </MenuItem>
                                    ))}
                                    {embeddingModels.length === 0 && (
                                        <MenuItem value="" disabled>
                                            <FormattedMessage id="settings.kb.noEmbeddingModelsAvailable" defaultMessage="No embedding models available" />
                                        </MenuItem>
                                    )}
                                </Select>
                            </FormControl>
                        </>
                    )}
                </Box>

                {showEngineWarning && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        <FormattedMessage
                            id="settings.kb.error.embeddingEngineRequired"
                            defaultMessage="An embedding engine must be selected to create a knowledge base."
                        />
                    </Alert>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose}>
                    <FormattedMessage id="common.cancel" defaultMessage="取消" />
                </Button>
                <Button variant="contained" onClick={handleSubmit} disabled={isCreateDisabled}>
                    {mode === 'create' ? (
                        <FormattedMessage id="common.create" defaultMessage="新建" />
                    ) : (
                        <FormattedMessage id="common.save" defaultMessage="保存" />
                    )}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// Confirmation Dialog for deletion
export function DeleteKBConfirmationDialog({
    open,
    onClose,
    onConfirm,
    dbName
}: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    dbName: string;
}) {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>
                <FormattedMessage id="settings.kb.deleteKB.title" defaultMessage="刪除知識庫" />
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    <FormattedMessage
                        id="dialog.deleteKB.confirmation"
                        defaultMessage="確定要刪除知識庫「{name}」嗎？此操作不可撤銷。"
                        values={{ name: dbName }}
                    />
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>
                    <FormattedMessage id="common.cancel" defaultMessage="取消" />
                </Button>
                <Button color="error" onClick={onConfirm}>
                    <FormattedMessage id="common.delete" defaultMessage="刪除" />
                </Button>
            </DialogActions>
        </Dialog>
    );
}

