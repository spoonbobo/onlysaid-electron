import { Box, Typography, Card, CardContent, Chip, Stack, CircularProgress, Divider, IconButton, Switch, Tooltip } from "@mui/material";
import { useState, useEffect, useMemo, useCallback } from "react";
import SettingsSection from "@/components/Settings/SettingsSection";
import { FormattedMessage, useIntl } from "react-intl";
import { useTopicStore, useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import { toast } from "@/utils/toast";
import { EmbeddingModel, EmbeddingService } from "@/service/ai";
import { IKnowledgeBase, IKnowledgeBaseRegisterArgs } from "@/../../types/KnowledgeBase/KnowledgeBase";
import { useKBStore } from "@/stores/KB/KBStore";
import CreateKBDialog, { DeleteKBConfirmationDialog } from "@/components/Dialog/CreateKBDialog";
import { v4 as uuidv4 } from 'uuid';
import CloudIcon from "@mui/icons-material/Cloud";
import StorageIcon from "@mui/icons-material/Storage";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import { useKBConfigurationStore } from "@/stores/KB/KBConfigurationStore";

// This key should ideally be shared, e.g., exported from TopicStore or a constants file
const KNOWLEDGE_BASE_SELECTION_KEY = "knowledgeBaseMenu:selectedId";

function KnowledgeBaseManagerComponent() {
  const intl = useIntl();
  const { selectedContext } = useCurrentTopicContext();
  const { selectedTopics, clearSelectedTopic } = useTopicStore();

  const {
    isLoading: kbStoreIsLoadingGlobal,
    error: kbStoreErrorGlobal,
    getKnowledgeBaseById,
    updateKnowledgeBase,
    deleteKnowledgeBase,
    createKnowledgeBase,
  } = useKBStore();

  const { isCreateKBDialogOpen, closeCreateKBDialog } = useKBConfigurationStore();

  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<IKnowledgeBase | null>(null);
  const [embeddingModels, setEmbeddingModels] = useState<EmbeddingModel[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const currentWorkspaceId = useMemo(() => {
    return selectedContext?.type === "workspace" ? selectedContext.id : undefined;
  }, [selectedContext]);

  const selectedKbId = selectedTopics[KNOWLEDGE_BASE_SELECTION_KEY];

  useEffect(() => {
    const embeddingService = new EmbeddingService();
    embeddingService.GetEmbeddingModels()
      .then(models => setEmbeddingModels(models))
      .catch(error => console.error("Failed to load embedding models:", error));
  }, []);

  const fetchAndSetSelectedKbDetails = useCallback(async (idToFetch?: string) => {
    const kbIdToUse = idToFetch || selectedKbId;
    if (kbIdToUse && currentWorkspaceId) {
      setIsLoadingDetails(true);
      if (!idToFetch) setSelectedKnowledgeBase(null); // Clear previous if it's a new selectedKbId
      try {
        const kb = await getKnowledgeBaseById(currentWorkspaceId, kbIdToUse);
        if (kb) {
          setSelectedKnowledgeBase(kb);
          if (idToFetch) { // If specifically refreshing
            toast.success(intl.formatMessage({ id: "settings.kb.fetch.success", defaultMessage: "Knowledge base details refreshed." }));
          }
        } else {
          setSelectedKnowledgeBase(null); // Explicitly nullify if not found
          if (idToFetch) { // If specifically refreshing
            toast.info(intl.formatMessage({ id: "settings.kb.fetch.notFound", defaultMessage: "Knowledge base details not found after refresh attempt." }));
          } else if (selectedKbId) { // Only show not found if an ID was actually selected
            toast.info(intl.formatMessage({ id: "settings.kb.selected.notFound", defaultMessage: "Selected knowledge base not found." }));
          }
        }
      } catch (error) {
        toast.error(intl.formatMessage({ id: "settings.kb.selected.fetchError", defaultMessage: "Failed to fetch selected knowledge base details." }));
        console.error("Error fetching KB details:", error);
      } finally {
        setIsLoadingDetails(false);
      }
    } else {
      setSelectedKnowledgeBase(null); // Clear details if no selection or workspace
      setIsLoadingDetails(false);
    }
  }, [selectedKbId, currentWorkspaceId, getKnowledgeBaseById, intl]);

  useEffect(() => {
    fetchAndSetSelectedKbDetails();
  }, [selectedKbId, currentWorkspaceId]); // Re-fetch when selectedKbId or workspace changes

  const handleOpenEditDialog = useCallback(() => {
    if (selectedKnowledgeBase) {
      setEditDialogOpen(true);
    }
  }, [selectedKnowledgeBase]);

  const handleCloseEditDialog = useCallback(() => {
    setEditDialogOpen(false);
  }, []);

  const handleEditDatabase = useCallback(async (data: { name: string; description: string; path: string; sourceType: string; /* embeddingEngine: string; */ }) => {
    if (selectedKnowledgeBase && currentWorkspaceId) {
      const updates: Partial<Omit<IKnowledgeBase, 'id' | 'workspace_id' | 'create_at' | 'embedding_engine' | 'type' | 'source'>> = {
        name: data.name,
        description: data.description,
      };
      // Only allow path update for private KBs if it has changed
      if (selectedKnowledgeBase.type === 'private' && data.path !== selectedKnowledgeBase.url) {
        updates.url = data.path;
      }

      const updatedKb = await updateKnowledgeBase(currentWorkspaceId, selectedKnowledgeBase.id, updates);
      if (updatedKb) {
        toast.success(intl.formatMessage({ id: "settings.kb.edit.success", defaultMessage: "Knowledge base updated." }));
        fetchAndSetSelectedKbDetails(selectedKnowledgeBase.id); // Re-fetch details
        handleCloseEditDialog();
      } else {
        toast.error(intl.formatMessage({ id: "settings.kb.edit.error", defaultMessage: "Failed to update knowledge base." }));
      }
    }
  }, [selectedKnowledgeBase, currentWorkspaceId, updateKnowledgeBase, intl, handleCloseEditDialog, fetchAndSetSelectedKbDetails]);

  const handleOpenDeleteDialog = useCallback(() => {
    if (selectedKnowledgeBase) {
      setDeleteDialogOpen(true);
    }
  }, [selectedKnowledgeBase]);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (selectedKnowledgeBase && currentWorkspaceId) {
      const success = await deleteKnowledgeBase(currentWorkspaceId, selectedKnowledgeBase.id);
      if (success) {
        toast.success(intl.formatMessage({ id: "settings.kb.delete.success", defaultMessage: "Knowledge base deleted." }));
        setSelectedKnowledgeBase(null); // Clear the local selected KB in this component
        clearSelectedTopic(KNOWLEDGE_BASE_SELECTION_KEY); // Clear the selection in TopicStore
      } else {
        toast.error(intl.formatMessage({ id: "settings.kb.delete.error", defaultMessage: "Failed to delete knowledge base." }));
      }
      handleCloseDeleteDialog();
    }
  }, [selectedKnowledgeBase, currentWorkspaceId, deleteKnowledgeBase, intl, handleCloseDeleteDialog, clearSelectedTopic]);

  const handleToggleEnabled = useCallback(async (enabled: boolean) => {
    if (selectedKnowledgeBase && currentWorkspaceId) {
      if (!selectedKnowledgeBase.configured) {
        toast.warning(intl.formatMessage({ id: "settings.kb.enable.notConfiguredWarn", defaultMessage: "Cannot enable/disable a non-configured knowledge base." }));
        return;
      }
      const success = await updateKnowledgeBase(currentWorkspaceId, selectedKnowledgeBase.id, { enabled });
      if (success) {
        toast.success(intl.formatMessage({
          id: enabled ? "settings.kb.enable.success" : "settings.kb.disable.success",
          defaultMessage: `Knowledge base ${enabled ? 'enabled' : 'disabled'}.`
        }));
        fetchAndSetSelectedKbDetails(selectedKnowledgeBase.id); // Re-fetch details
      } else {
        toast.error(intl.formatMessage({ id: "settings.kb.update.error", defaultMessage: "Failed to update knowledge base status." }));
      }
    }
  }, [selectedKnowledgeBase, currentWorkspaceId, updateKnowledgeBase, intl, fetchAndSetSelectedKbDetails]);

  const getEmbeddingEngineName = useCallback((engineId: string) => {
    if (!engineId) return intl.formatMessage({ id: "settings.kb.embedding.notApplicable", defaultMessage: "N/A" });
    const model = embeddingModels.find(m => m.id === engineId);
    return model ? model.name : engineId;
  }, [embeddingModels, intl]);

  const getKbSourceIconAndLabel = useCallback((db: IKnowledgeBase) => {
    const isOnlysaidKb = db.source === "onlysaid-kb" || (db.url && db.url.includes("onlysaid.com"));
    if (isOnlysaidKb) {
      return {
        icon: <CloudIcon fontSize="small" />,
        label: intl.formatMessage({
          id: "settings.kb.source.onlysaidKb",
          defaultMessage: "Onlysaid Cloud KB"
        }),
        color: "info" as "info",
      };
    }
    return {
      icon: <StorageIcon fontSize="small" />,
      label: intl.formatMessage({
        id: "settings.kb.source.localKb",
        defaultMessage: "Local Storage KB"
      }),
      color: "default" as "default",
    };
  }, [intl]);

  const renderDetailItem = (labelId: string, defaultValue: string, value?: string | number | null) => (
    <Typography variant="body2" gutterBottom sx={{ display: 'flex' }}>
      <FormattedMessage id={labelId} defaultMessage={defaultValue} />:&nbsp;
      <Typography component="span" fontWeight="bold">{value ?? "-"}</Typography>
    </Typography>
  );

  const title = selectedKnowledgeBase
    ? selectedKnowledgeBase.name
    : intl.formatMessage({ id: "settings.kb.selected.title", defaultMessage: "Knowledge Base Details" });

  // Placeholder for reinitialize logic
  const handleReinitialize = useCallback(async () => {
    if (selectedKnowledgeBase && currentWorkspaceId) {
      // TODO: Implement reinitialization logic for selectedKnowledgeBase.id
      // This might involve calling a new method in useKBStore or a service.
      toast.info(intl.formatMessage(
        { id: "settings.kb.reinitialize.placeholder", defaultMessage: "Reinitialize action for '{kbName}' needs to be implemented." },
        { kbName: selectedKnowledgeBase.name }
      ));
    }
  }, [selectedKnowledgeBase, currentWorkspaceId, intl]);

  const handleCreateKnowledgeBase = useCallback(async (data: { name: string; description: string; path: string; sourceType: string; embeddingEngine: string; }) => {
    if (!currentWorkspaceId) {
      toast.error(intl.formatMessage({ id: "settings.kb.create.noWorkspaceContext", defaultMessage: "An active workspace is required to create a knowledge base." }));
      return;
    }

    const args: IKnowledgeBaseRegisterArgs = {
      id: uuidv4(),
      workspace_id: currentWorkspaceId,
      name: data.name,
      description: data.description,
      url: data.path,
      type: 'private',
      source: data.sourceType,
      embedding_engine: data.embeddingEngine,
    };

    const newKb = await createKnowledgeBase(args);
    if (newKb) {
      toast.success(intl.formatMessage({ id: "settings.kb.create.success", defaultMessage: "Knowledge base created successfully." }));
      // Optionally, select the new KB or simply close dialog
      // fetchAndSetSelectedKbDetails(newKb.id); // Or rely on menu refresh + user selection
      closeCreateKBDialog();
    } else {
      // Error is usually handled by store or if it returns undefined
      toast.error(intl.formatMessage({ id: "settings.kb.create.error", defaultMessage: "Failed to create knowledge base." }));
    }
  }, [currentWorkspaceId, createKnowledgeBase, intl, closeCreateKBDialog, fetchAndSetSelectedKbDetails]);

  return (
    <Box sx={{ mb: 4 }}>
      <SettingsSection
        title={title}
      >
        {isLoadingDetails || kbStoreIsLoadingGlobal ? ( // kbStoreIsLoadingGlobal for initial app load checks if needed
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>
              <FormattedMessage id="settings.kb.selected.loading" defaultMessage="Loading details..." />
            </Typography>
          </Box>
        ) : kbStoreErrorGlobal ? (
          <Typography color="error" sx={{ textAlign: 'center', py: 4 }}>
            <FormattedMessage id="settings.kb.selected.loadErrorGlobal" defaultMessage="Error loading knowledge base system." /> {kbStoreErrorGlobal}
          </Typography>
        ) : selectedKnowledgeBase && currentWorkspaceId ? (
          <Card sx={{ width: '100%' }} elevation={0}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    {selectedKnowledgeBase.description || intl.formatMessage({ id: "settings.kb.selected.noDescription", defaultMessage: "No description provided." })}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
                  <Tooltip title={intl.formatMessage({ id: "settings.kb.private.reinitialize", defaultMessage: "Reinitialize" })}>
                    <IconButton size="small" color="secondary" onClick={handleReinitialize}>
                      <ReplayIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={intl.formatMessage({ id: "settings.kb.private.edit", defaultMessage: "Edit" })}>
                    <IconButton size="small" color="primary" onClick={handleOpenEditDialog}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={intl.formatMessage({ id: "settings.kb.private.delete", defaultMessage: "Delete" })}>
                    <IconButton size="small" color="error" onClick={handleOpenDeleteDialog}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  color={selectedKnowledgeBase.configured ? "success" : "warning"}
                  label={intl.formatMessage({
                    id: selectedKnowledgeBase.configured ? "settings.kb.status.configured" : "settings.kb.status.notConfigured",
                    defaultMessage: selectedKnowledgeBase.configured ? "Configured" : "Not Configured"
                  })}
                />
                {selectedKnowledgeBase.configured && (
                  <Chip
                    size="small"
                    color={selectedKnowledgeBase.enabled ? "primary" : "default"}
                    label={intl.formatMessage({
                      id: selectedKnowledgeBase.enabled ? "settings.kb.status.enabled" : "settings.kb.status.disabled",
                      defaultMessage: selectedKnowledgeBase.enabled ? "Enabled" : "Disabled"
                    })}
                  />
                )}
                <Chip
                  size="small"
                  icon={getKbSourceIconAndLabel(selectedKnowledgeBase).icon}
                  label={getKbSourceIconAndLabel(selectedKnowledgeBase).label}
                  color={getKbSourceIconAndLabel(selectedKnowledgeBase).color}
                />
                {selectedKnowledgeBase.embedding_engine && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={getEmbeddingEngineName(selectedKnowledgeBase.embedding_engine)}
                    title={intl.formatMessage({ id: "settings.kb.embeddingEngineUsed", defaultMessage: "Embedding Engine" })}
                  />
                )}
              </Stack>

              <Divider sx={{ my: 2 }} />

              {renderDetailItem("settings.kb.selected.id", "ID", selectedKnowledgeBase.id)}
              {renderDetailItem("settings.kb.selected.documents", "Documents", selectedKnowledgeBase.configured ? selectedKnowledgeBase.documents : undefined)}
              {renderDetailItem(
                "settings.kb.selected.size", "Size (KB)",
                selectedKnowledgeBase.configured && selectedKnowledgeBase.size != null ? (selectedKnowledgeBase.size / 1024).toFixed(2) : undefined
              )}
              {renderDetailItem(
                "settings.kb.selected.createdAt", "Created",
                new Date(selectedKnowledgeBase.create_at).toLocaleDateString()
              )}
              {selectedKnowledgeBase.type === 'private' && renderDetailItem(
                "settings.kb.selected.path", "Path/URL",
                selectedKnowledgeBase.url
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                <Typography variant="body2">
                  <FormattedMessage id="settings.kb.private.enableKB" defaultMessage="Enable Knowledge Base" />
                </Typography>
                <Switch
                  checked={selectedKnowledgeBase.enabled}
                  onChange={(e) => handleToggleEnabled(e.target.checked)}
                  disabled={!selectedKnowledgeBase.configured || isLoadingDetails}
                  size="small"
                />
              </Box>

            </CardContent>
          </Card>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <InfoOutlinedIcon color="action" sx={{ fontSize: 40 }} />
            <Typography variant="body1" color="text.secondary">
              <FormattedMessage
                id="settings.kb.selected.noKbSelectedOrWorkspace"
                defaultMessage="Select a knowledge base from the menu to view and manage its details."
              />
            </Typography>
            {!currentWorkspaceId && (
              <Typography variant="caption" color="text.secondary">
                <FormattedMessage id="settings.kb.selected.noWorkspaceActive" defaultMessage="An active workspace is required." />
              </Typography>
            )}
            {currentWorkspaceId && !selectedKbId && (
              <Typography variant="caption" color="text.secondary">
                <FormattedMessage id="settings.kb.selected.promptToSelect" defaultMessage="Please choose a KB from the side menu." />
              </Typography>
            )}
          </Box>
        )}
      </SettingsSection>

      {/* Dialog for Editing existing KB */}
      {selectedKnowledgeBase && editDialogOpen && (
        <CreateKBDialog
          open={editDialogOpen}
          onClose={handleCloseEditDialog}
          onSubmit={handleEditDatabase}
          database={selectedKnowledgeBase}
          mode="edit"
        />
      )}

      {/* Dialog for Creating new KB - driven by global state */}
      <CreateKBDialog
        open={isCreateKBDialogOpen}
        onClose={closeCreateKBDialog}
        onSubmit={handleCreateKnowledgeBase}
        mode="create"
      />

      {selectedKnowledgeBase && deleteDialogOpen && (
        <DeleteKBConfirmationDialog
          open={deleteDialogOpen}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleConfirmDelete}
          dbName={selectedKnowledgeBase.name}
        />
      )}
    </Box>
  );
}

export default KnowledgeBaseManagerComponent;
