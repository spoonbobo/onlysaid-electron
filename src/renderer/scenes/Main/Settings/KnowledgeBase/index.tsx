import { Box, Typography, Card, CardContent, Chip, Stack, CircularProgress, Divider, IconButton, Switch, Tooltip } from "@mui/material";
import { useState, useEffect, useMemo, useCallback } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useTopicStore, useCurrentTopicContext, KNOWLEDGE_BASE_SELECTION_KEY } from "@/renderer/stores/Topic/TopicStore";
import { toast } from "@/utils/toast";
import { EmbeddingModel, EmbeddingService } from "@/service/ai";
import { IKnowledgeBase, IKnowledgeBaseRegisterArgs, IKBGetStatusIPCArgs, IKBRegisterIPCArgs, IKBFullUpdateIPCArgs } from "@/../../types/KnowledgeBase/KnowledgeBase";
import { useKBStore } from "@/renderer/stores/KB/KBStore";
import CreateKBDialog, { DeleteKBConfirmationDialog } from "@/renderer/components/Dialog/KB/CreateKBDialog";
import { v4 as uuidv4 } from 'uuid';
import CloudIcon from "@mui/icons-material/Cloud";
import StorageIcon from "@mui/icons-material/Storage";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import KBInfo from './KBInfo';
import KBExplorer, { IKBStatus } from './KBExplorer';
import KBNavigationBar, { KBNavigationTab } from './KBNavigationBar';
import KBDocuments from './KBDocuments';
import KBSettings from './KBSettings';
import { getUserTokenFromStore } from '@/utils/user';

