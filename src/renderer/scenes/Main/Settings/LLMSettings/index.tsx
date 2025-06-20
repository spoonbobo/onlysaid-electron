import { Typography, Box, Slider, Button, TextField, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import SettingsSection from "@/renderer/components/Settings/SettingsSection";
import SettingsFormField from "@/renderer/components/Settings/SettingsFormField";
import SettingsActionBar from "@/renderer/components/Settings/SettingsActionBar";
import RulesManagement from "@/renderer/components/Settings/RulesManagement";
import { useLLMConfigurationStore } from "@/renderer/stores/LLM/LLMConfiguration";
import { LLMService, LLMModel } from "@/service/ai";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import TextFieldWithOptions from "@/renderer/components/Text/TextFieldWithOptions";
import { toast } from "@/utils/toast";

function LLMSettings() {
  const intl = useIntl();
  const {
    temperature,
    setTemperature,
    askModeSystemPrompt,
    queryModeSystemPrompt,
    agentModeSystemPrompt,
    setAskModeSystemPrompt,
    setQueryModeSystemPrompt,
    setAgentModeSystemPrompt,
    resetToDefaults,
    ollamaBaseURL,
    setOllamaBaseURL,
    ollamaVerified,
    setOllamaVerified
  } = useLLMConfigurationStore();

  const [llms, setLlms] = useState<LLMModel[]>([]);
  const [verifyingOllama, setVerifyingOllama] = useState(false);

  const handleTemperatureChange = (event: Event, newValue: number) => {
    setTemperature(newValue);
  };

  const handleOllamaBaseURLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOllamaBaseURL(e.target.value);
  };

  const handleClearOllama = () => {
    setOllamaBaseURL("");
  };

  const handleVerifyOllama = async () => {
    try {
      setVerifyingOllama(true);
      const llmService = new LLMService();
      const isVerified = await llmService.VerifyLLM("ollama", ollamaBaseURL);

      if (isVerified) {
        toast.success(intl.formatMessage({ id: "settings.llmSettings.ollamaVerified" }));
      } else {
        toast.error(intl.formatMessage({ id: "settings.llmSettings.ollamaVerificationFailed" }));
      }
    } catch (error) {
      console.error("Error verifying Ollama connection:", error);
      toast.error(intl.formatMessage({ id: "settings.llmSettings.ollamaVerificationError" }));
    } finally {
      setVerifyingOllama(false);
    }
  };

  const handleSave = async () => {
    try {
      const llmService = new LLMService();
      await llmService.UpdateConfiguration({
        temperature,
        askModeSystemPrompt,
        queryModeSystemPrompt,
        agentModeSystemPrompt,
        ollamaBaseURL
      });
      toast.success(intl.formatMessage({ id: "settings.saveSuccess" }));
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(intl.formatMessage({ id: "settings.saveError" }));
    }
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
      <SettingsSection title={intl.formatMessage({ id: "settings.llmSettings.general" })} sx={{ mb: 3 }}>
        <SettingsFormField label={intl.formatMessage({ id: "settings.temperature" })}>
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
            {intl.formatMessage({ id: "settings.temperatureDescription" })}
          </Typography>
        </SettingsFormField>
      </SettingsSection>

      <SettingsSection title={intl.formatMessage({ id: "settings.llmSettings.rules" })} sx={{ mb: 3 }}>
        <RulesManagement />
      </SettingsSection>

      <SettingsSection title={intl.formatMessage({ id: "settings.llmSettings.systemPrompts" })} sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {intl.formatMessage({ id: "settings.llmSettings.systemPromptsDescription" })}
        </Typography>

        <SettingsFormField label={intl.formatMessage({ id: "settings.llmSettings.askModePrompt" })}>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={askModeSystemPrompt}
            onChange={(e) => setAskModeSystemPrompt(e.target.value)}
            placeholder={intl.formatMessage({ id: "settings.llmSettings.askModePromptPlaceholder" })}
            variant="outlined"
            size="small"
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {intl.formatMessage({ id: "settings.llmSettings.askModePromptDescription" })}
          </Typography>
        </SettingsFormField>

        <SettingsFormField label={intl.formatMessage({ id: "settings.llmSettings.queryModePrompt" })}>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={queryModeSystemPrompt}
            onChange={(e) => setQueryModeSystemPrompt(e.target.value)}
            placeholder={intl.formatMessage({ id: "settings.llmSettings.queryModePromptPlaceholder" })}
            variant="outlined"
            size="small"
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {intl.formatMessage({ id: "settings.llmSettings.queryModePromptDescription" })}
          </Typography>
        </SettingsFormField>

        <SettingsFormField label={intl.formatMessage({ id: "settings.llmSettings.agentModePrompt" })}>
          <TextField
            fullWidth
            multiline
            rows={6}
            value={agentModeSystemPrompt}
            onChange={(e) => setAgentModeSystemPrompt(e.target.value)}
            placeholder={intl.formatMessage({ id: "settings.llmSettings.agentModePromptPlaceholder" })}
            variant="outlined"
            size="small"
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {intl.formatMessage({ id: "settings.llmSettings.agentModePromptDescription" })}
          </Typography>
        </SettingsFormField>
      </SettingsSection>

      <SettingsSection title={intl.formatMessage({ id: "settings.llmSettings.ollamaConfig" })} sx={{ mb: 3 }}>
        <SettingsFormField label={intl.formatMessage({ id: "settings.llmModels.private.ollamaBaseURL" })}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextFieldWithOptions
              fullWidth
              size="small"
              value={ollamaBaseURL}
              onChange={handleOllamaBaseURLChange}
              onClear={handleClearOllama}
              placeholder={intl.formatMessage({ id: "settings.llmModels.private.ollamaBaseURLPlaceholder" })}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleVerifyOllama}
              disabled={!ollamaBaseURL || verifyingOllama}
              color={ollamaVerified ? "success" : "primary"}
              sx={{ whiteSpace: 'nowrap', width: '90px' }}
            >
              {verifyingOllama
                ? intl.formatMessage({ id: "settings.llmModels.public.verifying" })
                : ollamaVerified
                  ? intl.formatMessage({ id: "settings.llmModels.public.verified" })
                  : intl.formatMessage({ id: "settings.llmModels.public.verify" })
              }
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {intl.formatMessage({ id: "settings.llmSettings.ollamaBaseURLDescription" })}
          </Typography>
        </SettingsFormField>
      </SettingsSection>

      <SettingsActionBar>
        <Button variant="contained" onClick={handleSave}>
          {intl.formatMessage({ id: "settings.savePreferences" })}
        </Button>
        <Button variant="outlined" onClick={resetToDefaults} sx={{ ml: 2 }}>
          {intl.formatMessage({ id: "settings.resetToDefaults" })}
        </Button>
      </SettingsActionBar>
    </>
  );
}

export default LLMSettings;
