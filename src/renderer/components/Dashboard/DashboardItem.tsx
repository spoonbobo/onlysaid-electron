import { Box, Card, CardContent, Typography, Avatar, Chip, IconButton, CircularProgress } from '@mui/material';
import { useIntl } from 'react-intl';

interface DashboardItemProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  value?: string | number;
  badge?: number;
  action?: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'stat' | 'activity' | 'quick-action';
  fullWidth?: boolean;
  height?: number | string;
  isLoading?: boolean;
}

const DashboardItem = ({
  title,
  subtitle,
  icon,
  value,
  badge,
  action,
  onClick,
  variant = 'default',
  fullWidth = true,
  height = 'auto',
  isLoading = false
}: DashboardItemProps) => {
  const intl = useIntl();

  // Loading overlay that maintains original content dimensions
  const LoadingOverlay = () => (
    <Box sx={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      zIndex: 1
    }}>
      <CircularProgress size={20} sx={{ mb: 1 }} />
      <Typography variant="caption" color="text.secondary">
        {intl.formatMessage({ id: 'dashboard.loading', defaultMessage: 'Loading...' })}
      </Typography>
    </Box>
  );

  const getCardContent = () => {
    switch (variant) {
      case 'stat':
        return (
          <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" fontWeight="bold" color="primary.main">
                  {value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {title}
                </Typography>
              </Box>
              {icon && (
                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                  {icon}
                </Avatar>
              )}
            </Box>
            {isLoading && <LoadingOverlay />}
          </CardContent>
        );

      case 'activity':
        return (
          <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" fontWeight="medium" sx={{ flexGrow: 1 }}>
                {title}
              </Typography>
              {badge && badge > 0 && (
                <Chip label={badge} color="error" size="small" />
              )}
            </Box>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                {subtitle}
              </Typography>
            )}
            {isLoading && <LoadingOverlay />}
          </CardContent>
        );

      case 'quick-action':
        return (
          <CardContent sx={{ p: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
            {icon && (
              <Avatar sx={{ bgcolor: 'background.default', color: 'primary.main', mx: 'auto', mb: 2 }}>
                {icon}
              </Avatar>
            )}
            <Typography variant="h6" fontWeight="medium" mb={1}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
            {isLoading && <LoadingOverlay />}
          </CardContent>
        );

      default:
        return (
          <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, flex: 1 }}>
              {icon && (
                <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', mr: 2, width: 32, height: 32 }}>
                  {icon}
                </Avatar>
              )}
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight="medium" noWrap>
                  {title}
                </Typography>
                {subtitle && (
                  <Typography variant="body2" color="text.secondary" sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.2,
                    mt: 0.5
                  }}>
                    {subtitle}
                  </Typography>
                )}
              </Box>
              {action && (
                <Box sx={{ ml: 1, flexShrink: 0 }}>
                  {action}
                </Box>
              )}
            </Box>
            {isLoading && <LoadingOverlay />}
          </CardContent>
        );
    }
  };

  return (
    <Card
      sx={{
        cursor: onClick && !isLoading ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        width: fullWidth ? '100%' : 'auto',
        height: height,
        display: 'flex',
        flexDirection: 'column',
        '&:hover': onClick && !isLoading ? {
          transform: 'translateY(-2px)',
          boxShadow: 2
        } : {}
      }}
      onClick={isLoading ? undefined : onClick}
    >
      {getCardContent()}
    </Card>
  );
};

export default DashboardItem;
