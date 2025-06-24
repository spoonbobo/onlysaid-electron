import { Box, Typography } from "@mui/material";
import { IChatMessageToolCall } from "@/../../types/Chat/Message";
import { memo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useLLMStore, IToolLog } from "@/renderer/stores/LLM/LLMStore";
import ToolLogDialog from "@/renderer/components/Dialog/MCP/ToolLog";
import ToolResultDialog from "@/renderer/components/Dialog/MCP/ToolResult";
import { useToolDisplayLogic } from './hooks/useToolDisplayLogic';
import { ToolCallItem } from './components/ToolCallItem';
import { ReferencesSection } from './components/ReferencesSection';

interface ToolDisplayProps {
  toolCalls: IChatMessageToolCall[];
  chatId: string;
  messageId: string;
}

const ToolDisplay = memo(({ toolCalls, chatId, messageId }: ToolDisplayProps) => {
  const intl = useIntl();
  const { getLogsForToolCall } = useLLMStore();
  
  // Dialog states
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedLogContent, setSelectedLogContent] = useState<IToolLog[]>([]);
  const [selectedToolName, setSelectedToolName] = useState<string | undefined>(undefined);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [selectedToolCall, setSelectedToolCall] = useState<IChatMessageToolCall | null>(null);

  // Main logic hook
  const {
    executingToolIds,
    autoApprovedTools,
    isSummarizing,
    isProcessing,
    handleApprove,
    handleReject,
    handleReset,
    handleSummarize,
    shouldShowSummarizeForTool,
    getAllReferencesFromTools,
    formatMCPName,
    isAgentExecution
  } = useToolDisplayLogic({ toolCalls, chatId, messageId });

  const handleViewLogs = async (toolCallId: string, toolName: string) => {
    setIsLoadingLogs(true);
    setSelectedToolName(toolName);
    
    const logs = await getLogsForToolCall(toolCallId);
    
    setSelectedLogContent(logs);
    setIsLoadingLogs(false);
    setLogDialogOpen(true);
  };

  const handleCloseLogDialog = () => {
    setLogDialogOpen(false);
    setSelectedLogContent([]);
    setSelectedToolName(undefined);
  };

  const handleViewResult = (toolCall: IChatMessageToolCall) => {
    setSelectedToolCall(toolCall);
    setResultDialogOpen(true);
  };

  const handleCloseResultDialog = () => {
    setResultDialogOpen(false);
    setSelectedToolCall(null);
  };

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

        {toolCalls.map((toolCall) => (
          <ToolCallItem
            key={toolCall.id}
            toolCall={toolCall}
            isLoadingLogs={isLoadingLogs && selectedToolName === toolCall.function.name}
            isExecuting={executingToolIds.has(toolCall.id)}
            isAutoApproved={autoApprovedTools.has(toolCall.id)}
            isProcessing={isProcessing}
            isSummarizing={isSummarizing}
            showSummarize={shouldShowSummarizeForTool(toolCall)}
            isAgentExecution={isAgentExecution(toolCall)}
            formatMCPName={formatMCPName}
            onApprove={handleApprove}
            onReject={handleReject}
            onReset={handleReset}
            onViewLogs={handleViewLogs}
            onViewResult={handleViewResult}
            onSummarize={handleSummarize}
          />
        ))}

        <ReferencesSection references={allReferences} />
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
        executionTime={selectedToolCall ? selectedToolCall.execution_time_seconds : undefined}
      />
    </>
  );
});

export default ToolDisplay; 