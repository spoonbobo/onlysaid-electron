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
      overflow: 'hidden',
      position: 'relative'
    }}>
      {hasExecutionGraph ? (
        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex',
          minHeight: 0,
          position: 'relative'
        }}>
          <ExecutionGraphComponent
            graph={currentGraph}
            isLive={isTaskRunning || isTaskActive}
            fullscreen={isFullscreen}
            onFullscreenToggle={onFullscreenToggle}
            onRefresh={handleRefresh}
          />
        </Box>
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
                {intl.formatMessage({ id: 'agent.graph.noExecutionGraph' })}
              </Typography>
              <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ maxWidth: 400 }}>
                {intl.formatMessage({ id: 'agent.graph.startOrSelectFromHistory' })}
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
                {intl.formatMessage({ id: 'agent.viewHistory' })}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}; 