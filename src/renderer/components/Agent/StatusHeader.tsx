import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Stack,
  Chip,
  Button,
  IconButton,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  History,
  Stop,
  Warning,
  Fullscreen,
  FullscreenExit,
  ExpandMore,
  ExpandLess,
  Close
} from '@mui/icons-material';
import { useIntl } from 'react-intl';

interface StatusHeaderProps {
  statusInfo: any;
  isTaskRunning: boolean;
  isTaskActive: boolean;
  isTaskCompleted: boolean;
  isAborting: boolean;
  isFullscreen: boolean;
  isMinimized: boolean;
  onShowHistory: () => void;
  onAbort: () => void;
  onForceStop: () => void;
  onFullscreenToggle: () => void;
  onMinimizeToggle: () => void;
  onClose: () => void;
}

export const StatusHeader: React.FC<StatusHeaderProps> = ({
  statusInfo,
  isTaskRunning,
  isTaskActive,
  isTaskCompleted,
  isAborting,
  isFullscreen,
  isMinimized,
  onShowHistory,
  onAbort,
  onForceStop,
  onFullscreenToggle,
  onMinimizeToggle,
  onClose
}) => {
  const theme = useTheme();
  const intl = useIntl();

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: statusInfo.bgcolor,
        color: theme.palette.getContrastText(statusInfo.color),
        borderRadius: isFullscreen ? 0 : '12px 12px 0 0',
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: 56, px: isMinimized ? 2 : 3 }}>
        <Stack direction="row" alignItems="center" spacing={isMinimized ? 1 : 2} sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexShrink: 0 }}>
            {statusInfo.icon}
            <Typography 
              variant="h6" 
              sx={{ 
                fontSize: isMinimized ? '1rem' : '1.1rem', 
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {statusInfo.text}
            </Typography>
            {(isTaskRunning || isTaskActive) && !isTaskCompleted && !isMinimized && (
              <Chip
                label={intl.formatMessage({ id: 'agent.status.active' })}
                size="small"
                sx={{ 
                  bgcolor: alpha(theme.palette.common.white, 0.2),
                  color: 'inherit',
                  fontWeight: 500
                }}
              />
            )}
          </Stack>
          
          {/* ✅ Enhanced action buttons - hide when minimized */}
          {!isMinimized && (
            <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
              <Button
                size="small"
                startIcon={<History />}
                onClick={onShowHistory}
                sx={{ 
                  color: 'inherit',
                  bgcolor: alpha(theme.palette.common.white, 0.1),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.common.white, 0.2)
                  },
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500
                }}
              >
                {intl.formatMessage({ id: 'agent.history' })}
              </Button>

              {(isTaskActive || isTaskRunning) && !isAborting && (
                <Button
                  size="small"
                  startIcon={<Stop />}
                  onClick={onAbort}
                  color="warning"
                  variant="contained"
                  sx={{ 
                    textTransform: 'none',
                    fontWeight: 500,
                    borderRadius: 2
                  }}
                >
                  {intl.formatMessage({ id: 'agent.abort' })}
                </Button>
              )}
              
              {isAborting && (
                <Button
                  size="small"
                  startIcon={<Warning />}
                  onClick={onForceStop}
                  color="error"
                  variant="contained"
                  sx={{ 
                    textTransform: 'none',
                    fontWeight: 500,
                    borderRadius: 2
                  }}
                >
                  {intl.formatMessage({ id: 'agent.forceStop' })}
                </Button>
              )}
            </Stack>
          )}
        </Stack>
        
        {/* ✅ Enhanced control buttons - compact when minimized */}
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          {/* ✅ When minimized, show critical action buttons as icons only */}
          {isMinimized && (
            <>
              <Tooltip title={intl.formatMessage({ id: 'agent.history' })}>
                <IconButton
                  size="small"
                  onClick={onShowHistory}
                  sx={{ 
                    color: 'inherit',
                    bgcolor: alpha(theme.palette.common.white, 0.1),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.common.white, 0.2)
                    }
                  }}
                >
                  <History />
                </IconButton>
              </Tooltip>

              {(isTaskActive || isTaskRunning) && !isAborting && (
                <Tooltip title={intl.formatMessage({ id: 'agent.abort' })}>
                  <IconButton
                    size="small"
                    onClick={onAbort}
                    sx={{ 
                      color: theme.palette.warning.main,
                      bgcolor: alpha(theme.palette.warning.main, 0.1),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.warning.main, 0.2)
                      }
                    }}
                  >
                    <Stop />
                  </IconButton>
                </Tooltip>
              )}
              
              {isAborting && (
                <Tooltip title={intl.formatMessage({ id: 'agent.forceStop' })}>
                  <IconButton
                    size="small"
                    onClick={onForceStop}
                    sx={{ 
                      color: theme.palette.error.main,
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.error.main, 0.2)
                      }
                    }}
                  >
                    <Warning />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}

          <Tooltip title={intl.formatMessage({ id: isFullscreen ? 'agent.exitFullscreen' : 'agent.fullscreen' })}>
            <IconButton
              size="small"
              onClick={onFullscreenToggle}
              sx={{ 
                color: 'inherit',
                bgcolor: alpha(theme.palette.common.white, 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.common.white, 0.2)
                }
              }}
            >
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title={intl.formatMessage({ id: isMinimized ? 'agent.expand' : 'agent.minimize' })}>
            <IconButton
              size="small"
              onClick={onMinimizeToggle}
              sx={{ 
                color: 'inherit',
                bgcolor: alpha(theme.palette.common.white, 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.common.white, 0.2)
                }
              }}
            >
              {isMinimized ? <ExpandMore /> : <ExpandLess />}
            </IconButton>
          </Tooltip>

          {(isTaskCompleted || (!isTaskActive && !isTaskRunning)) && (
            <Tooltip title={intl.formatMessage({ id: 'common.close' })}>
              <IconButton
                size="small"
                onClick={onClose}
                sx={{ 
                  color: 'inherit',
                  bgcolor: alpha(theme.palette.common.white, 0.1),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.common.white, 0.2)
                  }
                }}
              >
                <Close />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  );
}; 