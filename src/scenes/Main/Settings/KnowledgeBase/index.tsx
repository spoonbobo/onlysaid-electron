import { Box, Button, TextField, Pagination, InputAdornment, Typography, Card, CardContent, List, ListItem, IconButton, Switch, Chip, Stack, Tooltip } from "@mui/material";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useKBConfigurationStore } from "@/stores/KB/KBConfigurationStore";
import SettingsSection from "@/components/Settings/SettingsSection";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import RefreshIcon from "@mui/icons-material/Refresh";
import { FormattedMessage } from "react-intl";
import CreateKBDialog, { DeleteKBConfirmationDialog } from "@/components/Dialog/CreateKBDialog";
import { useIntl } from "react-intl";
import { useKBSettingsStore } from "@/stores/KB/KBSettingStore";
import { useTopicStore, TopicContext } from "@/stores/Topic/TopicStore";
import { toast } from "@/utils/toast";
import { EmbeddingModel, EmbeddingService } from "@/service/ai";
import { IKnowledgeBase, IKnowledgeBaseRegisterArgs } from "@/../../types/KnowledgeBase/KnowledgeBase";
import { useKBStore } from "@/stores/KB/KBStore";
import CloudIcon from "@mui/icons-material/Cloud";
import StorageIcon from "@mui/icons-material/Storage";
import { v4 as uuidv4 } from 'uuid';

const getContextIdString = (selectedContext: TopicContext | null): string | undefined => {
  if (!selectedContext) return undefined;
  return selectedContext.type === "workspace" && selectedContext.id
    ? `${selectedContext.id}:workspace`
    : selectedContext.id ? `${selectedContext.id}:${selectedContext.type}`
      : `${selectedContext.name}:${selectedContext.type}`;
};

const EMPTY_KBS: IKnowledgeBase[] = [];

