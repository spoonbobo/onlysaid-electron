import { Box, Typography, Button, Chip, Link } from "@mui/material";
import { IChatMessageToolCall } from "@/../../types/Chat/Message";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { memo, useCallback, useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useLLMStore, IToolLog } from "@/renderer/stores/LLM/LLMStore";
import ToolLogDialog from "@/renderer/components/Dialog/MCP/ToolLog";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useMCPClientStore } from "@/renderer/stores/MCP/MCPClient";
import { useMCPStore } from "@/renderer/stores/MCP/MCPStore";
import ToolResultDialog from "@/renderer/components/Dialog/MCP/ToolResult";
import { summarizeToolResults } from "@/utils/agent";
import { useAgentStore } from "@/renderer/stores/Agent/AgentStore";
import { toast } from "@/utils/toast";
import { extractUrls, formatUrlForDisplay, extractDomain } from "@/utils/url";

interface ToolDisplayProps {
  toolCalls: IChatMessageToolCall[];
  chatId: string;
  messageId: string;
}

const ToolDisplay = memo(({ toolCalls, chatId, messageId }: ToolDisplayProps) => {
  const intl = useIntl();
  const { updateToolCallStatus, updateToolCallResult, getLogsForToolCall, addLogForToolCall } = useLLMStore.getState();
  const refreshMessage = useChatStore(state => state.refreshMessage);
  const { executeTool } = useMCPClientStore.getState();
  const { getAllConfiguredServers, getServerAutoApproved } = useMCPStore.getState();
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedLogContent, setSelectedLogContent] = useState<IToolLog[]>([]);
  const [selectedToolName, setSelectedToolName] = useState<string | undefined>(undefined);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [executingToolIds, setExecutingToolIds] = useState<Set<string>>(new Set());
  const [executionStartTimes, setExecutionStartTimes] = useState<Map<string, number>>(new Map());
  const [executionDurations, setExecutionDurations] = useState<Map<string, number>>(new Map());
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [selectedToolCall, setSelectedToolCall] = useState<IChatMessageToolCall | null>(null);
  const [autoApprovedTools, setAutoApprovedTools] = useState<Set<string>>(new Set());

  // Helper function to format MCP name for display
  const formatMCPName = useCallback((key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
      .replace(/Category$/, '')
      .trim();
  }, []);

  const handleExecute = useCallback(async (toolCall: IChatMessageToolCall) => {
    if (!toolCall.mcp_server) {
      console.error('No MCP server specified for tool call:', toolCall.id);
      await addLogForToolCall(toolCall.id, 'Error: No MCP server specified for this tool call.');
      return;
    }

    const serverId = toolCall.mcp_server;
    const allServers = getAllConfiguredServers();

    if (!allServers[serverId]) {
      console.error('Could not find MCP server configuration for:', serverId);
      await addLogForToolCall(toolCall.id, `Error: Could not find MCP server configuration for "${serverId}".`);
      return;
    }

    // Track execution start time
    const startTime = Date.now();
    setExecutionStartTimes(prev => new Map(prev).set(toolCall.id, startTime));
    setExecutingToolIds(prev => new Set(prev).add(toolCall.id));

    try {
      console.log(`Executing tool ${toolCall.function.name} on server ${serverId} with args:`, toolCall.function.arguments);
      await addLogForToolCall(toolCall.id, `Starting execution of tool "${toolCall.function.name}" on server "${serverId}".`);

      const result = await executeTool(
        serverId,
        toolCall.function.name,
        typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments
      );

      if (result.success) {
        console.log(`Tool ${toolCall.function.name} executed successfully:`, result.data);

        // Calculate execution duration
        const endTime = Date.now();
        const duration = Math.floor((endTime - startTime) / 1000);

        await updateToolCallResult(toolCall.id, result.data, duration);
        await addLogForToolCall(toolCall.id, `Tool execution completed successfully in ${duration}s. Result: ${JSON.stringify(result.data, null, 2)}`);
      } else {
        console.error(`Tool ${toolCall.function.name} execution failed:`, result.error);
        await updateToolCallStatus(toolCall.id, 'error');
        await addLogForToolCall(toolCall.id, `Tool execution failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error(`Error executing tool ${toolCall.function.name}:`, error);
      await updateToolCallStatus(toolCall.id, 'error');
      await addLogForToolCall(toolCall.id, `Tool execution error: ${error.message || error}`);
    } finally {
      // Calculate execution duration for local state
      const endTime = Date.now();
      const duration = Math.floor((endTime - startTime) / 1000);
      setExecutionDurations(prev => new Map(prev).set(toolCall.id, duration));

      setExecutingToolIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(toolCall.id);
        return newSet;
      });
      setExecutionStartTimes(prev => {
        const newMap = new Map(prev);
        newMap.delete(toolCall.id);
        return newMap;
      });
      await refreshMessage(chatId, messageId);
    }
  }, [executeTool, updateToolCallResult, updateToolCallStatus, addLogForToolCall, chatId, messageId, refreshMessage, getAllConfiguredServers]);

  // Auto-approve and auto-execute tool calls when component mounts or tool calls change
  useEffect(() => {
    const checkAndAutoApprove = async () => {
      for (const toolCall of toolCalls) {
        // Only auto-approve if tool is pending and not already auto-approved
        if ((toolCall.status === 'pending' || !toolCall.status) &&
          toolCall.mcp_server &&
          !autoApprovedTools.has(toolCall.id)) {

          const isAutoApproved = getServerAutoApproved(toolCall.mcp_server);

          if (isAutoApproved) {
            console.log(`Auto-approving and executing tool call ${toolCall.id} for server ${toolCall.mcp_server}`);

            // Mark as auto-approved to prevent duplicate processing
            setAutoApprovedTools(prev => new Set(prev).add(toolCall.id));

            // Update tool call status to approved
            await updateToolCallStatus(toolCall.id, 'approved');

            // Show notification to user
            toast.success(
              `Tool "${toolCall.function.name}" auto-approved and executing for ${formatMCPName(toolCall.mcp_server)}`,
            );

            // Refresh the message to show updated status
            await refreshMessage(chatId, messageId);

            // Auto-execute the tool after a brief delay to ensure state is updated
            setTimeout(() => {
              handleExecute(toolCall);
            }, 100);
          }
        }
      }
    };

    checkAndAutoApprove();
  }, [toolCalls, chatId, messageId, getServerAutoApproved, updateToolCallStatus, refreshMessage, formatMCPName, autoApprovedTools, handleExecute]);

  const handleApprove = useCallback(async (toolCallId: string) => {
    console.log(`Tool call ${toolCallId} manually approved for message ${messageId} in chat ${chatId}`);
    await updateToolCallStatus(toolCallId, 'approved');
    await refreshMessage(chatId, messageId);
  }, [updateToolCallStatus, chatId, messageId, refreshMessage]);

  const handleDeny = useCallback(async (toolCallId: string) => {
    console.log(`Tool call ${toolCallId} denied for message ${messageId} in chat ${chatId}`);
    await updateToolCallStatus(toolCallId, 'denied');
    await refreshMessage(chatId, messageId);
  }, [updateToolCallStatus, chatId, messageId, refreshMessage]);

  const handleViewLogs = useCallback(async (toolCallId: string, toolName: string) => {
    setIsLoadingLogs(true);
    setSelectedToolName(toolName);
    const logs = await getLogsForToolCall(toolCallId);
    setSelectedLogContent(logs);
    setIsLoadingLogs(false);
    setLogDialogOpen(true);
  }, [getLogsForToolCall]);

  const handleCloseLogDialog = useCallback(() => {
    setLogDialogOpen(false);
    setSelectedLogContent([]);
    setSelectedToolName(undefined);
  }, []);

  const handleReset = useCallback(async (toolCallId: string) => {
    console.log(`Tool call ${toolCallId} reset to pending for message ${messageId} in chat ${chatId}`);
    // Remove from auto-approved set when resetting
    setAutoApprovedTools(prev => {
      const newSet = new Set(prev);
      newSet.delete(toolCallId);
      return newSet;
    });
    await updateToolCallStatus(toolCallId, 'pending');
    await refreshMessage(chatId, messageId);
  }, [updateToolCallStatus, chatId, messageId, refreshMessage]);

  const handleViewResult = useCallback((toolCall: IChatMessageToolCall) => {
    setSelectedToolCall(toolCall);
    setResultDialogOpen(true);
  }, []);

  const handleCloseResultDialog = useCallback(() => {
    setResultDialogOpen(false);
    setSelectedToolCall(null);
  }, []);

  // Timer component for individual tool execution
  const ExecutionTimer = ({ toolCallId }: { toolCallId: string }) => {
    const [elapsedTime, setElapsedTime] = useState(0);
    const startTime = executionStartTimes.get(toolCallId);
    const isExecuting = executingToolIds.has(toolCallId);

    useEffect(() => {
      let interval: NodeJS.Timeout | null = null;

      if (isExecuting && startTime) {
        interval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          setElapsedTime(elapsed);
        }, 1000);
      }

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }, [isExecuting, startTime]);

    const formatTime = (seconds: number): string => {
      if (seconds < 60) {
        return `${seconds}s`;
      }
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    };

    if (!isExecuting) return null;

    return (
      <Chip
        icon={<AccessTimeIcon sx={{ fontSize: '0.75rem' }} />}
        label={formatTime(elapsedTime)}
        size="small"
        variant="outlined"
        color="primary"
        sx={{ fontSize: '0.7rem', height: 20 }}
      />
    );
  };

  const trimId = (id: string, length: number = 8) => {
    if (id.length <= length + 3) return id;
    return `${id.substring(0, length)}...`;
  };

  // Check if all tools are completed and trigger summarization
  useEffect(() => {
    const completedTools = toolCalls.filter(tool =>
      tool.status === 'executed' || tool.status === 'error'
    );

    // Only summarize if all tools are completed and we haven't summarized yet
    if (completedTools.length === toolCalls.length && toolCalls.length > 0) {
      const hasResults = completedTools.some(tool => tool.result);

      if (hasResults) {
        // Check if we already have a summary message after this tool message
        const messages = useChatStore.getState().messages[chatId] || [];
        const currentMessageIndex = messages.findIndex(msg => msg.id === messageId);
        const nextMessage = messages[currentMessageIndex + 1];

        // Only summarize if there's no next message or the next message is not from assistant
        if (!nextMessage || nextMessage.sender_object?.username !== useAgentStore.getState().agent?.username) {
          const toolResults = completedTools.map(tool => ({
            toolName: tool.function.name,
            result: tool.result,
            executionTime: tool.execution_time_seconds,
            status: tool.status || 'unknown'
          }));

          // Trigger summarization
          summarizeToolResults(chatId, toolResults).catch(error => {
            console.error("Failed to summarize tool results:", error);
          });
        }
      }
    }
  }, [toolCalls, chatId, messageId]);

  // Helper function to get all URLs from completed tool calls
  const getAllReferencesFromTools = useCallback(() => {
    const allUrls: string[] = [];

    toolCalls.forEach(toolCall => {
      if ((toolCall.status === 'executed' || toolCall.status === 'error') && toolCall.result) {
        const urls = extractUrls(toolCall.result);
        allUrls.push(...urls);
      }
    });

    // Remove duplicates
    return [...new Set(allUrls)];
  }, [toolCalls]);

  const allReferences = getAllReferencesFromTools();

  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  return (
    <>
      <Box sx={{ pt: 0.5, color: "text.primary" }}>
        <Typography variant="body2" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          {intl.formatMessage({ id: 'toolDisplay.title' })}
        </Typography>

        {toolCalls.map((toolCall) => {
          const isLoadingThisLog = isLoadingLogs && selectedToolName === toolCall.function.name;
          const isExecuting = executingToolIds.has(toolCall.id);
          const currentStatus = toolCall.status;
          const isAutoApproved = autoApprovedTools.has(toolCall.id);
          // Use persisted execution time if available, otherwise use local state
          const duration = toolCall.execution_time_seconds || executionDurations.get(toolCall.id);
          const isCompleted = currentStatus === 'executed' || currentStatus === 'error';

          let statusDisplayKey;
          if (currentStatus === 'approved') {
            statusDisplayKey = 'toolDisplay.approved';
          } else if (currentStatus === 'denied') {
            statusDisplayKey = 'toolDisplay.denied';
          } else if (currentStatus === 'executed') {
            statusDisplayKey = 'toolDisplay.executed';
          } else if (currentStatus === 'error') {
            statusDisplayKey = 'toolDisplay.error';
          } else {
            statusDisplayKey = 'toolDisplay.statusPending';
          }

          return (
            <Box key={toolCall.id} sx={{ mb: 1, pl: 0 }}>
              <Typography variant="body2" component="div" sx={{ color: "text.secondary", display: 'flex', alignItems: 'center', mb: 0.25 }}>
                <Box component="span" sx={{ mr: 0.5 }}>•</Box>
                <Box component="span" sx={{ fontFamily: "monospace", color: "primary.main", px: 0.5, borderRadius: '4px' }}>
                  {toolCall.function.name}
                </Box>
                {toolCall.mcp_server && (
                  <Box component="span" sx={{ ml: 1, fontSize: '0.75rem', color: 'text.secondary', fontStyle: 'italic' }}>
                    ({formatMCPName(toolCall.mcp_server)})
                  </Box>
                )}
                {isAutoApproved && (
                  <Chip
                    label="Auto-approved"
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ ml: 1, fontSize: '0.65rem', height: 18 }}
                  />
                )}
                :
              </Typography>

              {toolCall.tool_description && (
                <Typography variant="caption" component="div" sx={{ color: "text.secondary", fontStyle: 'italic', pl: 2, mb: 0.5 }}>
                  {toolCall.tool_description}
                </Typography>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mt: 0.5, pl: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {(currentStatus === 'pending' || currentStatus === undefined || currentStatus === null) ? (
                    <>
                      <Button
                        disableElevation
                        variant='outlined'
                        size="small"
                        color="success"
                        startIcon={<CheckCircleOutlineIcon />}
                        onClick={() => handleApprove(toolCall.id)}
                      >
                        {intl.formatMessage({ id: 'toolDisplay.approve' })}
                      </Button>
                      <Button
                        disableElevation
                        variant='outlined'
                        size="small"
                        color="error"
                        startIcon={<CancelOutlinedIcon />}
                        onClick={() => handleDeny(toolCall.id)}
                      >
                        {intl.formatMessage({ id: 'toolDisplay.deny' })}
                      </Button>
                    </>
                  ) : currentStatus === 'approved' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                        {intl.formatMessage({ id: 'toolDisplay.approved' })}
                        {isAutoApproved && (
                          <Typography component="span" sx={{ fontSize: '0.75rem', ml: 0.5, opacity: 0.8 }}>
                            (Auto)
                          </Typography>
                        )}
                      </Typography>
                      <Button
                        disableElevation
                        variant='outlined'
                        size="small"
                        color="primary"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => handleExecute(toolCall)}
                        disabled={isExecuting}
                      >
                        {isExecuting ? intl.formatMessage({ id: 'toolDisplay.executing' }) : intl.formatMessage({ id: 'toolDisplay.execute' })}
                      </Button>
                      <ExecutionTimer toolCallId={toolCall.id} />
                    </Box>
                  ) : currentStatus === 'denied' ? (
                    <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                      {intl.formatMessage({ id: 'toolDisplay.denied' })}
                    </Typography>
                  ) : currentStatus === 'executed' ? (
                    <Typography
                      variant="caption"
                      component="span"
                      onClick={() => handleViewResult(toolCall)}
                      sx={{
                        cursor: 'pointer',
                        color: 'success.main',
                        textDecoration: 'underline',
                        '&:hover': {
                          color: 'success.dark',
                        }
                      }}
                    >
                      View Result {duration && `(${duration}s)`}
                    </Typography>
                  ) : currentStatus === 'error' ? (
                    <Typography
                      variant="caption"
                      component="span"
                      onClick={() => handleViewResult(toolCall)}
                      sx={{
                        cursor: 'pointer',
                        color: 'error.main',
                        textDecoration: 'underline',
                        '&:hover': {
                          color: 'error.dark',
                        }
                      }}
                    >
                      View Error {duration && `(${duration}s)`}
                    </Typography>
                  ) : null}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', color: "text.secondary", gap: 1 }}>
                  <Typography variant="caption" component="span">
                    {intl.formatMessage({ id: 'toolDisplay.idLabel' })} {trimId(toolCall.id, 6)} | {intl.formatMessage({ id: 'toolDisplay.statusLabel' })}{' '}
                    <Box component="span" sx={{
                      fontWeight: 'medium',
                      color: currentStatus === 'approved' ? 'success.main'
                        : currentStatus === 'denied' ? 'error.main'
                          : currentStatus === 'executed' ? 'success.main'
                            : currentStatus === 'error' ? 'error.main'
                              : 'text.secondary'
                    }}>
                      {intl.formatMessage({ id: statusDisplayKey })}
                    </Box>
                  </Typography>
                  <Typography
                    variant="caption"
                    component="span"
                    onClick={() => {
                      if (!isLoadingThisLog) {
                        handleViewLogs(toolCall.id, toolCall.function.name);
                      }
                    }}
                    sx={{
                      cursor: isLoadingThisLog ? 'default' : 'pointer',
                      color: isLoadingThisLog ? 'text.disabled' : 'info.main',
                      textDecoration: isLoadingThisLog ? 'none' : 'underline',
                      '&:hover': {
                        color: isLoadingThisLog ? 'text.disabled' : 'info.dark',
                      }
                    }}
                  >
                    {isLoadingThisLog ? intl.formatMessage({ id: 'toolDisplay.loadingLogs' }) : intl.formatMessage({ id: 'toolDisplay.logs' })}
                  </Typography>
                  {(currentStatus === 'approved' || currentStatus === 'denied' || currentStatus === 'executed' || currentStatus === 'error') && (
                    <Typography
                      variant="caption"
                      component="span"
                      onClick={() => handleReset(toolCall.id)}
                      sx={{
                        cursor: 'pointer',
                        color: 'warning.main',
                        textDecoration: 'underline',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.25,
                        '&:hover': {
                          color: 'warning.dark',
                        }
                      }}
                    >
                      <RestartAltIcon sx={{ fontSize: '0.75rem' }} />
                      {intl.formatMessage({ id: 'toolDisplay.reset' })}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          )
        })}

        {/* References Section */}
        {allReferences.length > 0 && (
          <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography
              variant="caption"
              component="div"
              sx={{
                fontWeight: 'medium',
                mb: 0.5,
                color: 'text.secondary',
                opacity: 0.8
              }}
            >
              References ({allReferences.length}):
            </Typography>
            <Box sx={{ pl: 1 }}>
              {allReferences.map((url, index) => (
                <Typography
                  key={index}
                  variant="caption"
                  component="div"
                  sx={{ mb: 0.25 }}
                >
                  <Typography
                    component="span"
                    onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                    sx={{
                      cursor: 'pointer',
                      color: 'text.secondary',
                      opacity: 0.7,
                      fontSize: '0.7rem',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                        opacity: 0.9,
                      },
                      wordBreak: 'break-all',
                    }}
                  >
                    • {formatUrlForDisplay(url, 70)}
                  </Typography>
                </Typography>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      <ToolLogDialog
        open={logDialogOpen}
        onClose={handleCloseLogDialog}
        logContent={selectedLogContent}
        toolName={selectedToolName}
      />

      <ToolResultDialog
        open={resultDialogOpen}
        onClose={handleCloseResultDialog}
        toolCall={selectedToolCall}
        executionTime={selectedToolCall ? executionDurations.get(selectedToolCall.id) : undefined}
      />
    </>
  );
});

export default ToolDisplay;
