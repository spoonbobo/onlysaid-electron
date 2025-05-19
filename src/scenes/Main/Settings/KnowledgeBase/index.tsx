import { Box, Button, TextField, Pagination, InputAdornment, Typography, Card, CardContent, List, ListItem, IconButton, Switch, Chip, Stack, Tooltip } from "@mui/material";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useKBConfigurationStore } from "@/stores/KB/KBConfigurationStore";
import SettingsSection from "@/components/Settings/SettingsSection";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
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
import { IKnowledgeBase } from "@/../../types/KnowledgeBase/KnowledgeBase";

// Helper to derive contextId string from TopicContext (can be shared or redefined if not already global)
const getContextIdString = (selectedContext: TopicContext | null): string | undefined => {
  if (!selectedContext) return undefined;
  return selectedContext.type === "workspace" && selectedContext.id
    ? `${selectedContext.id}:workspace`
    : selectedContext.id ? `${selectedContext.id}:${selectedContext.type}`
      : `${selectedContext.name}:${selectedContext.type}`;
};

// Define a stable empty array reference outside the component
const EMPTY_KBS: IKnowledgeBase[] = [];

function KnowledgeBaseComponent() {
  const { setPage: storeSetPage, ...configStore } = useKBConfigurationStore();
  const {
    page,
    itemsPerPage,
    searchTerm,
    addDatabase,
    removeDatabase,
    updateDatabase,
    toggleDatabaseStatus,
    reinitializeDatabase,
    setItemsPerPage,
    setSearchTerm
  } = configStore;

  const { queryEngineLLM, isKBUsable } = useKBSettingsStore();
  const { selectedContext } = useTopicStore();
  const contextId = useMemo(() => getContextIdString(selectedContext), [selectedContext]);

  const intl = useIntl();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDbId, setSelectedDbId] = useState<string | null>(null);
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

  useEffect(() => {
    if (contextId) {
      storeSetPage(1);
    }
  }, [contextId, storeSetPage]);

  const contextKnowledgeBases = useKBConfigurationStore(
    useCallback(
      state => (contextId ? state.knowledge_bases[contextId] : undefined) || EMPTY_KBS,
      [contextId]
    )
  );

  const filteredDatabases = useMemo(() => {
    if (!contextKnowledgeBases) return EMPTY_KBS;
    return contextKnowledgeBases.filter(db =>
      searchTerm === "" ||
      db.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (db.description && db.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [contextKnowledgeBases, searchTerm]);

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

  const handleOpenCreateDialog = useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  const handleCloseCreateDialog = useCallback(() => {
    setCreateDialogOpen(false);
  }, []);

  const handleOpenEditDialog = useCallback((id: string) => {
    setSelectedDbId(id);
    setEditDialogOpen(true);
  }, []);

  const handleCloseEditDialog = useCallback(() => {
    setEditDialogOpen(false);
    setSelectedDbId(null);
  }, []);

  const handleOpenDeleteDialog = useCallback((id: string) => {
    setSelectedDbId(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setSelectedDbId(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (selectedDbId) {
      removeDatabase(selectedDbId);
      handleCloseDeleteDialog();
    }
  }, [selectedDbId, removeDatabase, handleCloseDeleteDialog]);

  const handleToggleEnabled = useCallback((id: string, enabled: boolean) => {
    toggleDatabaseStatus(id, enabled);
  }, [toggleDatabaseStatus]);

  const handleReinitialize = useCallback((id: string) => {
    reinitializeDatabase(id);
  }, [reinitializeDatabase]);

  const handleCreateDatabase = useCallback((data: { name: string; description: string; path: string; sourceType: string; embeddingEngine: string; }) => {
    if (!contextId) {
      toast.error("Context ID is missing. Cannot create knowledge base.");
      return;
    }
    if (!data.embeddingEngine || data.embeddingEngine === "none") {
      toast.error(intl.formatMessage({
        id: "settings.kb.error.embeddingEngineRequired",
        defaultMessage: "An embedding engine must be selected."
      }));
      return;
    }

    addDatabase({
      name: data.name,
      description: data.description,
      source: data.path,
      source_link: data.path,
      embedding_engine: data.embeddingEngine,
      query_engine: queryEngineLLM,
      type: "private"
    });
    setCreateDialogOpen(false);
  }, [contextId, addDatabase, queryEngineLLM, intl]);

  const handleEditDatabase = useCallback((data: { name: string; description: string; path: string; sourceType: string }) => {
    if (selectedDbId) {
      updateDatabase(selectedDbId, {
        name: data.name,
        description: data.description,
        source: data.path,
        source_link: data.path
      });
      setEditDialogOpen(false);
      setSelectedDbId(null);
    }
  }, [selectedDbId, updateDatabase]);

  const getSelectedDb = useCallback(() => {
    if (!selectedDbId) return null;
    return contextKnowledgeBases.find(db => db.id === selectedDbId) || null;
  }, [selectedDbId, contextKnowledgeBases]);

  const getSelectedDbName = useCallback(() => {
    if (!selectedDbId) return "";
    const db = contextKnowledgeBases.find(db => db.id === selectedDbId);
    return db?.name || "";
  }, [selectedDbId, contextKnowledgeBases]);

  const getEmbeddingEngineName = useCallback((engineId: string) => {
    const model = embeddingModels.find(m => m.id === engineId);
    return model ? model.name : engineId;
  }, [embeddingModels]);

  return (
    <Box sx={{ mb: 4 }}>
      <SettingsSection title={intl.formatMessage({ id: "settings.kb.title", defaultMessage: "Knowledge Base" })}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
          >
            <FormattedMessage id="settings.kb.createKB.title" defaultMessage="新增知識庫" />
          </Button>

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

        {filteredDatabases.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              <FormattedMessage
                id="settings.kb.noKb"
                defaultMessage={intl.formatMessage({ id: "settings.kb.noKb", defaultMessage: "No knowledge base found. Create a new knowledge base to get started." })}
              />
            </Typography>
          </Box>
        ) : (
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
                            <Chip
                              size="small"
                              variant="outlined"
                              label={getEmbeddingEngineName(db.embedding_engine)}
                              title={intl.formatMessage({ id: "settings.kb.embeddingEngineUsed", defaultMessage: "Embedding Engine" })}
                            />
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
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        onSubmit={handleCreateDatabase}
        mode="create"
      />

      {/* Edit Database Dialog */}
      <CreateKBDialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        onSubmit={handleEditDatabase}
        database={getSelectedDb()}
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
