// onlysaid-electron/src/scenes/Menu/Workspace/KnowledgeBase/index.tsx
import { Box, List, ListItem, ListItemButton, ListItemText, Typography, CircularProgress, Paper } from "@mui/material";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useTopicStore, useCurrentTopicContext, KNOWLEDGE_BASE_SELECTION_KEY } from "@/stores/Topic/TopicStore";
import { useKBStore } from "@/stores/KB/KBStore";
import { IKnowledgeBase } from "@/../../types/KnowledgeBase/KnowledgeBase";
import { useIntl } from "react-intl";

export default function KnowledgeBaseMenu() {
  const intl = useIntl();
  const { selectedContext } = useCurrentTopicContext();
  const { selectedTopics, setSelectedTopic, clearSelectedTopic } = useTopicStore();
  const { getKnowledgeBaseDetailsList, isLoading: kbStoreIsLoading, error: kbStoreError, kbsLastUpdated } = useKBStore();

  const [knowledgeBases, setKnowledgeBases] = useState<IKnowledgeBase[]>([]);

  const currentWorkspaceId = useMemo(() => {
    return selectedContext?.type === "workspace" ? selectedContext.id : undefined;
  }, [selectedContext]);

  const selectedKbId = selectedTopics[KNOWLEDGE_BASE_SELECTION_KEY];

  const fetchKnowledgeBases = useCallback(async () => {
    if (currentWorkspaceId) {
      const kbs = await getKnowledgeBaseDetailsList(currentWorkspaceId);
      if (kbs) {
        setKnowledgeBases(kbs);
        const currentSelectedKbIdInStore = selectedTopics[KNOWLEDGE_BASE_SELECTION_KEY];
        if (currentSelectedKbIdInStore && !kbs.find(kb => kb.id === currentSelectedKbIdInStore)) {
          clearSelectedTopic(KNOWLEDGE_BASE_SELECTION_KEY);
        } else if (kbs.length === 0 && currentSelectedKbIdInStore) {
          clearSelectedTopic(KNOWLEDGE_BASE_SELECTION_KEY);
        }
      } else {
        setKnowledgeBases([]);
        clearSelectedTopic(KNOWLEDGE_BASE_SELECTION_KEY);
      }
    } else {
      setKnowledgeBases([]);
      clearSelectedTopic(KNOWLEDGE_BASE_SELECTION_KEY);
    }
  }, [currentWorkspaceId, getKnowledgeBaseDetailsList, selectedTopics, clearSelectedTopic]);

  useEffect(() => {
    fetchKnowledgeBases();
  }, [fetchKnowledgeBases, kbsLastUpdated, currentWorkspaceId]);

  const handleSelectKb = (kbId: string) => {
    if (currentWorkspaceId) { // Ensure context is still valid
      setSelectedTopic(KNOWLEDGE_BASE_SELECTION_KEY, kbId);
    }
  };

  if (!currentWorkspaceId) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ p: 1, display: 'block', textAlign: 'center' }}>
        {intl.formatMessage({ id: "kb.menu.noWorkspace", defaultMessage: "Select a workspace to see knowledge bases." })}
      </Typography>
    );
  }

  if (kbStoreIsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (kbStoreError) {
    return (
      <Typography variant="caption" color="error" sx={{ p: 1, display: 'block', textAlign: 'center' }}>
        {intl.formatMessage({ id: "kb.menu.errorLoading", defaultMessage: "Error loading knowledge bases." })}
      </Typography>
    );
  }

  if (knowledgeBases.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ p: 1, display: 'block', textAlign: 'center' }}>
        {intl.formatMessage({ id: "kb.menu.noKbsFound", defaultMessage: "No knowledge bases found for this workspace." })}
      </Typography>
    );
  }

  return (
    <Paper elevation={0} sx={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
      <List dense disablePadding>
        {knowledgeBases.map((kb) => (
          <ListItem key={kb.id} disablePadding>
            <ListItemButton
              selected={selectedKbId === kb.id}
              onClick={() => handleSelectKb(kb.id)}
              sx={{
                borderRadius: 1,
                m: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'action.selected',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  },
                },
              }}
            >
              <ListItemText
                primary={kb.name}
                slots={{
                  primary: 'div',
                }}
                slotProps={{
                  primary: {
                    style: {
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: '0.875rem',
                    },
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}