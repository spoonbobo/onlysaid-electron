import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  useTheme,
  alpha
} from '@mui/material';
import { Timeline, History } from '@mui/icons-material';
import { useIntl } from 'react-intl';
import ExecutionGraphComponent from './ExecutionGraph';
import { ExecutionGraph } from '@/renderer/stores/Agent/AgentTaskStore';
import { useAgentTaskStore } from '@/renderer/stores/Agent/AgentTaskStore';

interface GraphPanelProps {
  currentGraph: ExecutionGraph | null;
  hasExecutionGraph: boolean;
  isTaskRunning: boolean;
  isTaskActive: boolean;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  onShowHistory: () => void;
}

export const GraphPanel: React.FC<GraphPanelProps> = ({
  currentGraph,
  hasExecutionGraph,
  isTaskRunning,
  isTaskActive,
  isFullscreen,
  onFullscreenToggle,
  onShowHistory
}) => {
  const theme = useTheme();
  const intl = useIntl();

  const handleRefresh = () => {
    const { refreshCurrentExecutionGraph } = useAgentTaskStore.getState();
    refreshCurrentExecutionGraph();
  };

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {hasExecutionGraph ? (
        <ExecutionGraphComponent
          graph={currentGraph}
          isLive={isTaskRunning || isTaskActive}
          width={isFullscreen ? window.innerWidth - 40 : 600}
          height={isFullscreen ? window.innerHeight - 120 : 400}
          fullscreen={isFullscreen}
          onFullscreenToggle={onFullscreenToggle}
          onRefresh={handleRefresh}
        />
      ) : (
        <Card sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          flexGrow: 1,
          bgcolor: alpha(theme.palette.grey[50], 0.5),
          borderRadius: 3
        }}>
          <CardContent>
            <Stack alignItems="center" spacing={3} sx={{ py: 6 }}>
              <Timeline sx={{ fontSize: 64, color: 'text.disabled' }} />
              <Typography variant="h5" color="text.secondary" fontWeight={500}>
                {intl.formatMessage({ id: 'osswarm.graph.noExecutionGraph' })}
              </Typography>
              <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ maxWidth: 400 }}>
                {intl.formatMessage({ id: 'osswarm.graph.startOrSelectFromHistory' })}
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<History />}
                onClick={onShowHistory}
                sx={{ 
                  mt: 2,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5
                }}
              >
                {intl.formatMessage({ id: 'osswarm.viewHistory' })}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}; 