import { Box, Typography, Button } from "@mui/material";
import { alpha } from '@mui/material/styles';
import { IChatMessageToolCall } from "@/../../types/Chat/Message";
import MarkdownRenderer from "@/components/Chat/MarkdownRenderer";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { memo, useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import { useLLMStore, IToolLog } from "@/stores/LLM/LLMStore";
import ToolLogDialog from "@/components/Dialog/MCP/ToolLog";
import { useChatStore } from "@/stores/Chat/ChatStore";

interface ToolDisplayProps {
  toolCalls: IChatMessageToolCall[];
  chatId: string;
  messageId: string;
}

const ToolDisplay = memo(({ toolCalls, chatId, messageId }: ToolDisplayProps) => {
  const intl = useIntl();
  const { updateToolCallStatus, getLogsForToolCall } = useLLMStore.getState();
  const refreshMessage = useChatStore(state => state.refreshMessage);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedLogContent, setSelectedLogContent] = useState<IToolLog[]>([]);
  const [selectedToolName, setSelectedToolName] = useState<string | undefined>(undefined);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

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
          const currentStatus = toolCall.status;
          let statusDisplayKey;
          if (currentStatus === 'approved') {
            statusDisplayKey = 'toolDisplay.approved';
          } else if (currentStatus === 'denied') {
            statusDisplayKey = 'toolDisplay.denied';
          } else {
            statusDisplayKey = 'toolDisplay.statusPending';
          }

          return (
            <Box key={toolCall.id} sx={{ mb: 1, pl: 0 }}>
              <Typography variant="body2" component="div" sx={{ color: "text.secondary", display: 'flex', alignItems: 'center', mb: 0.25 }}>
                <Box component="span" sx={{ mr: 0.5 }}>•</Box>
                <Box component="span" sx={{ fontFamily: "monospace", color: "primary.main", px: 0.5, borderRadius: '4px' }}>
                  {toolCall.function.name}
                </Box>:
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
                    <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                      {intl.formatMessage({ id: 'toolDisplay.approved' })}
                    </Typography>
                  ) : currentStatus === 'denied' ? (
                    <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                      {intl.formatMessage({ id: 'toolDisplay.denied' })}
                    </Typography>
                  ) : null}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', color: "text.secondary" }}>
                  <Typography variant="caption" component="span">
                    {intl.formatMessage({ id: 'toolDisplay.idLabel' })} {trimId(toolCall.id, 6)} | {intl.formatMessage({ id: 'toolDisplay.statusLabel' })}{' '}
                    <Box component="span" sx={{ fontWeight: 'medium', color: currentStatus === 'approved' ? 'success.main' : currentStatus === 'denied' ? 'error.main' : 'text.secondary' }}>
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
