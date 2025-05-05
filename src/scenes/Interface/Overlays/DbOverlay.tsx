import { Box, Typography, IconButton, Button } from "@mui/material";
import { useDebugStore } from "../../../stores/Debug/DebugStore";
import { useState } from "react";
import { useTopicStore } from "../../../stores/Topic/TopicStore";
import { databaseQueries } from '../TestQueries/Queries';
import { useChatStore } from "../../../stores/Chat/chatStore";
import { FormattedMessage } from "react-intl";

export default function DbOverlay() {
  const { dbOverlayMinimized, setDbOverlayMinimized } = useDebugStore();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const { getCurrentContextTopics } = useTopicStore();
  const selectedTopics = getCurrentContextTopics();
  const { fetchMessages } = useChatStore();

  const executeQuery = async (queryId: string) => {
    const activeRoomId = Object.values(selectedTopics)[0];

    if (!activeRoomId) {
      setResult("No active topic selected");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      if (window.electron) {
        const queryConfig = databaseQueries.find(q => q.id === queryId);
        if (!queryConfig) {
          setResult("Query not found");
          return;
        }

        const content = queryId === 'bot-message' ? "This is a test message from the bot" : "";
        const queryData = queryConfig.getQuery(activeRoomId, content);

        const result = await window.electron.db.query(queryData);
        setResult(`Successfully executed: ${queryConfig.title}`);
        console.log("Query result:", result);

        await fetchMessages(activeRoomId);
      }
    } catch (error) {
      console.error("Failed to execute query:", error);
      setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{
      width: '100%',
      bgcolor: 'background.paper',
      borderRadius: 1,
      overflow: 'hidden',
      border: '1px solid rgba(0, 0, 0, 0.08)'
    }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 1,
        bgcolor: 'primary.light',
        color: 'primary.contrastText'
      }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
          <FormattedMessage id="debug.database-tools" />
        </Typography>
        <IconButton
          size="small"
          onClick={() => setDbOverlayMinimized(!dbOverlayMinimized)}
          sx={{ color: 'inherit', p: 0.2, height: 20, width: 20 }}
        >
          {dbOverlayMinimized ? "+" : "-"}
        </IconButton>
      </Box>

      {!dbOverlayMinimized && (
        <Box sx={{ p: 1 }}>
          {databaseQueries.map((query) => (
            <Button
              key={query.id}
              fullWidth
              onClick={() => executeQuery(query.id)}
              disabled={isLoading}
              sx={{
                textTransform: 'none',
                justifyContent: 'flex-start',
                color: 'primary.main',
                bgcolor: 'rgba(230, 235, 255, 0.4)',
                border: '1px solid rgba(180, 190, 250, 0.3)',
                borderRadius: 1,
                mb: 0.5,
                py: 0.5,
                fontSize: '0.75rem',
                '&:hover': {
                  bgcolor: 'rgba(230, 235, 255, 0.7)',
                }
              }}
            >
              <FormattedMessage id={query.title} />
            </Button>
          ))}

          {result && (
            <Typography
              variant="caption"
              sx={{
                mt: 0.5,
                p: 1,
                borderRadius: 1,
                display: 'block'
              }}
            >
              {result}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

