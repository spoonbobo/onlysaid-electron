import { Box, Typography, Button } from "@mui/material";
import { alpha } from '@mui/material/styles';
import { IChatMessageToolCall } from "@/../../types/Chat/Message";
import MarkdownRenderer from "@/components/Chat/MarkdownRenderer";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { memo, useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import { useLLMStore, IToolLog } from "@/stores/LLM/LLMStore";
import ToolLogDialog from "@/components/Dialog/MCP/ToolLog";
import { useChatStore } from "@/stores/Chat/ChatStore";
import { useMCPClientStore } from "@/stores/MCP/MCPClient";
import { useMCPStore } from "@/stores/MCP/MCPStore";

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
  const { getAllConfiguredServers } = useMCPStore.getState();
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedLogContent, setSelectedLogContent] = useState<IToolLog[]>([]);
  const [selectedToolName, setSelectedToolName] = useState<string | undefined>(undefined);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [executingToolIds, setExecutingToolIds] = useState<Set<string>>(new Set());

  // Helper function to format MCP name for display (same as in MCPSelector)
  const formatMCPName = useCallback((key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
      .replace(/Category$/, '')
      .trim();
  }, []);

  const handleApprove = useCallback(async (toolCallId: string) => {
    console.log(`Tool call ${toolCallId} approved for message ${messageId} in chat ${chatId}`);
    await updateToolCallStatus(toolCallId, 'approved');
    await refreshMessage(chatId, messageId);
  }, [updateToolCallStatus, chatId, messageId, refreshMessage]);

  const handleDeny = useCallback(async (toolCallId: string) => {
    console.log(`Tool call ${toolCallId} denied for message ${messageId} in chat ${chatId}`);
    await updateToolCallStatus(toolCallId, 'denied');
    await refreshMessage(chatId, messageId);
  }, [updateToolCallStatus, chatId, messageId, refreshMessage]);

  const handleExecute = useCallback(async (toolCall: IChatMessageToolCall) => {
    if (!toolCall.mcp_server) {
      console.error('No MCP server specified for tool call:', toolCall.id);
      await addLogForToolCall(toolCall.id, 'Error: No MCP server specified for this tool call.');
      return;
    }

    // toolCall.mcp_server is now the server ID, no need for complex lookup
    const serverId = toolCall.mcp_server;
    const allServers = getAllConfiguredServers();

    if (!allServers[serverId]) {
      console.error('Could not find MCP server configuration for:', serverId);
      await addLogForToolCall(toolCall.id, `Error: Could not find MCP server configuration for "${serverId}".`);
      return;
    }

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
        await updateToolCallResult(toolCall.id, result.data);
        await addLogForToolCall(toolCall.id, `Tool execution completed successfully. Result: ${JSON.stringify(result.data, null, 2)}`);
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
      setExecutingToolIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(toolCall.id);
        return newSet;
      });
      await refreshMessage(chatId, messageId);
    }
  }, [executeTool, updateToolCallResult, updateToolCallStatus, addLogForToolCall, chatId, messageId, refreshMessage, getAllConfiguredServers]);

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
    await updateToolCallStatus(toolCallId, 'pending');
    await refreshMessage(chatId, messageId);
  }, [updateToolCallStatus, chatId, messageId, refreshMessage]);

  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  const trimId = (id: string, length: number = 8) => {
    if (id.length <= length + 3) return id;
    return `${id.substring(0, length)}...`;
  };

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
                :
              </Typography>
              {toolCall.tool_description && (
                <Typography variant="caption" component="div" sx={{ color: "text.secondary", fontStyle: 'italic', pl: 2, mb: 0.5 }}>
                  {toolCall.tool_description}
                </Typography>
              )}
              <Box sx={{ pl: 2, mt: 0.5 }}>
                <MarkdownRenderer
                  content={`\`\`\`json\n${JSON.stringify(toolCall.function.arguments, null, 2)}\n\`\`\``}
                />
              </Box>
              {toolCall.result && (
                <Box sx={{ pl: 2, mt: 0.5 }}>
                  <Typography variant="caption" component="div" sx={{ color: "text.secondary", fontWeight: 'bold', mb: 0.25 }}>
                    {intl.formatMessage({ id: 'toolDisplay.result' })}:
                  </Typography>
                  <MarkdownRenderer
                    content={`\`\`\`json\n${JSON.stringify(toolCall.result, null, 2)}\n\`\`\``}
                  />
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mt: 0.5, pl: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}> {/* Left group: Action buttons OR status text */}
                  {(currentStatus === 'pending' || currentStatus === undefined || currentStatus === null) ? (
                    <>
                      <Button
                        disableElevation
                        variant='outlined'
                        size="small"
                        color="success"
                        startIcon={<CheckCircleOutlineIcon />}
                        onClick={() => handleApprove(toolCall.id)}
                        sx={{
                          '&:hover': {
                            backgroundColor: (theme) => alpha(theme.palette.success.main, 0.08),
                          }
                        }}
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
                        sx={{
                          '&:hover': {
                            backgroundColor: (theme) => alpha(theme.palette.error.main, 0.08),
                          }
                        }}
                      >
                        {intl.formatMessage({ id: 'toolDisplay.deny' })}
                      </Button>
                    </>
                  ) : currentStatus === 'approved' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                        {intl.formatMessage({ id: 'toolDisplay.approved' })}
                      </Typography>
                      <Button
                        disableElevation
                        variant='outlined'
                        size="small"
                        color="primary"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => handleExecute(toolCall)}
                        disabled={isExecuting}
                        sx={{
                          '&:hover': {
                            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                          }
                        }}
                      >
                        {isExecuting ? intl.formatMessage({ id: 'toolDisplay.executing' }) : intl.formatMessage({ id: 'toolDisplay.execute' })}
                      </Button>
                    </Box>
                  ) : currentStatus === 'denied' ? (
                    <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                      {intl.formatMessage({ id: 'toolDisplay.denied' })}
                    </Typography>
                  ) : currentStatus === 'executed' ? (
                    <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 'bold' }}>
                      {intl.formatMessage({ id: 'toolDisplay.executed' })}
                    </Typography>
                  ) : currentStatus === 'error' ? (
                    <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                      {intl.formatMessage({ id: 'toolDisplay.error' })}
                    </Typography>
                  ) : null}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', color: "text.secondary" }}>
                  <Typography variant="caption" component="span">
                    {intl.formatMessage({ id: 'toolDisplay.idLabel' })} {trimId(toolCall.id, 6)} | {intl.formatMessage({ id: 'toolDisplay.statusLabel' })}{' '}
                    <Box component="span" sx={{
                      fontWeight: 'medium',
                      color: currentStatus === 'approved' ? 'success.main'
                        : currentStatus === 'denied' ? 'error.main'
                          : currentStatus === 'executed' ? 'info.main'
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
                      ml: 1,
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
                        ml: 1,
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
      </Box>
      <ToolLogDialog
        open={logDialogOpen}
        onClose={handleCloseLogDialog}
        logContent={selectedLogContent}
        toolName={selectedToolName}
      />
    </>
  );
});

export default ToolDisplay;
