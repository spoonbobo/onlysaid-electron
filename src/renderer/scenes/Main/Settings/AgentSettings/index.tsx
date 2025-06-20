import { Typography, Box, Button, TextField } from "@mui/material";
import SettingsSection from "@/renderer/components/Settings/SettingsSection";
import SettingsFormField from "@/renderer/components/Settings/SettingsFormField";
import SettingsActionBar from "@/renderer/components/Settings/SettingsActionBar";
import { useAgentSettingsStore, SwarmLimits } from "@/renderer/stores/Agent/AgentSettingStore";
import { useIntl } from "react-intl";
import { toast } from "@/utils/toast";

function AgentSettings() {
  const intl = useIntl();
  const {
    swarmLimits,
    updateSwarmLimit,
    resetSwarmLimitsToDefaults,
  } = useAgentSettingsStore();

  const handleTextFieldChange = (key: keyof SwarmLimits) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value > 0) {
      updateSwarmLimit(key, value);
    }
  };

  const handleSave = () => {
    toast.success(intl.formatMessage({ id: "settings.saveSuccess" }));
  };

  const handleReset = () => {
    resetSwarmLimitsToDefaults();
    toast.success(intl.formatMessage({ id: "settings.resetSuccess" }));
  };

  return (
    <>
      <SettingsSection title={intl.formatMessage({ id: "settings.agentSettings.swarmLimits" })} sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {intl.formatMessage({ id: "settings.agentSettings.swarmLimitsDescription" })}
        </Typography>

        <SettingsFormField label={intl.formatMessage({ id: "settings.agentSettings.maxIterations" })}>
          <TextField
            type="number"
            value={swarmLimits.maxIterations}
            onChange={handleTextFieldChange('maxIterations')}
            size="small"
            sx={{ width: 120 }}
            inputProps={{ min: 1, max: 50 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {intl.formatMessage({ id: "settings.agentSettings.maxIterationsDescription" })}
          </Typography>
        </SettingsFormField>

        <SettingsFormField label={intl.formatMessage({ id: "settings.agentSettings.maxParallelAgents" })}>
          <TextField
            type="number"
            value={swarmLimits.maxParallelAgents}
            onChange={handleTextFieldChange('maxParallelAgents')}
            size="small"
            sx={{ width: 120 }}
            inputProps={{ min: 1, max: 20 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {intl.formatMessage({ id: "settings.agentSettings.maxParallelAgentsDescription" })}
          </Typography>
        </SettingsFormField>

        <SettingsFormField label={intl.formatMessage({ id: "settings.agentSettings.maxSwarmSize" })}>
          <TextField
            type="number"
            value={swarmLimits.maxSwarmSize}
            onChange={handleTextFieldChange('maxSwarmSize')}
            size="small"
            sx={{ width: 120 }}
            inputProps={{ min: 1, max: 10 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {intl.formatMessage({ id: "settings.agentSettings.maxSwarmSizeDescription" })}
          </Typography>
        </SettingsFormField>

        <SettingsFormField label={intl.formatMessage({ id: "settings.agentSettings.maxActiveSwarms" })}>
          <TextField
            type="number"
            value={swarmLimits.maxActiveSwarms}
            onChange={handleTextFieldChange('maxActiveSwarms')}
            size="small"
            sx={{ width: 120 }}
            inputProps={{ min: 1, max: 5 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {intl.formatMessage({ id: "settings.agentSettings.maxActiveSwarmsDescription" })}
          </Typography>
        </SettingsFormField>

        <SettingsFormField label={intl.formatMessage({ id: "settings.agentSettings.maxConversationLength" })}>
          <TextField
            type="number"
            value={swarmLimits.maxConversationLength}
            onChange={handleTextFieldChange('maxConversationLength')}
            size="small"
            sx={{ width: 120 }}
            inputProps={{ min: 10, max: 200 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {intl.formatMessage({ id: "settings.agentSettings.maxConversationLengthDescription" })}
          </Typography>
        </SettingsFormField>
      </SettingsSection>

      <SettingsActionBar>
        <Button variant="contained" onClick={handleSave}>
          {intl.formatMessage({ id: "settings.savePreferences" })}
        </Button>
        <Button variant="outlined" onClick={handleReset} sx={{ ml: 2 }}>
          {intl.formatMessage({ id: "settings.resetToDefaults" })}
        </Button>
      </SettingsActionBar>
    </>
  );
}

export default AgentSettings;
