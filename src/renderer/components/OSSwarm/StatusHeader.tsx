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
      <Toolbar variant="dense" sx={{ minHeight: 56, px: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ flexGrow: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {statusInfo.icon}
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              {statusInfo.text}
            </Typography>
            {(isTaskRunning || isTaskActive) && !isTaskCompleted && (
              <Chip
                label={intl.formatMessage({ id: 'osswarm.status.active' })}
                size="small"
                sx={{ 
                  bgcolor: alpha(theme.palette.common.white, 0.2),
                  color: 'inherit',
                  fontWeight: 500
                }}
              />
            )}
          </Stack>
          
          {/* ✅ Enhanced action buttons */}
          <Stack direction="row" spacing={1}>
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
              {intl.formatMessage({ id: 'osswarm.history' })}
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
                {intl.formatMessage({ id: 'osswarm.abort' })}
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
                {intl.formatMessage({ id: 'osswarm.forceStop' })}
              </Button>
            )}
          </Stack>
        </Stack>
        
        {/* ✅ Enhanced control buttons */}
        <Stack direction="row" spacing={0.5}>
          <Tooltip title={intl.formatMessage({ id: isFullscreen ? 'osswarm.exitFullscreen' : 'osswarm.fullscreen' })}>
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
          
          <Tooltip title={intl.formatMessage({ id: isMinimized ? 'osswarm.expand' : 'osswarm.minimize' })}>
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