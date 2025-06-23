import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Stack,
  Box,
  Avatar,
  IconButton,
  Tooltip,
  Badge,
  LinearProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  Person,
  Psychology,
  Build,
  Search,
  Analytics,
  Create,
  Engineering,
  Chat,
  VerifiedUser,
  Storage,
  PlayArrow,
  Pause,
  CheckCircle,
  Error as ErrorIcon,
  Info as InfoIcon,
  MoreVert
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { AgentCard as IAgentCard } from '@/../../types/Agent/AgentCard';

interface AgentCardProps {
  agentCard: IAgentCard;
  compact?: boolean;
  showActions?: boolean;
  onSelect?: (agentCard: IAgentCard) => void;
  onAction?: (action: string, agentCard: IAgentCard) => void;
}

const getRoleIcon = (role: string) => {
  switch (role.toLowerCase()) {
    case 'research':
      return <Search />;
    case 'analysis':
      return <Analytics />;
    case 'creative':
      return <Create />;
    case 'technical':
      return <Engineering />;
    case 'communication':
      return <Chat />;
    case 'validation':
      return <VerifiedUser />;
    case 'rag':
      return <Storage />;
    case 'master':
      return <Psychology />;
    default:
      return <Person />;
  }
};

const getStatusColor = (status: string, theme: any) => {
  switch (status) {
    case 'idle':
      return theme.palette.grey[500];
    case 'busy':
      return theme.palette.warning.main;
    case 'completed':
      return theme.palette.success.main;
    case 'failed':
      return theme.palette.error.main;
    default:
      return theme.palette.grey[500];
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'idle':
      return <InfoIcon />;
    case 'busy':
      return <PlayArrow />;
    case 'completed':
      return <CheckCircle />;
    case 'failed':
      return <ErrorIcon />;
    default:
      return <InfoIcon />;
  }
};

