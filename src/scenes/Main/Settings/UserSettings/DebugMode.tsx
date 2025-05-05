import { Typography, Switch, FormControlLabel } from "@mui/material";
import { useUserSettingsStore } from "@/stores/User/UserSettings";
import SettingsSection from "@/components/Settings/SettingsSection";
import { FormattedMessage } from "react-intl";

export default function DebugMode() {
  const { debugMode, setDebugMode } = useUserSettingsStore();

  return (
    <SettingsSection title={<FormattedMessage id="settings.debugMode" />}>
      <FormControlLabel
        control={
          <Switch
            checked={debugMode}
            onChange={(e) => setDebugMode(e.target.checked)}
            color="primary"
          />
        }
        label={<FormattedMessage id="settings.debugMode" />}
      />

      <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
        {<FormattedMessage id="settings.debugModeDescription" />}
      </Typography>
    </SettingsSection>
  );
}
