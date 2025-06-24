import { Box, Typography, Chip } from "@mui/material";
import { IChatMessageToolCall } from "@/../../types/Chat/Message";
import { memo } from 'react';

interface ToolCallHeaderProps {
  toolCall: IChatMessageToolCall;
  isAgentExecution: boolean;
  isAgentOrchestrated: boolean;
  isLangGraphOrchestrated: boolean;
  isAutoApproved: boolean;
  formatMCPName: (key: string) => string;
}

export const ToolCallHeader = memo(({
  toolCall,
  isAgentExecution,
  isAgentOrchestrated,
  isLangGraphOrchestrated,
  isAutoApproved,
  formatMCPName
}: ToolCallHeaderProps) => {
  return (
    <Typography variant="body2" component="div" sx={{ color: "text.secondary", display: 'flex', alignItems: 'center', mb: 0.25 }}>
      <Box component="span" sx={{ mr: 0.5 }}>•</Box>
      <Box component="span" sx={{ fontFamily: "monospace", color: "primary.main", px: 0.5, borderRadius: '4px' }}>
        {isAgentExecution 
          ? toolCall.function.name.replace('_agent_execution', '').replace('_', ' ').toUpperCase() + ' Agent'
          : toolCall.function.name
        }
      </Box>
      {toolCall.mcp_server && (
        <Box component="span" sx={{ ml: 1, fontSize: '0.75rem', color: 'text.secondary', fontStyle: 'italic' }}>
          ({isAgentExecution 
            ? 'Agent Orchestrator'
            : isLangGraphOrchestrated 
              ? 'LangGraph' 
              : formatMCPName(toolCall.mcp_server)
          })
        </Box>
      )}
      {isAgentOrchestrated && (
        <Box component="span" sx={{ ml: 1, fontSize: '0.75rem', color: 'warning.main', fontStyle: 'italic' }}>
          via Agent
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
    </Typography>
  );
}); 