import { Typography, Box, Button, CircularProgress } from "@mui/material";
import SettingsSection from "@/renderer/components/Settings/SettingsSection";
import { useEffect } from "react";
import { useIntl } from "react-intl";
import { useUserTokenStore } from "@/renderer/stores/User/UserToken";

function UserAPIKeys() {
  const intl = useIntl();
  const {
    // Google Calendar
    googleCalendarConnected,
    googleCalendarUser,
    googleCalendarConnecting,
    googleCalendarError,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    initializeGoogleCalendarListeners,
    // Microsoft Calendar
    microsoftCalendarConnected,
    microsoftCalendarUser,
    microsoftCalendarConnecting,
    microsoftCalendarError,
    connectMicrosoftCalendar,
    disconnectMicrosoftCalendar,
    initializeMicrosoftCalendarListeners
  } = useUserTokenStore();

  // Initialize listeners
  useEffect(() => {
    const googleCleanup = initializeGoogleCalendarListeners();
    const microsoftCleanup = initializeMicrosoftCalendarListeners();

    return () => {
      googleCleanup();
      microsoftCleanup();
    };
  }, [initializeGoogleCalendarListeners, initializeMicrosoftCalendarListeners]);

  return (
    <>
      {/* Google Calendar Section */}
      <SettingsSection title={intl.formatMessage({ id: "googleCalendar.title" })} sx={{ mb: 3 }}>
        <Box sx={{ py: 2 }}>
          {googleCalendarError && (
            <Typography variant="body2" color="error" sx={{ mb: 2 }}>
              {intl.formatMessage({ id: "googleCalendar.error" }, { error: googleCalendarError })}
            </Typography>
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
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1 }}>
                {intl.formatMessage({ id: "googleCalendar.connected" })}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {googleCalendarUser?.email}
              </Typography>

              <Button
                variant="outlined"
                color="error"
                onClick={disconnectGoogleCalendar}
              >
                {intl.formatMessage({ id: "googleCalendar.disconnect" })}
              </Button>
            </>
          )}
        </Box>
      </SettingsSection>

      {/* Microsoft Calendar Section */}
      <SettingsSection title={intl.formatMessage({ id: "microsoftCalendar.title" })} sx={{ mb: 3 }}>
        <Box sx={{ py: 2 }}>
          {microsoftCalendarError && (
            <Typography variant="body2" color="error" sx={{ mb: 2 }}>
              {intl.formatMessage({ id: "microsoftCalendar.error" }, { error: microsoftCalendarError })}
            </Typography>
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
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1 }}>
                {intl.formatMessage({ id: "microsoftCalendar.connected" })}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {microsoftCalendarUser?.email}
              </Typography>

              <Button
                variant="outlined"
                color="error"
                onClick={disconnectMicrosoftCalendar}
              >
                {intl.formatMessage({ id: "microsoftCalendar.disconnect" })}
              </Button>
            </>
          )}
        </Box>
      </SettingsSection>
    </>
  );
}

export default UserAPIKeys;
