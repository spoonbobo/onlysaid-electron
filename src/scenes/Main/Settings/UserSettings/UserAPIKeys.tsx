import { Typography, Box, Button, CircularProgress } from "@mui/material";
import SettingsSection from "@/components/Settings/SettingsSection";
import { useEffect } from "react";
import { useIntl } from "react-intl";
import { useUserTokenStore } from "@/stores/User/UserToken";

function UserAPIKeys() {
  const intl = useIntl();
  const {
    googleCalendarConnected,
    googleCalendarUser,
    googleCalendarConnecting,
    googleCalendarError,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    initializeGoogleCalendarListeners
  } = useUserTokenStore();

  // Initialize listeners
  useEffect(() => {
    const cleanup = initializeGoogleCalendarListeners();
    return cleanup;
  }, [initializeGoogleCalendarListeners]);

  return (
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
  );
}

export default UserAPIKeys;
