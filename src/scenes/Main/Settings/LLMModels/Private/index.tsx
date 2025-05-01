import { FormControlLabel, Switch } from "@mui/material";
import SettingsSection from "../../../../../components/Settings/SettingsSection";
import SettingsFormField from "../../../../../components/Settings/SettingsFormField";
import SettingsActionBar from "../../../../../components/Settings/SettingsActionBar";
import { Button } from "@mui/material";
import { useLLMConfigurationStore } from "../../../../../stores/LLM/LLMConfiguration";
import { LLMService } from "../../../../../service/llm";
import { useMemo } from "react";
import TextFieldWithOptions from "../../../../../components/Text/TextFieldWithOptions";

function PrivateLLMConfiguration() {
  const {
    ollamaBaseURL,
    ollamaModel,
    ollamaEnabled,
    setOllamaBaseURL,
    setOllamaModel,
    setOllamaEnabled
  } = useLLMConfigurationStore();

  const llmService = useMemo(() => new LLMService(), []);

  const handleSave = async () => {
    await llmService.UpdateConfiguration({
      ollamaBaseURL,
      ollamaModel,
      ollamaEnabled: ollamaEnabled && !!ollamaBaseURL && !!ollamaModel
    });
  };

  return (
    <>
      <SettingsSection title="Ollama Configuration" sx={{ mb: 3 }}>
        <SettingsFormField label="Ollama Base URL">
          <TextFieldWithOptions
            fullWidth
            size="small"
            value={ollamaBaseURL}
            onChange={(e) => setOllamaBaseURL(e.target.value)}
            onClear={() => setOllamaBaseURL("")}
            placeholder="Enter your Ollama Base URL"
          />
        </SettingsFormField>
        <SettingsFormField label="Model">
          <TextFieldWithOptions
            fullWidth
            size="small"
            value={ollamaModel}
            onChange={(e) => setOllamaModel(e.target.value)}
            onClear={() => setOllamaModel("")}
            placeholder="Enter your Ollama Model"
          />
        </SettingsFormField>
        <FormControlLabel
          control={
            <Switch
              checked={ollamaEnabled}
              onChange={(e) => setOllamaEnabled(e.target.checked)}
              disabled={!ollamaBaseURL || !ollamaModel}
            />
          }
          label="Enable Ollama models"
          sx={{ mt: 1 }}
        />
      </SettingsSection>

      <SettingsActionBar>
        <Button variant="contained" onClick={handleSave}>Save</Button>
      </SettingsActionBar>
    </>
  );
}

export default PrivateLLMConfiguration;
