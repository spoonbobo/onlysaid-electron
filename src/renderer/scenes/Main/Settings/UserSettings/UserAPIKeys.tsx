import { Typography, Box, Button, CircularProgress, Alert, Chip } from "@mui/material";
import SettingsSection from "@/renderer/components/Settings/SettingsSection";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useUserTokenStore } from "@/renderer/stores/User/UserToken";

function UserAPIKeys() {
  const intl = useIntl();
  const [validatingGoogle, setValidatingGoogle] = useState(false);
  const [validatingMicrosoft, setValidatingMicrosoft] = useState(false);

  const {
    // Google Calendar
    googleCalendarConnected,
    googleCalendarUser,
    googleCalendarConnecting,
    googleCalendarError,
    lastGoogleHealthCheck,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    validateGoogleToken,
    initializeGoogleCalendarListeners,
    // Microsoft Calendar
    microsoftCalendarConnected,
    microsoftCalendarUser,
    microsoftCalendarConnecting,
    microsoftCalendarError,
    lastMicrosoftHealthCheck,
    connectMicrosoftCalendar,
    disconnectMicrosoftCalendar,
    validateMicrosoftToken,
    initializeMicrosoftCalendarListeners,
    // Health checks
    performHealthCheck,
    startPeriodicHealthCheck
  } = useUserTokenStore();

  // Initialize listeners and health checks
  useEffect(() => {
    const googleCleanup = initializeGoogleCalendarListeners();
    const microsoftCleanup = initializeMicrosoftCalendarListeners();
    const healthCheckCleanup = startPeriodicHealthCheck();

    // Perform initial health check when component mounts
    performHealthCheck();

    return () => {
      googleCleanup();
      microsoftCleanup();
      healthCheckCleanup();
    };
  }, []);

  const handleValidateGoogle = async () => {
    setValidatingGoogle(true);
    await validateGoogleToken();
    setValidatingGoogle(false);
  };

  const handleValidateMicrosoft = async () => {
    setValidatingMicrosoft(true);
    await validateMicrosoftToken();
    setValidatingMicrosoft(false);
  };

  const getHealthStatus = (lastCheck: number | null) => {
    if (!lastCheck) return 'unknown';
    const timeSince = Date.now() - lastCheck;
    if (timeSince < 5 * 60 * 1000) return 'healthy'; // Less than 5 minutes
    if (timeSince < 30 * 60 * 1000) return 'warning'; // Less than 30 minutes
    return 'stale';
  };

  const HealthChip = ({ status }: { status: 'healthy' | 'warning' | 'stale' | 'unknown' }) => {
    const colors = {
      healthy: 'success',
      warning: 'warning',
      stale: 'error',
      unknown: 'default'
    } as const;

    const labels = {
      healthy: 'Active',
      warning: 'Check Soon',
      stale: 'Needs Refresh',
      unknown: 'Unknown'
    };

    return (
      <Chip
        label={labels[status]}
        color={colors[status]}
        size="small"
        sx={{ ml: 1 }}
      />
    );
  };

  return (
    <>
      {/* Google Calendar Section */}
      <SettingsSection title={intl.formatMessage({ id: "googleCalendar.title" })} sx={{ mb: 3 }}>
        <Box sx={{ py: 2 }}>
          {googleCalendarError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {intl.formatMessage({ id: "googleCalendar.error" }, { error: googleCalendarError })}
            </Alert>
          )}

          {!googleCalendarConnected ? (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {intl.formatMessage({ id: "googleCalendar.description" })}
              </Typography>
              <Button
                variant="contained"
                onClick={connectGoogleCalendar}
                disabled={googleCalendarConnecting}
                startIcon={googleCalendarConnecting ? <CircularProgress size={16} /> : null}
              >
                {googleCalendarConnecting
                  ? intl.formatMessage({ id: "googleCalendar.connecting" })
                  : intl.formatMessage({ id: "googleCalendar.connect" })
                }
              </Button>
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                  {intl.formatMessage({ id: "googleCalendar.connected" })}
                </Typography>
                <HealthChip status={getHealthStatus(lastGoogleHealthCheck)} />
              </Box>

              <Typography variant="body1" sx={{ mb: 2 }}>
                {googleCalendarUser?.email}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  onClick={handleValidateGoogle}
                  disabled={validatingGoogle}
                  startIcon={validatingGoogle ? <CircularProgress size={16} /> : null}
                  size="small"
                >
                  {validatingGoogle ? 'Validating...' : 'Validate Connection'}
                </Button>

                <Button
                  variant="outlined"
                  color="error"
                  onClick={disconnectGoogleCalendar}
                  size="small"
                >
                  {intl.formatMessage({ id: "googleCalendar.disconnect" })}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </SettingsSection>

      {/* Microsoft Calendar Section */}
      <SettingsSection title={intl.formatMessage({ id: "microsoftCalendar.title" })} sx={{ mb: 3 }}>
        <Box sx={{ py: 2 }}>
          {microsoftCalendarError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {intl.formatMessage({ id: "microsoftCalendar.error" }, { error: microsoftCalendarError })}
            </Alert>
          )}

          {!microsoftCalendarConnected ? (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {intl.formatMessage({ id: "microsoftCalendar.description" })}
              </Typography>
              <Button
                variant="contained"
                onClick={connectMicrosoftCalendar}
                disabled={microsoftCalendarConnecting}
                startIcon={microsoftCalendarConnecting ? <CircularProgress size={16} /> : null}
                sx={{ bgcolor: '#0078d4', '&:hover': { bgcolor: '#106ebe' } }}
              >
                {microsoftCalendarConnecting
                  ? intl.formatMessage({ id: "microsoftCalendar.connecting" })
                  : intl.formatMessage({ id: "microsoftCalendar.connect" })
                }
              </Button>
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                  {intl.formatMessage({ id: "microsoftCalendar.connected" })}
                </Typography>
                <HealthChip status={getHealthStatus(lastMicrosoftHealthCheck)} />
              </Box>

              <Typography variant="body1" sx={{ mb: 2 }}>
                {microsoftCalendarUser?.email}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  onClick={handleValidateMicrosoft}
                  disabled={validatingMicrosoft}
                  startIcon={validatingMicrosoft ? <CircularProgress size={16} /> : null}
                  size="small"
                >
                  {validatingMicrosoft ? 'Validating...' : 'Validate Connection'}
                </Button>

                <Button
                  variant="outlined"
                  color="error"
                  onClick={disconnectMicrosoftCalendar}
                  size="small"
                >
                  {intl.formatMessage({ id: "microsoftCalendar.disconnect" })}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </SettingsSection>
    </>
  );
}

export default UserAPIKeys;