function KnowledgeBaseComponent() {
  const {
    setPage: storeSetPage,
    isCreateKBDialogOpen,
    closeCreateKBDialog,
    ...configStore
  } = useKBConfigurationStore();
  const {
    page,
    itemsPerPage,
    searchTerm,
    reinitializeDatabase,
    setItemsPerPage,
    setSearchTerm
  } = configStore;

  const { queryEngineLLM } = useKBSettingsStore();
  const { selectedContext } = useTopicStore();
  const contextId = useMemo(() => getContextIdString(selectedContext), [selectedContext]);
  const currentWorkspaceId = useMemo(() => {
    return selectedContext?.type === "workspace" ? selectedContext.id : undefined;
  }, [selectedContext]);

  const {
    isLoading: kbStoreIsLoading,
    error: kbStoreError,
    getKnowledgeBaseDetailsList,
    createKnowledgeBase,
    updateKnowledgeBase,
    deleteKnowledgeBase,
    getKnowledgeBaseById,
  } = useKBStore();

  const intl = useIntl();
  const [localKbs, setLocalKbs] = useState<IKnowledgeBase[]>(EMPTY_KBS);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDbId, setSelectedDbId] = useState<string | null>(null);
  const [editingDb, setEditingDb] = useState<IKnowledgeBase | null | undefined>(null);
  const [embeddingModels, setEmbeddingModels] = useState<EmbeddingModel[]>([]);

  useEffect(() => {
    const embeddingService = new EmbeddingService();
    embeddingService.GetEmbeddingModels()
      .then(models => {
        setEmbeddingModels(models);
      })
      .catch(error => {
        console.error("Failed to load embedding models for display:", error);
      });
  }, []);

  const refreshKnowledgeBases = useCallback(async (workspaceIdToFetch?: string) => {
    const idToFetch = workspaceIdToFetch || currentWorkspaceId;
    if (selectedContext?.type === "workspace" && idToFetch) {
      const fetchedKbs = await getKnowledgeBaseDetailsList(idToFetch);
      if (fetchedKbs) {
        setLocalKbs(fetchedKbs);
      } else {
        setLocalKbs(EMPTY_KBS);
      }
    } else {
      setLocalKbs(EMPTY_KBS);
    }
  }, [currentWorkspaceId, selectedContext, getKnowledgeBaseDetailsList]);

  useEffect(() => {
    if (contextId) {
      storeSetPage(1);
    }
    refreshKnowledgeBases();
  }, [contextId, selectedContext, refreshKnowledgeBases, storeSetPage]);

  const filteredDatabases = useMemo(() => {
    if (!localKbs) return EMPTY_KBS;
    return localKbs.filter(db =>
      searchTerm === "" ||
      db.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (db.description && db.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [localKbs, searchTerm]);

  const totalPages = Math.ceil(filteredDatabases.length / itemsPerPage);

  const getCurrentPageItems = () => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredDatabases.slice(startIndex, endIndex);
  };

  const handlePageChange = useCallback((event: React.ChangeEvent<unknown>, value: number) => {
    storeSetPage(value);
  }, [storeSetPage]);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, [setSearchTerm]);

  const handleOpenEditDialog = useCallback((id: string) => {
    setSelectedDbId(id);
    const dbToEdit = localKbs.find(kb => kb.id === id);
    setEditingDb(dbToEdit);
    setEditDialogOpen(true);
  }, [localKbs]);

  const handleCloseEditDialog = useCallback(() => {
    setEditDialogOpen(false);
    setSelectedDbId(null);
    setEditingDb(null);
  }, []);

  const handleOpenDeleteDialog = useCallback((id: string) => {
    setSelectedDbId(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setSelectedDbId(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (selectedDbId && currentWorkspaceId) {
      const success = await deleteKnowledgeBase(currentWorkspaceId, selectedDbId);
      if (success) {
        toast.success(intl.formatMessage({ id: "settings.kb.delete.success", defaultMessage: "Knowledge base deleted." }));
        refreshKnowledgeBases(currentWorkspaceId);
      } else {
        toast.error(intl.formatMessage({ id: "settings.kb.delete.error", defaultMessage: "Failed to delete knowledge base." }));
      }
      handleCloseDeleteDialog();
    } else {
      toast.error(intl.formatMessage({ id: "settings.kb.delete.error.missingInfo", defaultMessage: "Cannot delete: DB ID or Workspace ID is missing." }));
    }
  }, [selectedDbId, deleteKnowledgeBase, handleCloseDeleteDialog, intl, refreshKnowledgeBases, currentWorkspaceId]);

  const handleToggleEnabled = useCallback(async (id: string, enabled: boolean) => {
    if (!currentWorkspaceId) {
      toast.error(intl.formatMessage({
        id: "settings.kb.update.error.noWorkspace",
        defaultMessage: "No active workspace selected. Cannot update knowledge base status."
      }));
      return;
    }
    const result = await updateKnowledgeBase(currentWorkspaceId, id, { enabled });
    if (result) {
      toast.success(intl.formatMessage({
        id: enabled ? "settings.kb.enable.success" : "settings.kb.disable.success",
        defaultMessage: `Knowledge base ${enabled ? 'enabled' : 'disabled'}.`
      }));
      refreshKnowledgeBases(currentWorkspaceId);
    } else {
      toast.error(intl.formatMessage({
        id: "settings.kb.update.error",
        defaultMessage: "Failed to update knowledge base status."
      }));
    }
  }, [updateKnowledgeBase, intl, refreshKnowledgeBases, currentWorkspaceId]);

  const handleReinitialize = useCallback((id: string) => {
    reinitializeDatabase(id);
    toast.info(intl.formatMessage({ id: "settings.kb.reinitialize.started", defaultMessage: "Reinitialization started." }));
  }, [reinitializeDatabase, intl]);

  const handleCreateDatabase = useCallback(async (data: { name: string; description: string; path: string; sourceType: string; embeddingEngine: string; }) => {
    if (!currentWorkspaceId) {
      toast.error(intl.formatMessage({ id: "settings.kb.error.noWorkspace", defaultMessage: "No active workspace selected. Cannot create knowledge base." }));
      return;
    }
    if (data.sourceType === "local-store" && (!data.embeddingEngine || data.embeddingEngine === "none")) {
      toast.error(intl.formatMessage({
        id: "settings.kb.error.embeddingEngineRequired",
        defaultMessage: "An embedding engine must be selected for local storage type."
      }));
      return;
    }

    let type: "public" | "private";
    let url: string;

    if (data.sourceType === "onlysaid-kb") {
      type = "public";
      url = `/storage/${currentWorkspaceId}/${data.name}`;
    } else if (data.sourceType === "local-store") {
      type = "private";
      url = data.path;
    } else {
      toast.error(intl.formatMessage({ id: "settings.kb.error.unknownSourceType", defaultMessage: "Unknown source type." }));
      return;
    }

    const actualEmbeddingEngine = data.sourceType === "onlysaid-kb" ? "" : data.embeddingEngine;

    const newKbArgs: IKnowledgeBaseRegisterArgs = {
      id: uuidv4(),
      name: data.name,
      description: data.description,
      source: data.sourceType,
      url: url,
      workspace_id: currentWorkspaceId,
      type: type,
      embedding_engine: actualEmbeddingEngine,
    };

    const createdKb = await createKnowledgeBase(newKbArgs);
    if (createdKb) {
      toast.success(intl.formatMessage({ id: "settings.kb.create.success", defaultMessage: "Knowledge base created." }));
      refreshKnowledgeBases(currentWorkspaceId);
      closeCreateKBDialog();
    } else {
      toast.error(intl.formatMessage({ id: "settings.kb.create.error", defaultMessage: "Failed to create knowledge base." }));
    }
  }, [currentWorkspaceId, createKnowledgeBase, intl, refreshKnowledgeBases, closeCreateKBDialog]);

  const handleEditDatabase = useCallback(async (data: { name: string; description: string; path: string; sourceType: string; }) => {
    if (selectedDbId && currentWorkspaceId) {
      const existingKb = localKbs.find(kb => kb.id === selectedDbId);
      if (!existingKb) {
        toast.error("Original knowledge base not found for editing.");
        return;
      }

      const updates: Partial<Omit<IKnowledgeBase, 'id'>> = {
        name: data.name,
        description: data.description,
      };

      if (existingKb.type === 'private' && data.path !== existingKb.source) {
        updates.source = data.path;
        updates.url = data.path;
      }

      const updatedKb = await updateKnowledgeBase(currentWorkspaceId, selectedDbId, updates);
      if (updatedKb) {
        toast.success(intl.formatMessage({ id: "settings.kb.edit.success", defaultMessage: "Knowledge base updated." }));
        refreshKnowledgeBases(currentWorkspaceId);
        handleCloseEditDialog();
      } else {
        toast.error(intl.formatMessage({ id: "settings.kb.edit.error", defaultMessage: "Failed to update knowledge base." }));
      }
    }
  }, [selectedDbId, localKbs, updateKnowledgeBase, intl, handleCloseEditDialog, refreshKnowledgeBases, currentWorkspaceId]);

  const getSelectedDbForDialog = useCallback(() => {
    return editingDb || null;
  }, [editingDb]);

  const getSelectedDbName = useCallback(() => {
    if (!selectedDbId) return "";
    const db = localKbs.find(db => db.id === selectedDbId);
    return db?.name || "";
  }, [selectedDbId, localKbs]);

  const getEmbeddingEngineName = useCallback((engineId: string) => {
    const model = embeddingModels.find(m => m.id === engineId);
    return model ? model.name : engineId;
  }, [embeddingModels]);

  const getKbSourceIcon = useCallback((db: IKnowledgeBase) => {
    if (db.url.includes("onlysaid.com")) {
      return (
        <Chip
          size="small"
          color="info"
          icon={<CloudIcon fontSize="small" />}
          label={intl.formatMessage({
            id: "settings.kb.private.onlysaidKb",
            defaultMessage: "Onlysaid KB"
          })}
        />
      );
    }
    return (
      <Chip
        size="small"
        color="default"
        icon={<StorageIcon fontSize="small" />}
        label={intl.formatMessage({
          id: "settings.kb.private.localKb",
          defaultMessage: "Local KB"
        })}
      />
    );
  }, [intl]);

  const fetchKnowledgeBaseDetails = useCallback(async (kbId: string) => {
    if (!currentWorkspaceId) {
      toast.error(intl.formatMessage({
        id: "settings.kb.error.noWorkspace",
        defaultMessage: "No active workspace selected."
      }));
      return;
    }

    try {
      const kb = await getKnowledgeBaseById(currentWorkspaceId, kbId);
      if (kb) {
        setLocalKbs(prevKbs => {
          const index = prevKbs.findIndex(k => k.id === kbId);
          if (index !== -1) {
            const newKbs = [...prevKbs];
            newKbs[index] = kb;
            return newKbs;
          }
          return prevKbs;
        });
        toast.success(intl.formatMessage({
          id: "settings.kb.fetch.success",
          defaultMessage: "Knowledge base details refreshed."
        }));
      } else {
        toast.info(intl.formatMessage({
          id: "settings.kb.fetch.notFound",
          defaultMessage: "Knowledge base details not found after refresh attempt."
        }));
      }
    } catch (error) {
      toast.error(intl.formatMessage({
        id: "settings.kb.fetch.error",
        defaultMessage: "Failed to fetch knowledge base details."
      }));
    }
  }, [currentWorkspaceId, getKnowledgeBaseById, intl]);

  return (
    <Box sx={{ mb: 4 }}>
      <SettingsSection title={intl.formatMessage({ id: "settings.kb.title", defaultMessage: "Knowledge Base" })}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <TextField
            size="small"
            placeholder={intl.formatMessage({ id: "settings.kb.private.search", defaultMessage: "Search databases" })}
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{
              width: 250,
              '& .MuiInputBase-root': {
                height: 40,
                borderRadius: 1
              },
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
                '&:hover fieldset': {
                  borderColor: 'primary.main',
                },
              }
            }}
          />
        </Box>

        {kbStoreIsLoading && <Typography>Loading knowledge bases...</Typography>}
        {kbStoreError && <Typography color="error">Error loading knowledge bases: {kbStoreError}</Typography>}
        {!kbStoreIsLoading && !kbStoreError && filteredDatabases.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              <FormattedMessage
                id="settings.kb.noKb"
                defaultMessage={intl.formatMessage({ id: "settings.kb.noKb", defaultMessage: "No knowledge base found. Create a new knowledge base to get started." })}
              />
            </Typography>
          </Box>
        )}

        {!kbStoreIsLoading && !kbStoreError && filteredDatabases.length > 0 && (
          <>
            <List>
              {getCurrentPageItems().map((db) => (
                <ListItem
                  key={db.id}
                  sx={{ p: 0, mb: 2 }}
                >
                  <Card sx={{ width: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6">{db.name}</Typography>
                          <Stack direction="row" spacing={1}>
                            {db.configured ? (
                              <Chip
                                size="small"
                                color="success"
                                label={intl.formatMessage({ id: "settings.kb.private.configured", defaultMessage: "Configured" })}
                              />
                            ) : (
                              <Chip
                                size="small"
                                color="warning"
                                label={intl.formatMessage({ id: "settings.kb.private.notConfigured", defaultMessage: "Not Configured" })}
                              />
                            )}
                            {db.enabled && (
                              <Chip
                                size="small"
                                color="primary"
                                label={intl.formatMessage({ id: "settings.kb.private.enabled", defaultMessage: "Enabled" })}
                              />
                            )}
                            {getKbSourceIcon(db)}
                            {db.embedding_engine && getEmbeddingEngineName(db.embedding_engine) && (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={getEmbeddingEngineName(db.embedding_engine)}
                                title={intl.formatMessage({ id: "settings.kb.embeddingEngineUsed", defaultMessage: "Embedding Engine" })}
                              />
                            )}
                          </Stack>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title={intl.formatMessage({ id: "settings.kb.private.reinitialize", defaultMessage: "Reinitialize" })}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleReinitialize(db.id)}
                            >
                              <RefreshIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={intl.formatMessage({ id: "settings.kb.private.edit", defaultMessage: "Edit" })}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenEditDialog(db.id)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={intl.formatMessage({ id: "settings.kb.private.delete", defaultMessage: "Delete" })}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleOpenDeleteDialog(db.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={intl.formatMessage({ id: "settings.kb.private.refresh", defaultMessage: "Refresh Details" })}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => fetchKnowledgeBaseDetails(db.id)}
                            >
                              <RefreshIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary">{db.description}</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2">
                            <FormattedMessage
                              id="settings.kb.private.documents"
                              defaultMessage="Documents: {count}"
                              values={{ count: db.configured ? db.documents : "-" }}
                            />
                          </Typography>
                          <Typography variant="body2">
                            <FormattedMessage
                              id="settings.kb.private.size"
                              defaultMessage="Size: {size} KB"
                              values={{ size: db.configured && db.size ? (db.size / 1024).toFixed(2) : "-" }}
                            />
                          </Typography>
                          <Typography variant="body2">
                            <FormattedMessage
                              id="settings.kb.private.created"
                              defaultMessage="Created: {date}"
                              values={{ date: new Date(db.create_at).toLocaleDateString() }}
                            />
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">
                            <FormattedMessage id="settings.kb.private.enableKB" defaultMessage="Enable" />
                          </Typography>
                          <Switch
                            checked={db.enabled}
                            onChange={(e) => handleToggleEnabled(db.id, e.target.checked)}
                            disabled={!db.configured}
                            size="small"
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </ListItem>
              ))}
            </List>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          </>
        )}
      </SettingsSection>

      {/* Create Database Dialog */}
      <CreateKBDialog
        open={isCreateKBDialogOpen}
        onClose={closeCreateKBDialog}
        onSubmit={handleCreateDatabase}
        mode="create"
      />

      {/* Edit Database Dialog */}
      <CreateKBDialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        onSubmit={handleEditDatabase}
        database={getSelectedDbForDialog()}
        mode="edit"
      />

      {/* Delete Confirmation Dialog */}
      <DeleteKBConfirmationDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        dbName={getSelectedDbName()}
      />
    </Box>
  );
}

export default KnowledgeBaseComponent;
