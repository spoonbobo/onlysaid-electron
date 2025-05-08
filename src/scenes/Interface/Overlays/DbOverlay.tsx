import { Box, Typography, IconButton, Button } from "@mui/material";
import { useDebugStore } from "@/stores/Debug/DebugStore";
import { useState } from "react";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import { databaseQueries } from '../TestQueries/Queries';
import { useChatStore } from "@/stores/Chat/chatStore";
import { FormattedMessage } from "react-intl";

export default function DbOverlay() {
    const { dbOverlayMinimized, setDbOverlayMinimized } = useDebugStore();
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const { selectedTopics } = useCurrentTopicContext();
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
            borderRadius: 1,
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.12)'
        }}>
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1,
                bgcolor: 'rgba(100, 120, 255, 0.2)',
                color: 'text.primary'
            }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    <FormattedMessage id="debug.database-tools" />
                </Typography>
                <IconButton
                    size="small"
                    onClick={() => setDbOverlayMinimized(!dbOverlayMinimized)}
                    sx={{ color: 'primary.main', p: 0.2, height: 20, width: 20 }}
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
                                color: 'text.primary',
                                bgcolor: 'rgba(100, 120, 255, 0.08)',
                                border: '1px solid rgba(100, 120, 255, 0.2)',
                                borderRadius: 1,
                                mb: 0.5,
                                py: 0.5,
                                fontSize: '0.75rem',
                                userSelect: 'none',
                                '&:hover': {
                                    bgcolor: 'rgba(100, 120, 255, 0.15)',
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
                                display: 'block',
                                color: 'text.primary',
                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                userSelect: 'text'
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