import { Box, Typography, Button, Chip } from "@mui/material";
import { IChatMessageToolCall } from "@/../../types/Chat/Message";
import { memo } from 'react';
import { useIntl } from 'react-intl';
import { ToolCallHeader } from './ToolCallHeader';
import { ToolCallActions } from './ToolCallActions';
import { ToolCallStatus } from './ToolCallStatus';

interface ToolCallItemProps {
  toolCall: IChatMessageToolCall;
  isLoadingLogs: boolean;
  isExecuting: boolean;
  isAutoApproved: boolean;
  isProcessing: boolean;
  isSummarizing: boolean;
  showSummarize: boolean;
  isAgentExecution: boolean;
  formatMCPName: (key: string) => string;
  onApprove: (toolCallId: string) => void;
  onReject: (toolCallId: string) => void;
  onReset: (toolCallId: string) => void;
  onViewLogs: (toolCallId: string, toolName: string) => void;
  onViewResult: (toolCall: IChatMessageToolCall) => void;
  onSummarize: () => void;
}

export const ToolCallItem = memo(({
  toolCall,
  isLoadingLogs,
  isExecuting,
  isAutoApproved,
  isProcessing,
  isSummarizing,
  showSummarize,
  isAgentExecution,
  formatMCPName,
  onApprove,
  onReject,
  onReset,
  onViewLogs,
  onViewResult,
  onSummarize
}: ToolCallItemProps) => {
  const intl = useIntl();
  
  const currentStatus = toolCall.status;
  const isAgentOrchestrated = toolCall.id.startsWith('approval-');
  const isLangGraphOrchestrated = toolCall.mcp_server === 'langgraph';

  const trimId = (id: string, length: number = 8) => {
    if (id.length <= length + 3) return id;
    return `${id.substring(0, length)}...`;
  };

  return (
    <Box sx={{ mb: 1, pl: 0 }}>
      <ToolCallHeader
        toolCall={toolCall}
        isAgentExecution={isAgentExecution}
        isAgentOrchestrated={isAgentOrchestrated}
        isLangGraphOrchestrated={isLangGraphOrchestrated}
        isAutoApproved={isAutoApproved}
        formatMCPName={formatMCPName}
      />

      {toolCall.tool_description && (
        <Typography variant="caption" component="div" sx={{ color: "text.secondary", fontStyle: 'italic', pl: 2, mb: 0.5 }}>
          {toolCall.tool_description}
        </Typography>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mt: 0.5, pl: 2 }}>
        <ToolCallActions
          toolCall={toolCall}
          currentStatus={currentStatus}
          isAutoApproved={isAutoApproved}
          isProcessing={isProcessing}
          isSummarizing={isSummarizing}
          showSummarize={showSummarize}
          onApprove={onApprove}
          onReject={onReject}
          onViewResult={onViewResult}
          onSummarize={onSummarize}
        />

        <ToolCallStatus
          toolCall={toolCall}
          currentStatus={currentStatus}
          isLoadingLogs={isLoadingLogs}
          trimId={trimId}
          onViewLogs={onViewLogs}
          onReset={onReset}
        />
      </Box>
    </Box>
  );
}); 