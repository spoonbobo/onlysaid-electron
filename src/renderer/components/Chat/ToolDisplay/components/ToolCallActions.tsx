import { Box, Typography, Button } from "@mui/material";
import { IChatMessageToolCall } from "@/../../types/Chat/Message";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { memo } from 'react';
import { useIntl } from 'react-intl';

interface ToolCallActionsProps {
  toolCall: IChatMessageToolCall;
  currentStatus: string | undefined;
  isAutoApproved: boolean;
  isProcessing: boolean;
  isSummarizing: boolean;
  showSummarize: boolean;
  onApprove: (toolCallId: string) => void;
  onReject: (toolCallId: string) => void;
  onViewResult: (toolCall: IChatMessageToolCall) => void;
  onSummarize: () => void;
}

export const ToolCallActions = memo(({
  toolCall,
  currentStatus,
  isAutoApproved,
  isProcessing,
  isSummarizing,
  showSummarize,
  onApprove,
  onReject,
  onViewResult,
  onSummarize
}: ToolCallActionsProps) => {
  const intl = useIntl();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {(currentStatus === 'pending' || currentStatus === undefined || currentStatus === null) ? (
        <>
          <Button
            disableElevation
            variant='outlined'
            size="small"
            color="success"
            startIcon={<CheckCircleOutlineIcon />}
            onClick={() => onApprove(toolCall.id)}
            disabled={isProcessing}
          >
            {intl.formatMessage({ id: 'toolDisplay.approve' })}
          </Button>
          <Button
            disableElevation
            variant='outlined'
            size="small"
            color="error"
            startIcon={<CancelOutlinedIcon />}
            onClick={() => onReject(toolCall.id)}
            disabled={isProcessing}
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
        </Box>
      ) : currentStatus === 'executing' ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 'bold' }}>
            {intl.formatMessage({ id: 'toolDisplay.executing' })}
          </Typography>
        </Box>
      ) : currentStatus === 'denied' || currentStatus === 'rejected' ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }}>
            {intl.formatMessage({ id: 'toolDisplay.denied' })}
          </Typography>
        </Box>
      ) : currentStatus === 'executed' ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="caption"
            component="span"
            onClick={() => onViewResult(toolCall)}
            sx={{
              cursor: 'pointer',
              color: 'success.main',
              textDecoration: 'underline',
              '&:hover': {
                color: 'success.dark',
              }
            }}
          >
            {intl.formatMessage({ id: 'toolDisplay.viewResult' })}
          </Typography>
          
          {showSummarize && (
            <Typography
              variant="caption"
              component="span"
              onClick={isSummarizing ? undefined : onSummarize}
              sx={{
                cursor: isSummarizing ? 'default' : 'pointer',
                color: isSummarizing ? 'text.disabled' : 'primary.main',
                textDecoration: isSummarizing ? 'none' : 'underline',
                '&:hover': {
                  color: isSummarizing ? 'text.disabled' : 'primary.dark',
                }
              }}
            >
              {isSummarizing 
                ? intl.formatMessage({ id: 'toolDisplay.summarizing' })
                : intl.formatMessage({ id: 'toolDisplay.summarize' })
              }
            </Typography>
          )}
        </Box>
      ) : currentStatus === 'error' ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="caption"
            component="span"
            onClick={() => onViewResult(toolCall)}
            sx={{
              cursor: 'pointer',
              color: 'error.main',
              textDecoration: 'underline',
              '&:hover': {
                color: 'error.dark',
              }
            }}
          >
            {intl.formatMessage({ id: 'toolDisplay.viewError' })}
          </Typography>
          
          {showSummarize && (
            <Typography
              variant="caption"
              component="span"
              onClick={isSummarizing ? undefined : onSummarize}
              sx={{
                cursor: isSummarizing ? 'default' : 'pointer',
                color: isSummarizing ? 'text.disabled' : 'primary.main',
                textDecoration: isSummarizing ? 'none' : 'underline',
                '&:hover': {
                  color: isSummarizing ? 'text.disabled' : 'primary.dark',
                }
              }}
            >
              {isSummarizing 
                ? intl.formatMessage({ id: 'toolDisplay.summarizing' })
                : intl.formatMessage({ id: 'toolDisplay.summarize' })
              }
            </Typography>
          )}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
            {currentStatus || 'Unknown'}
          </Typography>
        </Box>
      )}
    </Box>
  );
}); 