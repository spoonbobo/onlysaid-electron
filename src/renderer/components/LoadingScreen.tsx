import { Box, Avatar, Typography, CircularProgress, Fade, LinearProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { useAppAssets } from '@/renderer/hooks/useAppAssets';
import { useTheme } from '@mui/material/styles';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
  minLoadingTime?: number;
  showProgress?: boolean;
}

const LoadingScreen = ({ onLoadingComplete, minLoadingTime = 1200, showProgress = true }: LoadingScreenProps) => {
  const theme = useTheme();
  const { getAsset } = useAppAssets();
  const [appIcon, setAppIcon] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [startTime] = useState(Date.now());
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const initializationSteps = [
    'Initializing application...',
    'Loading essential assets...',
    'Setting up authentication...',
    'Configuring services...',
    'Establishing connections...',
    'Finalizing setup...',
    'Ready to launch!'
  ];

  // Load app icon
  useEffect(() => {
    const loadIcon = async () => {
      try {
        const iconUrl = await getAsset('icon.png');
        if (iconUrl) {
          setAppIcon(iconUrl);
        }
      } catch (error) {
        console.warn('Failed to load app icon in loading screen:', error);
      }
    };
    
    loadIcon();
  }, [getAsset]);

  // Simulate initialization progress
  useEffect(() => {
    if (!showProgress) return;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + Math.random() * 15;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return newProgress;
      });
    }, 200);

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < initializationSteps.length - 1) {
          return prev + 1;
        }
        clearInterval(stepInterval);
        return prev;
      });
    }, 300);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, [showProgress, initializationSteps.length]);

  // Handle loading completion
  useEffect(() => {
    const handleLoadingComplete = () => {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(onLoadingComplete, 300); // Wait for fade-out
      }, remainingTime);
    };

    // Wait for progress to complete or minimum time
    const timer = setTimeout(() => {
      if (progress >= 100 || !showProgress) {
        handleLoadingComplete();
      }
    }, minLoadingTime);
    
    return () => clearTimeout(timer);
  }, [startTime, minLoadingTime, onLoadingComplete, progress, showProgress]);

  if (!isVisible) return null;

  return (
    <Fade in={isVisible} timeout={300}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        {/* Development indicator */}
        {window.APP_ENV?.isDevelopment && (
          <Box
            sx={{
              position: 'fixed',
              top: 8,
              right: 8,
              bgcolor: 'error.main',
              color: 'error.contrastText',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              typography: 'caption',
              fontWeight: 600,
              fontSize: '0.7rem',
              zIndex: 10001,
            }}
          >
            DEV MODE
          </Box>
        )}

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 400,
            textAlign: 'center',
            width: '100%',
            px: 3,
          }}
        >
          {/* Logo */}
          <Box
            sx={{
              mb: 3,
              p: 2,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: theme.shadows[3],
              border: `1px solid ${theme.palette.divider}`,
              transition: 'transform 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
              },
            }}
          >
            {appIcon ? (
              <Avatar
                src={appIcon}
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: 'transparent',
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'primary.main',
                }}
              >
                <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
                  <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 25c-6.065 0-11-4.935-11-11S9.935 5 16 5s11 4.935 11 11-4.935 11-11 11z"/>
                  <path d="M16 8c-1.104 0-2 .896-2 2s.896 2 2 2 2-.896 2-2-.896-2-2-2zm-2 6v8h4v-8h-4z"/>
                </svg>
              </Box>
            )}
          </Box>

          {/* App Title */}
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 600,
              mb: 1,
              color: 'text.primary',
              letterSpacing: '-0.025em',
            }}
          >
            Onlysaid
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              mb: 3,
              fontWeight: 400,
            }}
          >
            {showProgress ? initializationSteps[currentStep] : 'Loading your AI assistant...'}
          </Typography>

          {/* Progress indicators */}
          {showProgress ? (
            <Box sx={{ width: '100%', mb: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ 
                  height: 6, 
                  borderRadius: 3,
                  mb: 1,
                  bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                  }
                }} 
              />
              <Typography variant="caption" color="text.secondary">
                {Math.round(progress)}% complete
              </Typography>
            </Box>
          ) : (
            <CircularProgress
              size={40}
              thickness={4}
              sx={{
                color: 'primary.main',
                mb: 2,
              }}
            />
          )}
        </Box>
      </Box>
    </Fade>
  );
};

export default LoadingScreen; 