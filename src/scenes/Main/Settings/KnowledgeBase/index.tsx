import { Box, Typography, Card, CardContent, Chip, Stack, CircularProgress, Divider, IconButton, Switch, Tooltip } from "@mui/material";
import { useState, useEffect, useMemo, useCallback } from "react";
import SettingsSection from "@/components/Settings/SettingsSection";
import { FormattedMessage, useIntl } from "react-intl";
import { useTopicStore, useCurrentTopicContext, KNOWLEDGE_BASE_SELECTION_KEY } from "@/stores/Topic/TopicStore";
import { toast } from "@/utils/toast";
import { EmbeddingModel, EmbeddingService } from "@/service/ai";
import { IKnowledgeBase, IKnowledgeBaseRegisterArgs, IKBGetStatusIPCArgs, IKBRegisterIPCArgs, IKBFullUpdateIPCArgs } from "@/../../types/KnowledgeBase/KnowledgeBase";
import { useKBStore } from "@/stores/KB/KBStore";
import CreateKBDialog, { DeleteKBConfirmationDialog } from "@/components/Dialog/CreateKBDialog";
import { v4 as uuidv4 } from 'uuid';
import CloudIcon from "@mui/icons-material/Cloud";
import StorageIcon from "@mui/icons-material/Storage";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import KBInfo from './KBInfo';
import KBExplorer, { IKBStatus } from './KBExplorer';
import { getUserTokenFromStore } from '@/utils/user';

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
    registerKB,
    fullUpdateKB,
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
      const kbIdToView = selectedKnowledgeBase?.id;

      viewKBStructure(currentWorkspaceId, kbIdToView)
        .then(result => {
          if (kbIdToView) {
            console.log(`KB structure response for ${kbIdToView}:`, result);
          } else {
            console.log("KB structure response for all KBs in workspace:", result);
          }
        })
        .catch(err => {
          console.error(`Error viewing KB structure for ${kbIdToView || 'all KBs'}:`, err);
        });
    }
  }, [currentWorkspaceId, selectedKnowledgeBase]);

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
      const updates: Partial<Omit<IKnowledgeBase, 'id' | 'workspace_id' | 'create_at' | 'embedding_engine' | 'type' | 'source'>> & { update_at: string } = {
        name: data.name,
        description: data.description,
        update_at: new Date().toISOString(),
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

      const userToken = getUserTokenFromStore();
      if (!userToken) {
        toast.error(intl.formatMessage({ id: "settings.kb.auth.tokenMissing", defaultMessage: "Authentication token is missing. Cannot update knowledge base status." }));
        return;
      }

      // Attempt to update the knowledge base's enabled status in the primary data store.
      const updatedKbFromStore = await updateKnowledgeBase(currentWorkspaceId, selectedKnowledgeBase.id, {
        enabled,
        update_at: new Date().toISOString(),
      });

      if (updatedKbFromStore) {
        // Primary update was successful.
        toast.success(intl.formatMessage({
          id: enabled ? "settings.kb.enable.success" : "settings.kb.disable.success",
          defaultMessage: enabled ? "Knowledge base enabled." : "Knowledge base disabled."
        }));
        // Refresh UI from the source of truth immediately after successful update.
        fetchAndSetSelectedKbDetails(selectedKnowledgeBase.id);

        if (enabled) {
          // If enabling, proceed to register the KB using the fresh data.
          // Ensure the kbData sent for registration reflects the latest state including update_at
          const kbDataForRegistration = {
            ...updatedKbFromStore, // This object already has the new 'enabled' and 'update_at'
            // id, workspace_id, name, description, url, type, source, embedding_engine, configured are from updatedKbFromStore
          };

          const registerArgs: IKBRegisterIPCArgs = {
            kbData: kbDataForRegistration,
            token: userToken,
          };
          try {
            const registrationResult = await registerKB(registerArgs);
            if (registrationResult) {
              toast.success(intl.formatMessage({ id: "settings.kb.register.success", defaultMessage: "Knowledge base registered successfully." }));
            } else {
              toast.error(intl.formatMessage({ id: "settings.kb.register.error", defaultMessage: "Failed to register knowledge base." }));
            }
          } catch (error: any) {
            console.error("Error registering KB:", error);
            toast.error(intl.formatMessage({ id: "settings.kb.register.exception", defaultMessage: "An error occurred during knowledge base registration." }) + ` ${error.message}`);
          }
        } else {
          // If disabling, proceed with fullUpdateKB for backend synchronization, using fresh data.
          // Ensure kbData sent for full update reflects the latest state including update_at
          const kbDataForFullUpdate = {
            ...updatedKbFromStore, // This object already has the new 'enabled' and 'update_at'
          };
          const fullUpdateArgs: IKBFullUpdateIPCArgs = {
            kbId: updatedKbFromStore.id,
            workspaceId: updatedKbFromStore.workspace_id,
            token: userToken,
            kbData: kbDataForFullUpdate
          };
          try {
            await fullUpdateKB(fullUpdateArgs);
            // Handle success/failure of fullUpdateKB if necessary, e.g., if it returns a status.
            // For now, we assume the primary disable action is complete.
          } catch (error: any) {
            console.error("Error disabling KB via fullUpdateKB:", error);
            toast.error(intl.formatMessage({ id: "settings.kb.update.error.exception", defaultMessage: "An error occurred while finalizing the disabling of the knowledge base." }) + ` ${error.message}`);
          }
        }
      } else {
        // updateKnowledgeBase failed for either enabling or disabling.
        toast.error(intl.formatMessage({ id: "settings.kb.update.error", defaultMessage: "Failed to update knowledge base status." }));
      }
    }
  }, [selectedKnowledgeBase, currentWorkspaceId, updateKnowledgeBase, intl, fetchAndSetSelectedKbDetails, registerKB, fullUpdateKB]);

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

  const dynamicKbStatusSectionTitle = useMemo(() => {
    return intl.formatMessage({ id: "settings.kb.explorerSection.title", defaultMessage: "KB Explorer" });
  }, [intl]);

  const handleReinitialize = useCallback(async () => {
    if (selectedKnowledgeBase && currentWorkspaceId) {
      toast.info(intl.formatMessage(
        { id: "settings.kb.reinitialize.placeholder", defaultMessage: "Synchronize action for '{kbName}' needs to be implemented." },
        { kbName: selectedKnowledgeBase.name }
      ));
    }
  }, [selectedKnowledgeBase, currentWorkspaceId, intl]);

  const handleRefreshDetails = useCallback(() => {
    if (selectedKnowledgeBase?.id) {
      fetchAndSetSelectedKbDetails(selectedKnowledgeBase.id);
      // Also re-fetch status when details are manually refreshed
      if (currentWorkspaceId) {
        const token = ""; // Or retrieve appropriately
        setIsStatusLoading(true);
        setKbStatus(null);
        const args: IKBGetStatusIPCArgs = {
          kbId: selectedKnowledgeBase.id,
          workspaceId: currentWorkspaceId,
          token: token,
        };
        getKBStatus(args)
          .then(statusResult => {
            setKbStatus({ ...statusResult, lastChecked: new Date().toISOString() });
          })
          .catch(err => {
            setKbStatus({ errorDetails: err.message || 'Failed to fetch status', lastChecked: new Date().toISOString() });
          })
          .finally(() => {
            setIsStatusLoading(false);
          });
      }
    }
  }, [selectedKnowledgeBase, fetchAndSetSelectedKbDetails, currentWorkspaceId, getKBStatus]);

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
            kbRawStatus={kbStatus}
            isLoading={isLoadingDetails}
            isKbStatusLoading={isStatusLoading}
            onToggleEnabled={handleToggleEnabled}
            onReinitialize={handleReinitialize}
            onRefreshDetails={handleRefreshDetails}
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

      {selectedKnowledgeBase && currentWorkspaceId && (
        <SettingsSection
          title={dynamicKbStatusSectionTitle}
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

      {selectedKnowledgeBase && editDialogOpen && (
        <CreateKBDialog
          open={editDialogOpen}
          onClose={handleCloseEditDialog}
          onSubmit={handleEditDatabase}
          database={selectedKnowledgeBase}
          mode="edit"
        />
      )}

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