function KnowledgeBaseManagerComponent() {
  const intl = useIntl();
  const { selectedContext } = useCurrentTopicContext();
  const { selectedTopics, clearSelectedTopic, setSelectedTopic } = useTopicStore(); // Add setSelectedTopic

  const {
    isLoading: kbStoreIsLoadingGlobal,
    error: kbStoreErrorGlobal,
    getKnowledgeBaseById,
    getKnowledgeBaseDetailsList,
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

  // Navigation state
  const [activeTab, setActiveTab] = useState<KBNavigationTab>('overview');

  const currentWorkspaceId = useMemo(() => {
    return selectedContext?.type === "workspace" ? selectedContext.id : undefined;
  }, [selectedContext]);

  const selectedKbId = selectedTopics[KNOWLEDGE_BASE_SELECTION_KEY];

  // Add loadAllKBs function
  const loadAllKBs = useCallback(async () => {
    if (!currentWorkspaceId) {
      console.warn('No workspace ID available for loading KBs');
      return;
    }

    try {
      console.log('📚 Loading all knowledge bases for workspace:', currentWorkspaceId);
      const kbs = await getKnowledgeBaseDetailsList(currentWorkspaceId);
      console.log('📚 Loaded knowledge bases:', kbs?.length || 0);
    } catch (error) {
      console.error('❌ Error loading knowledge bases:', error);
      toast.error('Failed to load knowledge bases');
    }
  }, [currentWorkspaceId, getKnowledgeBaseDetailsList]);

  useEffect(() => {
    const embeddingService = new EmbeddingService();
    embeddingService.GetEmbeddingModels()
      .then(models => setEmbeddingModels(models))
      .catch(error => console.error("Failed to load embedding models:", error));
  }, []);

  useEffect(() => {
    console.log('🔍 Knowledge Base Manager mounted, checking service health...');
    
    // Check LightRAG service health
    const checkHealth = async () => {
      try {
        const isHealthy = await window.electron.knowledgeBase.healthCheck();
        console.log('🏥 LightRAG Health Check Result:', isHealthy);
        
        if (!isHealthy) {
          toast.error('Knowledge Base service is not available. Some features may not work properly.');
        }
      } catch (error) {
        console.error('❌ Health check failed:', error);
        toast.error('Unable to check Knowledge Base service status.');
      }
    };
    
    checkHealth();
    // loadAllKBs(); // Commented out for now - will be fixed in a separate update
  }, [selectedContext]);

  const fetchAndSetSelectedKbDetails = useCallback(async (idToFetch?: string) => {
    const kbIdToUse = idToFetch || selectedKbId;
    if (kbIdToUse && currentWorkspaceId) {
      // Avoid re-fetching if we already have the same KB loaded (unless explicitly requested)
      if (!idToFetch && selectedKnowledgeBase?.id === kbIdToUse) {
        console.log('🔄 KB already loaded, skipping fetch for:', kbIdToUse);
        return;
      }
      
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
  }, [selectedKbId, currentWorkspaceId]); // Removed fetchAndSetSelectedKbDetails to prevent infinite loop

  // Removed redundant KB structure fetch - KBExplorer handles this
  // useEffect(() => {
  //   if (currentWorkspaceId) {
  //     const viewKBStructure = useKBStore.getState().viewKnowledgeBaseStructure;
  //     const kbIdToView = selectedKnowledgeBase?.id;
  //
  //     viewKBStructure(currentWorkspaceId, kbIdToView)
  //       .then(result => {
  //         if (kbIdToView) {
  //           console.log(`KB structure response for ${kbIdToView}:`, result);
  //         } else {
  //           console.log("KB structure response for all KBs in workspace:", result);
  //         }
  //       })
  //       .catch(err => {
  //         console.error(`Error viewing KB structure for ${kbIdToView || 'all KBs'}:`, err);
  //       });
  //   }
  // }, [currentWorkspaceId, selectedKnowledgeBase?.id]);

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
  }, [selectedKnowledgeBase?.id, currentWorkspaceId]);

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
        
        // Also clear workspace-specific KB selection if it matches the deleted KB
        const { clearWorkspaceSelectedKB } = useTopicStore.getState();
        clearWorkspaceSelectedKB(currentWorkspaceId);
      } else {
        toast.error(intl.formatMessage({ id: "settings.kb.delete.error", defaultMessage: "Failed to delete knowledge base." }));
      }
      handleCloseDeleteDialog();
    }
  }, [selectedKnowledgeBase, currentWorkspaceId, deleteKnowledgeBase, intl, handleCloseDeleteDialog, clearSelectedTopic]);

  // Removed handleToggleEnabled function - knowledge bases are always enabled when created

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
      
      // Automatically select the newly created KB
      setSelectedTopic(KNOWLEDGE_BASE_SELECTION_KEY, newKb.id);
      
      // Automatically register the new KB since LightRAG is always enabled
      const userToken = getUserTokenFromStore();
      if (userToken && newKb) {
        const registerArgs: IKBRegisterIPCArgs = {
          kbData: newKb,
          token: userToken,
        };
        try {
          const registrationResult = await registerKB(registerArgs);
          if (registrationResult) {
            toast.success(intl.formatMessage({ id: "settings.kb.register.success", defaultMessage: "Knowledge base registered successfully." }));
          }
        } catch (error: any) {
          console.error("Error registering KB:", error);
          toast.error(intl.formatMessage({ id: "settings.kb.register.exception", defaultMessage: "An error occurred during knowledge base registration." }) + ` ${error.message}`);
        }
      }
    } else {
      toast.error(intl.formatMessage({ id: "settings.kb.create.error", defaultMessage: "Failed to create knowledge base." }));
    }
  }, [currentWorkspaceId, createKnowledgeBase, intl, closeCreateKBDialog, registerKB, setSelectedTopic]);

  const handleRefreshKBStructure = useCallback(() => {
    if (selectedKnowledgeBase?.id && currentWorkspaceId) {
      // Force refresh of KB structure data by re-triggering the fetch
      const viewKBStructure = useKBStore.getState().viewKnowledgeBaseStructure;
      viewKBStructure(currentWorkspaceId, selectedKnowledgeBase.id)
        .then(result => {
          console.log(`KB structure refreshed for ${selectedKnowledgeBase.id}:`, result);
          toast.success(intl.formatMessage({ 
            id: "settings.kb.structure.refresh.success", 
            defaultMessage: "Knowledge base structure refreshed." 
          }));
        })
        .catch(err => {
          console.error(`Error refreshing KB structure for ${selectedKnowledgeBase.id}:`, err);
          toast.error(intl.formatMessage({ 
            id: "settings.kb.structure.refresh.error", 
            defaultMessage: "Failed to refresh knowledge base structure." 
          }));
        });
    }
  }, [selectedKnowledgeBase?.id, currentWorkspaceId, intl]);

  // Change the handleReinitialize function name and add scan functionality
  const handleScanDocuments = useCallback(async () => {
    if (selectedKnowledgeBase && currentWorkspaceId) {
      try {
        // Call the new scan API
        const userToken = getUserTokenFromStore();
        if (userToken) {
          await window.electron.knowledgeBase.scanKB({
            workspaceId: currentWorkspaceId,
            kbId: selectedKnowledgeBase.id,
            token: userToken
          });
          toast.success(intl.formatMessage({ 
            id: "kbExplorer.scanSuccess", 
            defaultMessage: "Document scan initiated successfully." 
          }));
        }
      } catch (error: any) {
        toast.error(`Scan failed: ${error.message}`);
      }
    }
  }, [selectedKnowledgeBase?.id, currentWorkspaceId, intl]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Show navigation bar only when KB is selected */}
      {selectedKnowledgeBase && currentWorkspaceId && (
        <KBNavigationBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          knowledgeBaseName={selectedKnowledgeBase.name}
          disabled={isLoadingDetails || kbStoreIsLoadingGlobal}
        />
      )}

      {/* Content Area */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2 }}>
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
          <>
            {/* Tab Content */}
            {activeTab === 'overview' && (
              <Box>
                {/* Section Header */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    <FormattedMessage id="kb.overview.title" />
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <FormattedMessage id="kb.overview.description" />
                  </Typography>
                </Box>

                <Divider sx={{ mb: 3 }} />

                {/* Knowledge Base Information */}
                <KBInfo
                  knowledgeBase={selectedKnowledgeBase}
                  kbRawStatus={kbStatus}
                  isLoading={isLoadingDetails}
                  isKbStatusLoading={isStatusLoading}
                  onEdit={handleOpenEditDialog}
                  onDelete={handleOpenDeleteDialog}
                  getEmbeddingEngineName={getEmbeddingEngineName}
                  getKbSourceIconAndLabel={getKbSourceIconAndLabel}
                />
              </Box>
            )}

            {activeTab === 'documents' && (
              <KBDocuments
                knowledgeBaseId={selectedKnowledgeBase.id}
                workspaceId={currentWorkspaceId}
                kbStatus={kbStatus}
                isLoading={isStatusLoading}
                onScanDocuments={handleScanDocuments}
                onRefreshStructure={handleRefreshKBStructure}
              />
            )}

            {activeTab === 'settings' && (
              <KBSettings
                knowledgeBase={selectedKnowledgeBase}
                onEdit={handleOpenEditDialog}
                onDelete={handleOpenDeleteDialog}
              />
            )}

            {activeTab === 'members' && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  <FormattedMessage id="kb.members.comingSoon" defaultMessage="Member management coming soon..." />
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <InfoOutlinedIcon color="action" sx={{ fontSize: 40 }} />
            <Typography variant="h6" gutterBottom>
              <FormattedMessage id="settings.kb.title" defaultMessage="Knowledge Base" />
            </Typography>
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
      </Box>

      {/* Dialogs */}
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
