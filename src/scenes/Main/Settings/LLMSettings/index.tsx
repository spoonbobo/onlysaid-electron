import { Typography, Box, Slider } from "@mui/material";
import SettingsSection from "../../../../components/Settings/SettingsSection";
import SettingsFormField from "../../../../components/Settings/SettingsFormField";
import SettingsActionBar from "../../../../components/Settings/SettingsActionBar";
import { Button } from "@mui/material";
import { useLLMConfigurationStore } from "../../../../stores/LLM/LLMConfiguration";
import { LLMService, LLMModel } from "../../../../service/llm";
import { useEffect, useState } from "react";

function LLMSettings() {
  const { temperature, setTemperature, resetToDefaults } = useLLMConfigurationStore();
  const [llms, setLlms] = useState<LLMModel[]>([]);

  const handleTemperatureChange = (event: Event, newValue: number) => {
    setTemperature(newValue);
  };

  useEffect(() => {
    const llmService = new LLMService();
    llmService.GetEnabledLLM()
      .then(enabledLLMs => {
        setLlms(enabledLLMs);
        console.log(enabledLLMs);
      })
      .catch(error => {
        console.error("Failed to load LLMs:", error);
      });
  }, []);

  return (
    <>
      <SettingsSection title="General LLM Settings" sx={{ mb: 3 }}>
        <SettingsFormField label="Temperature">
          <Box sx={{ width: "100%", display: "flex", alignItems: "center" }}>
            <Slider
              value={temperature}
              onChange={handleTemperatureChange}
              min={0}
              max={2}
              step={0.1}
              valueLabelDisplay="auto"
              sx={{ mr: 2, flex: 1 }}
            />
            <Typography variant="body2" sx={{ minWidth: 50 }}>
              {temperature.toFixed(1)}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Higher values produce more creative responses, lower values more deterministic results.
          </Typography>
        </SettingsFormField>
      </SettingsSection>

      <SettingsActionBar>
        <Button variant="contained">Save</Button>
        <Button variant="outlined" onClick={resetToDefaults} sx={{ ml: 2 }}>
          Reset to Defaults
        </Button>
      </SettingsActionBar>
    </>
  );
}

export default LLMSettings;
