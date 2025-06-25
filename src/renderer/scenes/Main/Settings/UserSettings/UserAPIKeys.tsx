import { Typography, Box, Button, CircularProgress, Alert, Chip } from "@mui/material";
import SettingsSection from "@/renderer/components/Settings/SettingsSection";
import SettingsFormField from "@/renderer/components/Settings/SettingsFormField";
import TextFieldWithOptions from "@/renderer/components/Text/TextFieldWithOptions";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useUserTokenStore } from "@/renderer/stores/User/UserToken";

function UserAPIKeys() {
  const intl = useIntl();
  const [validatingGoogle, setValidatingGoogle] = useState(false);
  const [validatingMicrosoft, setValidatingMicrosoft] = useState(false);
  const [validatingN8n, setValidatingN8n] = useState(false);
  const [testingN8n, setTestingN8n] = useState(false);

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
    // N8n
    n8nApiUrl,
    n8nApiKey,
    n8nConnected,
    n8nConnecting,
    n8nError,
    n8nVerified,
    lastN8nHealthCheck,
    setN8nApiUrl,
    setN8nApiKey,
    connectN8n,
    disconnectN8n,
    testN8nConnection,
    validateN8nConnection,
    initializeN8nListeners,
    // Health checks
    performHealthCheck,
    startPeriodicHealthCheck,
  } = useUserTokenStore();

  // Initialize listeners
  useEffect(() => {
    const googleCleanup = initializeGoogleCalendarListeners();
    const microsoftCleanup = initializeMicrosoftCalendarListeners();
    const n8nCleanup = initializeN8nListeners();
    const healthCheckCleanup = startPeriodicHealthCheck();

    performHealthCheck();

    return () => {
      googleCleanup();
      microsoftCleanup();
      n8nCleanup();
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

  const handleTestN8n = async () => {
    setTestingN8n(true);
    await testN8nConnection();
    setTestingN8n(false);
  };

  const handleValidateN8n = async () => {
    setValidatingN8n(true);
    await validateN8nConnection();
    setValidatingN8n(false);
  };

  const handleN8nConnect = async () => {
    if (!n8nApiUrl || !n8nApiKey || !n8nVerified) return;
    await connectN8n();
  };

  const handleN8nApiUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setN8nApiUrl(e.target.value);
  };

  const handleN8nApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setN8nApiKey(e.target.value);
  };

  const handleClearN8nApiUrl = () => {
    setN8nApiUrl("");
  };

  const handleClearN8nApiKey = () => {
    setN8nApiKey("");
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

      {/* N8n Section */}
      <SettingsSection title={intl.formatMessage({ id: "n8n.title" })} sx={{ mb: 3 }}>
        <Box sx={{ py: 2 }}>
          {n8nError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {intl.formatMessage({ id: "n8n.error" }, { error: n8nError })}
            </Alert>
          )}

          {!n8nConnected ? (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {intl.formatMessage({ id: "n8n.description" })}
              </Typography>
              
              <SettingsFormField label={intl.formatMessage({ id: "n8n.apiUrl" })}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextFieldWithOptions
                    fullWidth
                    size="small"
                    value={n8nApiUrl}
                    onChange={handleN8nApiUrlChange}
                    onClear={handleClearN8nApiUrl}
                    placeholder={intl.formatMessage({ id: "n8n.apiUrlPlaceholder" })}
                    error={!n8nVerified && !!n8nApiUrl && !!n8nApiKey}
                  />
                </Box>
              </SettingsFormField>

              <SettingsFormField label={intl.formatMessage({ id: "n8n.apiKey" })}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextFieldWithOptions
                    fullWidth
                    size="small"
                    value={n8nApiKey}
                    onChange={handleN8nApiKeyChange}
                    onClear={handleClearN8nApiKey}
                    placeholder={intl.formatMessage({ id: "n8n.apiKeyPlaceholder" })}
                    isPassword
                    error={!n8nVerified && !!n8nApiUrl && !!n8nApiKey}
                    helperText={!n8nVerified && !!n8nApiUrl && !!n8nApiKey ? intl.formatMessage({ id: "n8n.requiresVerification" }) : ""}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleTestN8n}
                    disabled={!n8nApiUrl || !n8nApiKey || testingN8n}
                    color={n8nVerified ? "success" : "primary"}
                    sx={{ whiteSpace: 'nowrap', width: '90px' }}
                  >
                    {testingN8n ? intl.formatMessage({ id: "n8n.testing" }) : n8nVerified ? intl.formatMessage({ id: "n8n.verified" }) : intl.formatMessage({ id: "n8n.test" })}
                  </Button>
                </Box>
              </SettingsFormField>

              <Button
                variant="contained"
                onClick={handleN8nConnect}
                disabled={n8nConnecting || !n8nApiUrl || !n8nApiKey || !n8nVerified}
                startIcon={n8nConnecting ? <CircularProgress size={16} /> : null}
                sx={{ bgcolor: '#ea4b71', '&:hover': { bgcolor: '#d63384' } }}
              >
                {n8nConnecting
                  ? intl.formatMessage({ id: "n8n.connecting" })
                  : intl.formatMessage({ id: "n8n.connect" })
                }
              </Button>

              {!n8nVerified && n8nApiUrl && n8nApiKey && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  {intl.formatMessage({ id: "n8n.testConnectionFirst" })}
                </Typography>
              )}
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                  {intl.formatMessage({ id: "n8n.connected" })}
                </Typography>
                <HealthChip status={getHealthStatus(lastN8nHealthCheck)} />
              </Box>

              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>API URL:</strong> {n8nApiUrl}
              </Typography>

              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>API Key:</strong> ••••••••{n8nApiKey.slice(-4)}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  onClick={handleValidateN8n}
                  disabled={validatingN8n}
                  startIcon={validatingN8n ? <CircularProgress size={16} /> : null}
                  size="small"
                >
                  {validatingN8n ? 'Validating...' : 'Validate Connection'}
                </Button>

                <Button
                  variant="outlined"
                  color="error"
                  onClick={disconnectN8n}
                  size="small"
                >
                  {intl.formatMessage({ id: "n8n.disconnect" })}
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
