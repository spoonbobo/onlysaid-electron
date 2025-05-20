import { Box, Typography, Card, CardContent, Chip, Stack, CircularProgress, Divider, IconButton, Switch, Tooltip } from "@mui/material";
import { useState, useEffect, useMemo, useCallback } from "react";
import SettingsSection from "@/components/Settings/SettingsSection";
import { FormattedMessage, useIntl } from "react-intl";
import { useTopicStore, useCurrentTopicContext, KNOWLEDGE_BASE_SELECTION_KEY } from "@/stores/Topic/TopicStore";
import { toast } from "@/utils/toast";
import { EmbeddingModel, EmbeddingService } from "@/service/ai";
import { IKnowledgeBase, IKnowledgeBaseRegisterArgs, IKBGetStatusIPCArgs } from "@/../../types/KnowledgeBase/KnowledgeBase";
import { useKBStore } from "@/stores/KB/KBStore";
import CreateKBDialog, { DeleteKBConfirmationDialog } from "@/components/Dialog/CreateKBDialog";
import { v4 as uuidv4 } from 'uuid';
import CloudIcon from "@mui/icons-material/Cloud";
import StorageIcon from "@mui/icons-material/Storage";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import KBInfo from './KBInfo';
import KBExplorer, { IKBStatus } from './KBExplorer';

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
    isCreateKBDialogOpen,
    closeCreateKBDialog,
    getKBStatus,
  } = useKBStore();

  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<IKnowledgeBase | null>(null);
  const [embeddingModels, setEmbeddingModels] = useState<EmbeddingModel[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [kbStatus, setKbStatus] = useState<IKBStatus | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);

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
      setKbStatus(null);
      if (!idToFetch) setSelectedKnowledgeBase(null);
      try {
        const kb = await getKnowledgeBaseById(currentWorkspaceId, kbIdToUse);
        if (kb) {
          setSelectedKnowledgeBase(kb);
          if (idToFetch) {
            toast.success(intl.formatMessage({ id: "settings.kb.fetch.success", defaultMessage: "Knowledge base details refreshed." }));
          }
        } else {
          setSelectedKnowledgeBase(null);
          if (idToFetch) {
            toast.info(intl.formatMessage({ id: "settings.kb.fetch.notFound", defaultMessage: "Knowledge base details not found after refresh attempt." }));
          } else if (selectedKbId) {
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
      setSelectedKnowledgeBase(null);
      setKbStatus(null);
      setIsLoadingDetails(false);
    }
  }, [selectedKbId, currentWorkspaceId, getKnowledgeBaseById, intl]);

  useEffect(() => {
    fetchAndSetSelectedKbDetails();
  }, [selectedKbId, currentWorkspaceId]);

  useEffect(() => {
    if (currentWorkspaceId) {
      const viewKBStructure = useKBStore.getState().viewKnowledgeBaseStructure;

      viewKBStructure(currentWorkspaceId)
        .then(result => {
          console.log("KB structure response:", result);
        })
        .catch(err => {
          console.error("Error testing KB view:", err);
        });
    }
  }, [currentWorkspaceId]);

  useEffect(() => {
    if (selectedKnowledgeBase && currentWorkspaceId) {
      const token = "";
      setIsStatusLoading(true);
      setKbStatus(null);

      console.log(`Checking status for KB: ${selectedKnowledgeBase.id} in workspace ${currentWorkspaceId}`);
      const args: IKBGetStatusIPCArgs = {
        kbId: selectedKnowledgeBase.id,
        workspaceId: currentWorkspaceId,
        token: token,
      };

      getKBStatus(args)
        .then(statusResult => {
          console.log(`Status for KB ${selectedKnowledgeBase.id}:`, statusResult);
          setKbStatus({ ...statusResult, lastChecked: new Date().toISOString() });
        })
        .catch(err => {
          console.error(`Error getting status for KB ${selectedKnowledgeBase.id}:`, err);
          setKbStatus({ errorDetails: err.message || 'Failed to fetch status', lastChecked: new Date().toISOString() });
        })
        .finally(() => {
          setIsStatusLoading(false);
        });
    } else {
      setKbStatus(null);
      setIsStatusLoading(false);
    }
  }, [selectedKnowledgeBase, currentWorkspaceId, getKBStatus]);

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
      if (selectedKnowledgeBase.type === 'private' && data.path !== selectedKnowledgeBase.url) {
        updates.url = data.path;
      }

      const updatedKb = await updateKnowledgeBase(currentWorkspaceId, selectedKnowledgeBase.id, updates);
      if (updatedKb) {
        toast.success(intl.formatMessage({ id: "settings.kb.edit.success", defaultMessage: "Knowledge base updated." }));
        fetchAndSetSelectedKbDetails(selectedKnowledgeBase.id);
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
        setSelectedKnowledgeBase(null);
        clearSelectedTopic(KNOWLEDGE_BASE_SELECTION_KEY);
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
        fetchAndSetSelectedKbDetails(selectedKnowledgeBase.id);
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

  const settingsSectionTitle = intl.formatMessage({ id: "settings.kb.section.title", defaultMessage: "Knowledge Base Details" });
  const kbStatusSectionTitleBase = intl.formatMessage({ id: "settings.kb.statusSection.title", defaultMessage: "Knowledge Base Status" });

  // Determine the dynamic title for the status section
  const dynamicKbStatusSectionTitle = useMemo(() => {
    if (isStatusLoading) {
      return kbStatusSectionTitleBase; // Show "Knowledge Base Status" while loading
    }
    if (kbStatus && kbStatus.Status) { // Assuming 'Status' is the field from your status object
      return kbStatus.Status;
    }
    // Fallback if status is not yet loaded/available but section is rendered
    return kbStatusSectionTitleBase;
  }, [kbStatus, isStatusLoading, kbStatusSectionTitleBase]);

  const handleReinitialize = useCallback(async () => {
    if (selectedKnowledgeBase && currentWorkspaceId) {
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

    let url = data.path;

    if (data.sourceType === "onlysaid-kb" && !url.startsWith("/storage/")) {
      url = `/storage/${currentWorkspaceId}/kb/${data.name.trim()}`;
    }

    const args: IKnowledgeBaseRegisterArgs = {
      id: uuidv4(),
      workspace_id: currentWorkspaceId,
      name: data.name,
      description: data.description,
      url: url,
      type: 'private',
      source: data.sourceType,
      embedding_engine: data.embeddingEngine,
      configured: true,
    };

    const newKb = await createKnowledgeBase(args);
    if (newKb) {
      toast.success(intl.formatMessage({ id: "settings.kb.create.success", defaultMessage: "Knowledge base created successfully." }));
      closeCreateKBDialog();
    } else {
      toast.error(intl.formatMessage({ id: "settings.kb.create.error", defaultMessage: "Failed to create knowledge base." }));
    }
  }, [currentWorkspaceId, createKnowledgeBase, intl, closeCreateKBDialog, fetchAndSetSelectedKbDetails]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SettingsSection
        title={settingsSectionTitle}
      >
        {isLoadingDetails || kbStoreIsLoadingGlobal ? (
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
          <KBInfo
            knowledgeBase={selectedKnowledgeBase}
            isLoading={isLoadingDetails}
            onToggleEnabled={handleToggleEnabled}
            onReinitialize={handleReinitialize}
            onEdit={handleOpenEditDialog}
            onDelete={handleOpenDeleteDialog}
            getEmbeddingEngineName={getEmbeddingEngineName}
            getKbSourceIconAndLabel={getKbSourceIconAndLabel}
          />
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

      {/* KB Status Section - Title is now just the status value or a fallback */}
      {selectedKnowledgeBase && currentWorkspaceId && (
        <SettingsSection
          title={dynamicKbStatusSectionTitle} // Use the updated dynamic title
          sx={{
            mt: 2,
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <KBExplorer
            kbStatus={kbStatus}
            isLoading={isStatusLoading}
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
            }}
          />
        </SettingsSection>
      )}

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
