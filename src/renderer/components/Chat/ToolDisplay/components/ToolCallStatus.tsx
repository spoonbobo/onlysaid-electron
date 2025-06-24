import { Box, Typography } from "@mui/material";
import { IChatMessageToolCall } from "@/../../types/Chat/Message";
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { memo } from 'react';
import { useIntl } from 'react-intl';

interface ToolCallStatusProps {
  toolCall: IChatMessageToolCall;
  currentStatus: string | undefined;
  isLoadingLogs: boolean;
  trimId: (id: string, length?: number) => string;
  onViewLogs: (toolCallId: string, toolName: string) => void;
  onReset: (toolCallId: string) => void;
}

export const ToolCallStatus = memo(({
  toolCall,
  currentStatus,
  isLoadingLogs,
  trimId,
  onViewLogs,
  onReset
}: ToolCallStatusProps) => {
  const intl = useIntl();

  let statusDisplayKey;
  if (currentStatus === 'approved') {
    statusDisplayKey = 'toolDisplay.approved';
  } else if (currentStatus === 'denied') {
    statusDisplayKey = 'toolDisplay.denied';
  } else if (currentStatus === 'executed') {
    statusDisplayKey = 'toolDisplay.executed';
  } else if (currentStatus === 'error') {
    statusDisplayKey = 'toolDisplay.error';
  } else if (currentStatus === 'executing') {
    statusDisplayKey = 'toolDisplay.executing';
  } else {
    statusDisplayKey = 'toolDisplay.statusPending';
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', color: "text.secondary", gap: 1 }}>
      <Typography variant="caption" component="span">
        {intl.formatMessage({ id: 'toolDisplay.idLabel' })} {trimId(toolCall.id, 6)} | {intl.formatMessage({ id: 'toolDisplay.statusLabel' })}{' '}
        <Box component="span" sx={{
          fontWeight: 'medium',
          color: currentStatus === 'approved' ? 'success.main'
            : (currentStatus === 'denied' || currentStatus === 'rejected') ? 'error.main'
              : currentStatus === 'executed' ? 'success.main'
                : currentStatus === 'error' ? 'error.main'
                  : currentStatus === 'executing' ? 'info.main'
                    : 'text.secondary'
        }}>
          {currentStatus === 'denied' || currentStatus === 'rejected' 
            ? intl.formatMessage({ id: 'toolDisplay.denied' })
            : intl.formatMessage({ id: statusDisplayKey })
          }
        </Box>
      </Typography>
      <Typography
        variant="caption"
        component="span"
        onClick={() => {
          if (!isLoadingLogs) {
            onViewLogs(toolCall.id, toolCall.function.name);
          }
        }}
        sx={{
          cursor: isLoadingLogs ? 'default' : 'pointer',
          color: isLoadingLogs ? 'text.disabled' : 'info.main',
          textDecoration: isLoadingLogs ? 'none' : 'underline',
          '&:hover': {
            color: isLoadingLogs ? 'text.disabled' : 'info.dark',
          }
        }}
      >
        {isLoadingLogs ? intl.formatMessage({ id: 'toolDisplay.loadingLogs' }) : intl.formatMessage({ id: 'toolDisplay.logs' })}
      </Typography>
      {(currentStatus === 'approved' || currentStatus === 'denied' || currentStatus === 'rejected' || currentStatus === 'executed' || currentStatus === 'error') && (
        <Typography
          variant="caption"
          component="span"
          onClick={() => onReset(toolCall.id)}
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
  );
}); 