export const AgentCard: React.FC<AgentCardProps> = ({
  agentCard,
  compact = false,
  showActions = true,
  onSelect,
  onAction
}) => {
  const theme = useTheme();
  const intl = useIntl();

  const statusColor = getStatusColor(agentCard.status || 'idle', theme);
  const roleIcon = getRoleIcon(agentCard.role || 'agent');
  const statusIcon = getStatusIcon(agentCard.status || 'idle');

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(agentCard);
    }
  };

  const handleActionClick = (action: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onAction) {
      onAction(action, agentCard);
    }
  };


  return (
    <Card
      sx={{
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        border: 2,
        borderColor: alpha(statusColor, 0.3),
        '&:hover': onSelect ? {
          boxShadow: theme.shadows[8],
          borderColor: statusColor,
          transform: 'translateY(-2px)'
        } : {},
        ...(compact && {
          minHeight: 'auto'
        })
      }}
      onClick={handleCardClick}
    >
      <CardContent sx={{ pb: compact ? 1 : 2 }}>
        {/* Header with Avatar and Status */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: compact ? 1 : 2 }}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: statusColor,
                  border: `2px solid ${theme.palette.background.paper}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {React.cloneElement(statusIcon, { 
                  sx: { fontSize: 8, color: 'white' } 
                })}
              </Box>
            }
          >
            <Avatar
              sx={{
                bgcolor: alpha(statusColor, 0.1),
                color: statusColor,
                width: compact ? 40 : 56,
                height: compact ? 40 : 56
              }}
              src={agentCard.iconUrl}
            >
              {roleIcon}
            </Avatar>
          </Badge>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant={compact ? "subtitle2" : "h6"}
              fontWeight={600}
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {agentCard.name}
            </Typography>
            
            {!compact && (
              <Typography variant="body2" color="text.secondary">
                {agentCard.role && (
                  <Chip
                    label={agentCard.role}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 1, textTransform: 'capitalize' }}
                  />
                )}
                v{agentCard.version}
              </Typography>
            )}
          </Box>

          {showActions && (
            <IconButton
              size="small"
              onClick={(e) => handleActionClick('menu', e)}
            >
              <MoreVert />
            </IconButton>
          )}
        </Stack>

        {/* Description */}
        {!compact && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {agentCard.description}
          </Typography>
        )}

        {/* Current Task */}
        {agentCard.currentTask && (
          <Box sx={{ mb: compact ? 1 : 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              {intl.formatMessage({ id: 'agent.currentTask' })}:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                p: 1,
                bgcolor: alpha(statusColor, 0.05),
                borderRadius: 1,
                fontSize: '0.75rem',
                display: '-webkit-box',
                WebkitLineClamp: compact ? 1 : 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {agentCard.currentTask}
            </Typography>
            
            {agentCard.status === 'busy' && (
              <LinearProgress
                sx={{
                  mt: 1,
                  height: 3,
                  borderRadius: 1.5,
                  bgcolor: alpha(statusColor, 0.1),
                  '& .MuiLinearProgress-bar': {
                    bgcolor: statusColor
                  }
                }}
              />
            )}
          </Box>
        )}

        {/* Expertise Tags */}
        {!compact && agentCard.expertise && agentCard.expertise.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ mb: 1, display: 'block' }}>
              {intl.formatMessage({ id: 'agent.expertise' })}:
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {agentCard.expertise.slice(0, 4).map((skill, index) => (
                <Chip
                  key={index}
                  label={skill.replace(/_/g, ' ')}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: '0.7rem',
                    height: 24,
                    textTransform: 'capitalize',
                    borderColor: alpha(statusColor, 0.3),
                    color: statusColor
                  }}
                />
              ))}
              {agentCard.expertise.length > 4 && (
                <Chip
                  label={`+${agentCard.expertise.length - 4}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: '0.7rem',
                    height: 24,
                    borderColor: alpha(theme.palette.grey[500], 0.3),
                    color: theme.palette.grey[500]
                  }}
                />
              )}
            </Stack>
          </Box>
        )}

        {/* Capabilities */}
        {!compact && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {agentCard.capabilities.toolCalling && (
              <Tooltip title={intl.formatMessage({ id: 'agent.capabilities.toolCalling' })}>
                <Chip
                  icon={<Build />}
                  label="Tools"
                  size="small"
                  variant="filled"
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    fontSize: '0.7rem'
                  }}
                />
              </Tooltip>
            )}
            
            {agentCard.capabilities.knowledgeBase && (
              <Tooltip title={intl.formatMessage({ id: 'agent.capabilities.knowledgeBase' })}>
                <Chip
                  icon={<Storage />}
                  label="KB"
                  size="small"
                  variant="filled"
                  sx={{
                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                    color: theme.palette.secondary.main,
                    fontSize: '0.7rem'
                  }}
                />
              </Tooltip>
            )}

            {agentCard.capabilities.streaming && (
              <Tooltip title={intl.formatMessage({ id: 'agent.capabilities.streaming' })}>
                <Chip
                  label="Stream"
                  size="small"
                  variant="filled"
                  sx={{
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: theme.palette.info.main,
                    fontSize: '0.7rem'
                  }}
                />
              </Tooltip>
            )}
          </Stack>
        )}
      </CardContent>

      {/* Actions */}
      {showActions && !compact && (
        <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            {agentCard.skills.length} {intl.formatMessage({ id: 'agent.skills' })}
          </Typography>
          
          <Stack direction="row" spacing={1}>
            {agentCard.status === 'busy' && (
              <Tooltip title={intl.formatMessage({ id: 'agent.actions.pause' })}>
                <IconButton
                  size="small"
                  onClick={(e) => handleActionClick('pause', e)}
                >
                  <Pause />
                </IconButton>
              </Tooltip>
            )}
            
            {agentCard.status === 'idle' && (
              <Tooltip title={intl.formatMessage({ id: 'agent.actions.start' })}>
                <IconButton
                  size="small"
                  onClick={(e) => handleActionClick('start', e)}
                >
                  <PlayArrow />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </CardActions>
      )}
    </Card>
  );
};

export default AgentCard; 