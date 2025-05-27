import { useState, useEffect, useCallback } from "react";
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
  InputAdornment,
  DialogContentText,
  Link,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  SelectChangeEvent
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FolderIcon from "@mui/icons-material/Folder";
import StorageIcon from "@mui/icons-material/Storage";
import CloudIcon from "@mui/icons-material/Cloud";
import { FormattedMessage, useIntl } from "react-intl";
import { useKBSettingsStore } from "@/renderer/stores/KB/KBSettingStore";
import { EmbeddingModel, EmbeddingService } from "@/service/ai";
import { IKnowledgeBase } from "../../../../../types/KnowledgeBase/KnowledgeBase";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";

interface CreateKBDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; path: string; sourceType: string; embeddingEngine: string; }) => void;
  database?: IKnowledgeBase | null;
  mode?: 'create' | 'edit';
}

export default function CreateKBDialog({
  open,
  onClose,
  onSubmit,
  database = null,
  mode = 'create'
}: CreateKBDialogProps) {
  const intl = useIntl();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [path, setPath] = useState("");
  const [sourceType, setSourceType] = useState("local-store");
  const [nameError, setNameError] = useState(false);
  const [pathError, setPathError] = useState(false);
  const { embeddingEngine: defaultEmbeddingEngine } = useKBSettingsStore();
  const [embeddingModels, setEmbeddingModels] = useState<EmbeddingModel[]>([]);
  const [selectedEmbeddingEngine, setSelectedEmbeddingEngine] = useState<string>("");
  const { selectedContext } = useCurrentTopicContext();
  const workspaces = useWorkspaceStore(state => state.workspaces || []);

  let currentWorkspaceName: string = intl.formatMessage({ id: "dialog.createKB.placeholder.currentWorkspace", defaultMessage: "the current workspace" });

  if (selectedContext) {
    if (selectedContext.id && Array.isArray(workspaces)) {
      const workspaceFromStore = workspaces.find(ws => ws.id === selectedContext.id);
      if (workspaceFromStore?.name) {
        currentWorkspaceName = workspaceFromStore.name;
      } else if (selectedContext.name) {
        currentWorkspaceName = selectedContext.name;
      }
    } else if (selectedContext.name) {
      currentWorkspaceName = selectedContext.name;
    }
  }

  const kbNameForPath = name.trim() || intl.formatMessage({ id: "dialog.createKB.placeholder.kbName", defaultMessage: "<KB_Name>" });

  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setPath("");
    setNameError(false);
    setPathError(false);

    const isWorkspaceContextAvailable = !!selectedContext?.id;
    const initialSourceType = isWorkspaceContextAvailable ? "onlysaid-kb" : "local-store";
    setSourceType(initialSourceType);

    if (initialSourceType === "onlysaid-kb") {
      setSelectedEmbeddingEngine("");
    } else { // "local-store"
      // Preliminary: Set based on defaultEmbeddingEngine. Refined when models load.
      setSelectedEmbeddingEngine(defaultEmbeddingEngine && defaultEmbeddingEngine !== "none" ? defaultEmbeddingEngine : "");
    }
  }, [selectedContext, defaultEmbeddingEngine, setName, setDescription, setPath, setSourceType, setSelectedEmbeddingEngine, setNameError, setPathError]);

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && database) {
        setName(database.name);
        setDescription(database.description);
        setPath(database.source);
        const dbSourceType = database.url.includes("onlysaid.com") ? "onlysaid-kb" : "local-store";
        setSourceType(dbSourceType);
        setSelectedEmbeddingEngine(database.embedding_engine);
        new EmbeddingService().GetEmbeddingModels().then(setEmbeddingModels).catch(e => console.error("Failed to load models:", e));
      } else if (mode === 'create') {
        resetForm();
        new EmbeddingService().GetEmbeddingModels()
          .then(models => {
            setEmbeddingModels(models);
          })
          .catch(error => console.error("Failed to load embedding models:", error));
      }
    }
  }, [database, mode, open, resetForm, setEmbeddingModels]);

  useEffect(() => {
    if (mode === 'create' && sourceType === 'local-store') {
      if (embeddingModels.length > 0) {
        // Models are loaded, check if defaultEmbeddingEngine is valid and available
        if (defaultEmbeddingEngine && defaultEmbeddingEngine !== "none" && embeddingModels.find(m => m.id === defaultEmbeddingEngine)) {
          setSelectedEmbeddingEngine(defaultEmbeddingEngine);
        } else {
          // Default engine not suitable, not specified, or not in loaded models; clear selection.
          setSelectedEmbeddingEngine("");
        }
      } else {
        // Models not loaded yet or no models exist.
        // If defaultEmbeddingEngine was set by resetForm, and models load empty, it should be cleared.
        // If there's a default engine but it's not "none", and models are empty, it should become ""
        if (defaultEmbeddingEngine && defaultEmbeddingEngine !== "none") {
          // This case implies models are empty, so default can't be valid
          setSelectedEmbeddingEngine("");
        } else {
          // No default or default is "none", already handled by resetForm or above.
          // Ensure it's "" if models are empty.
          setSelectedEmbeddingEngine("");
        }
      }
    }
    // If sourceType is 'onlysaid-kb' or mode is 'edit', other logic handles selectedEmbeddingEngine
  }, [mode, sourceType, embeddingModels, defaultEmbeddingEngine, setSelectedEmbeddingEngine]);

  const handleSubmit = () => {
    if (mode === "create" && sourceType === "local-store" && (!selectedEmbeddingEngine || selectedEmbeddingEngine === "none")) {
      console.error("Embedding engine must be selected for local store.");
      return;
    }

    let finalPath = path;
    let finalEmbeddingEngine = selectedEmbeddingEngine;

    if (mode === "create" && sourceType === "onlysaid-kb") {
      if (!selectedContext?.id) {
        console.error("Workspace context is not available for Onlysaid KB.");
        return;
      }
      finalPath = selectedContext.id;
      finalEmbeddingEngine = "";
    }

    onSubmit({
      name,
      description,
      path: finalPath,
      sourceType,
      embeddingEngine: finalEmbeddingEngine
    });
    if (mode === 'create') {
      resetForm();
    }
  };

  const handleClose = () => {
    if (mode === 'create') {
      resetForm();
    }
    onClose();
  };

  const handleBrowseFolder = async () => {
    try {
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

  const handleSourceTypeChange = (event: SelectChangeEvent<string>) => {
    const newType = event.target.value as string;
    setSourceType(newType);
    setPath("");
    setPathError(false);

    if (newType === "local-store") {
      // When switching to local-store, apply logic based on loaded models and default engine
      if (embeddingModels.length > 0) {
        if (defaultEmbeddingEngine && defaultEmbeddingEngine !== "none" && embeddingModels.find(m => m.id === defaultEmbeddingEngine)) {
          setSelectedEmbeddingEngine(defaultEmbeddingEngine);
        } else {
          setSelectedEmbeddingEngine(""); // Default not applicable or no models, prompt selection
        }
      } else {
        // Models not loaded yet, preliminary set based on default (will be refined by useEffect if in create mode)
        setSelectedEmbeddingEngine(defaultEmbeddingEngine && defaultEmbeddingEngine !== "none" ? defaultEmbeddingEngine : "");
      }
    } else if (newType === "onlysaid-kb") {
      setSelectedEmbeddingEngine(""); // No embedding engine for onlysaid-kb
    }
  };

  const showEngineWarning = mode === "create" && sourceType === "local-store" && (!selectedEmbeddingEngine || selectedEmbeddingEngine === "none") && embeddingModels.length > 0;

  let isSubmitDisabled = false;
  if (mode === 'create') {
    isSubmitDisabled = !name.trim() ||
      (sourceType === "local-store" && (!path.trim() || !selectedEmbeddingEngine || selectedEmbeddingEngine === "none")) ||
      (sourceType === "onlysaid-kb" && !selectedContext?.id);
  } else {
    isSubmitDisabled = !name.trim() ||
      (sourceType === "local-store" && !path.trim());
  }

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
              <FormattedMessage id="settings.kb.createKB.title" defaultMessage="Create Knowledge Base" />
            ) : (
              <FormattedMessage id="settings.kb.editKB.title" defaultMessage="Edit Knowledge Base" />
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
            <FormattedMessage id="dialog.createKB.name" defaultMessage="Name" />
            <Box component="span" sx={{ color: "error.main" }}>*</Box>
          </Typography>
          <TextField
            fullWidth
            placeholder={intl.formatMessage({ id: "dialog.createKB.namePlaceholder", defaultMessage: "Example: Company Documents" })}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(false);
            }}
            error={nameError}
            helperText={nameError ? intl.formatMessage({ id: "dialog.createKB.nameError", defaultMessage: "Please enter a name for the knowledge base" }) : ""}
            size="small"
            sx={{ mb: 2 }}
          />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            <FormattedMessage id="dialog.createKB.description" defaultMessage="Description" />
          </Typography>
          <TextField
            fullWidth
            placeholder={intl.formatMessage({ id: "dialog.createKB.descriptionPlaceholder", defaultMessage: "Brief description of this knowledge base" })}
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
                <FormattedMessage id="dialog.createKB.source" defaultMessage="Source Type" />
              </Typography>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel id="source-type-select-label">
                  <FormattedMessage id="dialog.createKB.sourceSelectLabel" defaultMessage="Select Source Type" />
                </InputLabel>
                <Select
                  labelId="source-type-select-label"
                  value={sourceType}
                  onChange={handleSourceTypeChange}
                  label={intl.formatMessage({ id: "dialog.createKB.sourceSelectLabel", defaultMessage: "Select Source Type" })}
                >
                  <MenuItem value="local-store">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <StorageIcon sx={{ color: "primary.main", mr: 1 }} />
                      <Typography variant="body2">
                        <FormattedMessage id="settings.kb.private.localStore" defaultMessage="Local Storage" />
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="onlysaid-kb">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CloudIcon sx={{ color: "primary.main", mr: 1 }} />
                      <Typography variant="body2">
                        <FormattedMessage id="settings.kb.private.onlysaidKb" defaultMessage="Onlysaid Knowledge Base" />
                      </Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </>
          )}

          {mode === 'create' && sourceType === "onlysaid-kb" && (
            <Box sx={{ mb: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                <FormattedMessage id="dialog.createKB.cloudStorageTitle" defaultMessage="Cloud Storage Information" />
              </Typography>
              {!selectedContext ? (
                <Typography color="error.main" variant="body2">
                  <FormattedMessage id="dialog.createKB.workspaceLoadingError" defaultMessage="Workspace information is not available. Please ensure a workspace is active." />
                </Typography>
              ) : (
                <>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <FormattedMessage
                      id="dialog.createKB.cloudStoragePathInfo"
                      defaultMessage="Storage Location: /storage/{workspaceId}/{kbName}"
                      values={{
                        workspaceId: selectedContext.id,
                        kbName: (
                          <Box component="span" sx={{ fontWeight: 'medium' }}>
                            {kbNameForPath}
                          </Box>
                        ),
                      }}
                    />
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <FormattedMessage
                      id="dialog.createKB.teamAccessInfo"
                      defaultMessage="This knowledge base will be accessible only within the {workspaceName} workspace."
                      values={{ workspaceName: currentWorkspaceName }}
                    />
                  </Typography>
                </>
              )}
            </Box>
          )}

          {(sourceType === "local-store" || (mode === 'edit' && sourceType === "onlysaid-kb")) && (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1, mt: (mode === 'create' && sourceType === "onlysaid-kb") ? 0 : sourceType === "local-store" ? 0 : 1 }}>
                {sourceType === "local-store" ? (
                  <FormattedMessage id="dialog.createKB.path" defaultMessage="Path" />
                ) : (
                  <FormattedMessage id="dialog.createKB.kbId" defaultMessage="Knowledge Base ID" />
                )}
                {sourceType === "local-store" && <Box component="span" sx={{ color: "error.main" }}>*</Box>}
              </Typography>
              <TextField
                fullWidth
                placeholder={sourceType === "local-store"
                  ? intl.formatMessage({ id: "dialog.createKB.pathPlaceholder", defaultMessage: "Enter file or directory path" })
                  : ""
                }
                value={path}
                onChange={(e) => {
                  if (sourceType === "local-store") {
                    setPath(e.target.value);
                    setPathError(false);
                  }
                }}
                error={pathError && sourceType === "local-store"}
                helperText={pathError && sourceType === "local-store"
                  ? intl.formatMessage({ id: "dialog.createKB.pathError", defaultMessage: "Please select a valid path" })
                  : ""
                }
                size="small"
                disabled={mode === 'edit' && sourceType === "onlysaid-kb"}
                InputProps={{
                  endAdornment: sourceType === "local-store" ? (
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
                        <FormattedMessage id="dialog.createKB.browse" defaultMessage="Browse" />
                      </Link>
                    </InputAdornment>
                  ) : undefined
                }}
                sx={{ mb: 2 }}
              />
            </>
          )}

          {mode === 'create' && sourceType === "local-store" && (
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
          {mode === 'edit' && sourceType === "local-store" && database?.embedding_engine && (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>
                <FormattedMessage id="settings.kb.embeddingEngine" defaultMessage="Embedding Engine" />
              </Typography>
              <TextField
                fullWidth
                value={embeddingModels.find(m => m.id === database.embedding_engine)?.name || database.embedding_engine}
                disabled
                size="small"
                sx={{ mb: 2 }}
              />
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
          <FormattedMessage id="common.cancel" defaultMessage="Cancel" />
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isSubmitDisabled}>
          {mode === 'create' ? (
            <FormattedMessage id="common.create" defaultMessage="Create" />
          ) : (
            <FormattedMessage id="common.save" defaultMessage="Save" />
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

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
        <FormattedMessage id="settings.kb.deleteKB.title" defaultMessage="Delete Knowledge Base" />
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          <FormattedMessage
            id="dialog.deleteKB.confirmation"
            defaultMessage="Are you sure you want to delete knowledge base '{name}'? This action cannot be undone."
            values={{ name: dbName }}
          />
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          <FormattedMessage id="common.cancel" defaultMessage="Cancel" />
        </Button>
        <Button color="error" onClick={onConfirm}>
          <FormattedMessage id="common.delete" defaultMessage="Delete" />
        </Button>
      </DialogActions>
    </Dialog>
  );
}

