import React from 'react';
import {
  Paper,
  Typography,
  Stack,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import { useIntl } from 'react-intl';
import { ExecutionGraph } from '@/renderer/stores/Agent/task';

interface StatsFooterProps {
  currentGraph: ExecutionGraph;
  isFullscreen: boolean;
}

export const StatsFooter: React.FC<StatsFooterProps> = ({
  currentGraph,
  isFullscreen
}) => {
  const theme = useTheme();
  const intl = useIntl();

  return (
    <Paper
      square
      elevation={0}
      sx={{
        p: 2.5,
        bgcolor: alpha(theme.palette.primary.main, 0.03),
        borderTop: 1,
        borderColor: 'divider',
        borderRadius: isFullscreen ? 0 : '0 0 12px 12px'
      }}
    >
      <Stack direction="row" spacing={4} justifyContent="space-around">
        <Stack alignItems="center" sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {intl.formatMessage({ id: 'agent.stats.agents' })}
          </Typography>
          <Typography variant="h5" fontWeight="bold" color="primary.main">
            {currentGraph.agents.length}
          </Typography>
        </Stack>
        
        <Stack alignItems="center" sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {intl.formatMessage({ id: 'agent.stats.tasks' })}
          </Typography>
          <Typography variant="h5" fontWeight="bold" color="primary.main">
            {currentGraph.tasks.length}
          </Typography>
        </Stack>
        
        <Stack alignItems="center" sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {intl.formatMessage({ id: 'agent.stats.tools' })}
          </Typography>
          <Typography variant="h5" fontWeight="bold" color="primary.main">
            {currentGraph.toolExecutions.length}
          </Typography>
        </Stack>
        
        <Stack alignItems="center" sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {intl.formatMessage({ id: 'agent.stats.status' })}
          </Typography>
          <Chip
            label={currentGraph.execution.status.toUpperCase()}
            size="medium"
            sx={{ 
              fontWeight: 600,
              fontSize: '0.75rem',
              borderRadius: 2
            }}
            color={
              currentGraph.execution.status === 'completed' ? 'success' :
              currentGraph.execution.status === 'failed' ? 'error' :
              currentGraph.execution.status === 'running' ? 'info' :
              'default'
            }
          />
        </Stack>
      </Stack>
    </Paper>
  );
}; 