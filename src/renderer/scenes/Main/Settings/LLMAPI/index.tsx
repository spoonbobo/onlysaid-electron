import { Typography, Box, FormControlLabel, Switch, Button, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import SettingsSection from "@/renderer/components/Settings/SettingsSection";
import SettingsFormField from "@/renderer/components/Settings/SettingsFormField";
import SettingsActionBar from "@/renderer/components/Settings/SettingsActionBar";
import { useLLMConfigurationStore } from "@/renderer/stores/LLM/LLMConfiguration";
import { LLMService } from "@/service/ai";
import { useMemo, useState, useEffect } from "react";
import TextFieldWithOptions from "@/renderer/components/Text/TextFieldWithOptions";
import { useIntl } from "react-intl";

export interface LLMConfiguration {
  temperature: number;
  openAIKey: string;
  deepSeekKey: string;
  openAIEnabled: boolean;
  deepSeekEnabled: boolean;
  ollamaBaseURL: string;
  ollamaModel: string;
  ollamaEnabled: boolean;
  ollamaVerified: boolean;
}

function LLMConfiguration() {
  // Get the store
  const llmStore = useLLMConfigurationStore();
  const intl = useIntl();
  const {
    // Public LLM settings
    openAIKey,
    deepSeekKey,
    openAIEnabled,
    deepSeekEnabled,
    setOpenAIKey,
    setDeepSeekKey,
    setOpenAIEnabled,
    setDeepSeekEnabled,
    // Private LLM settings
    ollamaBaseURL,
    ollamaModel,
    ollamaEnabled,
    setOllamaModel,
    setOllamaEnabled,
    ollamaVerified,
    setOllamaVerified
  } = llmStore;

  // State variables for verification
  const [verifyingDeepSeek, setVerifyingDeepSeek] = useState(false);
  const [verifyingOpenAI, setVerifyingOpenAI] = useState(false);
  const [deepSeekVerified, setDeepSeekVerified] = useState(!!deepSeekKey && deepSeekEnabled);
  const [openAIVerified, setOpenAIVerified] = useState(!!openAIKey && openAIEnabled);
  const [availableOllamaModels, setAvailableOllamaModels] = useState([]);
  const [loadingOllamaModels, setLoadingOllamaModels] = useState(false);

  const llmService = useMemo(() => new LLMService(), []);

  // Check if Ollama Base URL is configured and verified
  useEffect(() => {
    const verifyOllama = async () => {
      if (ollamaBaseURL) {
        try {
          const isVerified = await llmService.VerifyLLM("ollama", ollamaBaseURL);
          setOllamaVerified(isVerified);

          if (isVerified) {
            fetchOllamaModels();
          }
        } catch (error) {
          console.error("Error verifying Ollama:", error);
          setOllamaVerified(false);
        }
      }
    };

    verifyOllama();
  }, [ollamaBaseURL]);

  // Use a single useEffect for verification status changes
  useEffect(() => {
    // Disable models when required conditions aren't met
    if (!deepSeekKey || !deepSeekVerified) {
      setDeepSeekEnabled(false);
    }

    if (!openAIKey || !openAIVerified) {
      setOpenAIEnabled(false);
    }

    if (!ollamaBaseURL || !ollamaVerified || !ollamaModel) {
      setOllamaEnabled(false);
    }
  }, [
    deepSeekKey, deepSeekVerified, setDeepSeekEnabled,
    openAIKey, openAIVerified, setOpenAIEnabled,
    ollamaBaseURL, ollamaVerified, ollamaModel, setOllamaEnabled
  ]);

  const handleSave = async () => {
    await llmService.UpdateConfiguration({
      openAIKey,
      deepSeekKey,
      openAIEnabled: openAIEnabled && !!openAIKey && (openAIVerified || !openAIKey),
      deepSeekEnabled: deepSeekEnabled && !!deepSeekKey && (deepSeekVerified || !deepSeekKey),
      ollamaModel,
      ollamaEnabled: ollamaEnabled && !!ollamaBaseURL && !!ollamaModel && ollamaVerified
    });
  };

  // Verification handlers
  const handleVerifyDeepSeek = async () => {
    try {
      setVerifyingDeepSeek(true);
      const isVerified = await llmService.VerifyLLM("deepseek", deepSeekKey);
      setDeepSeekVerified(isVerified);
    } catch (error) {
      console.error("Error verifying DeepSeek API key:", error);
      setDeepSeekVerified(false);
    } finally {
      setVerifyingDeepSeek(false);
    }
  };

  const handleVerifyOpenAI = async () => {
    try {
      setVerifyingOpenAI(true);
      const isVerified = await llmService.VerifyLLM("openai", openAIKey);
      setOpenAIVerified(isVerified);
    } catch (error) {
      console.error("Error verifying OpenAI API key:", error);
      setOpenAIVerified(false);
    } finally {
      setVerifyingOpenAI(false);
    }
  };

  const fetchOllamaModels = async () => {
    try {
      setLoadingOllamaModels(true);
      // This is a placeholder - in a real implementation,
      // you would call your API to get the list of available models
      const response = await fetch(`${ollamaBaseURL}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        setAvailableOllamaModels(data.models || []);
      } else {
        throw new Error("Failed to fetch Ollama models");
      }
    } catch (error) {
      console.error("Error fetching Ollama models:", error);
      setAvailableOllamaModels([]);
    } finally {
      setLoadingOllamaModels(false);
    }
  };

  // Input change handlers
  const handleOpenAIKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpenAIKey(e.target.value);
    setOpenAIVerified(false);
  };

  const handleDeepSeekKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeepSeekKey(e.target.value);
    setDeepSeekVerified(false);
  };

  const handleOllamaModelChange = (e: SelectChangeEvent<string>) => {
    setOllamaModel(e.target.value);
  };

  // Clear handlers
  const handleClearDeepSeek = () => {
    setDeepSeekKey("");
    setDeepSeekVerified(false);
    setDeepSeekEnabled(false);
  };

  const handleClearOpenAI = () => {
    setOpenAIKey("");
    setOpenAIVerified(false);
    setOpenAIEnabled(false);
  };

  const handleClearOllamaModel = () => {
    setOllamaModel("");
    setOllamaEnabled(false);
  };

  return (
    <>
      <SettingsSection title={intl.formatMessage({ id: "settings.llmModels.public.openAIConfiguration" })} sx={{ mb: 3 }}>
        <SettingsFormField label={intl.formatMessage({ id: "settings.llmModels.public.openAIKey" })}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextFieldWithOptions
              fullWidth
              size="small"
              value={openAIKey}
              onChange={handleOpenAIKeyChange}
              onClear={handleClearOpenAI}
              placeholder={intl.formatMessage({ id: "settings.llmModels.public.openAIKeyPlaceholder" })}
              isPassword
              error={openAIEnabled && !openAIVerified && !!openAIKey}
              helperText={openAIEnabled && !openAIVerified && !!openAIKey ? intl.formatMessage({ id: "settings.llmModels.public.requiresVerification" }) : ""}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleVerifyOpenAI}
              disabled={!openAIKey || verifyingOpenAI}
              color={openAIVerified ? "success" : "primary"}
              sx={{ whiteSpace: 'nowrap', width: '90px' }}
            >
              {verifyingOpenAI ? intl.formatMessage({ id: "settings.llmModels.public.verifying" }) : openAIVerified ? intl.formatMessage({ id: "settings.llmModels.public.verified" }) : intl.formatMessage({ id: "settings.llmModels.public.verify" })}
            </Button>
          </Box>
        </SettingsFormField>
        <FormControlLabel
          control={
            <Switch
              checked={openAIEnabled}
              onChange={(e) => setOpenAIEnabled(e.target.checked)}
              disabled={!openAIKey || (!!openAIKey && !openAIVerified)}
            />
          }
          label={
            <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
              {intl.formatMessage({ id: "settings.llmModels.public.enableOpenAIModels" })}
              {!openAIVerified && openAIKey && (
                <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                  {intl.formatMessage({ id: "settings.llmModels.public.requiresVerification" })}
                </Typography>
              )}
            </Box>
          }
          sx={{ mt: 1 }}
        />
      </SettingsSection>

      <SettingsSection title={intl.formatMessage({ id: "settings.llmModels.public.deepSeekConfiguration" })} sx={{ mb: 3 }}>
        <SettingsFormField label={intl.formatMessage({ id: "settings.llmModels.public.deepSeekKey" })}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextFieldWithOptions
              fullWidth
              size="small"
              value={deepSeekKey}
              onChange={handleDeepSeekKeyChange}
              onClear={handleClearDeepSeek}
              placeholder={intl.formatMessage({ id: "settings.llmModels.public.deepSeekKeyPlaceholder" })}
              isPassword
              error={deepSeekEnabled && !deepSeekVerified && !!deepSeekKey}
              helperText={deepSeekEnabled && !deepSeekVerified && !!deepSeekKey ? intl.formatMessage({ id: "settings.llmModels.public.deepSeekKeyError" }) : ""}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleVerifyDeepSeek}
              disabled={!deepSeekKey || verifyingDeepSeek}
              color={deepSeekVerified ? "success" : "primary"}
              sx={{ whiteSpace: 'nowrap', width: '90px' }}
            >
              {verifyingDeepSeek ? intl.formatMessage({ id: "settings.llmModels.public.verifying" }) : deepSeekVerified ? intl.formatMessage({ id: "settings.llmModels.public.verified" }) : intl.formatMessage({ id: "settings.llmModels.public.verify" })}
            </Button>
          </Box>
        </SettingsFormField>
        <FormControlLabel
          control={
            <Switch
              checked={deepSeekEnabled}
              onChange={(e) => setDeepSeekEnabled(e.target.checked)}
              disabled={!deepSeekKey || (!!deepSeekKey && !deepSeekVerified)}
            />
          }
          label={
            <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
              {intl.formatMessage({ id: "settings.llmModels.public.enableDeepSeekModels" })}
              {!deepSeekVerified && deepSeekKey && (
                <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                  {intl.formatMessage({ id: "settings.llmModels.public.requiresVerification" })}
                </Typography>
              )}
            </Box>
          }
          sx={{ mt: 1 }}
        />
      </SettingsSection>

      {/* <SettingsSection title={intl.formatMessage({ id: "settings.llmModels.private.ollamaConfiguration" })} sx={{ mb: 3 }}> */}
      {/* {!ollamaBaseURL && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {intl.formatMessage({ id: "settings.llmModels.private.configureOllamaFirst" })}
                    </Typography>
                )} */}

      {/* {ollamaBaseURL && !ollamaVerified && (
                    <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                        {intl.formatMessage({ id: "settings.llmModels.private.ollamaNotVerified" })}
                    </Typography>
                )}

                {ollamaBaseURL && ollamaVerified && (
                    <SettingsFormField label={intl.formatMessage({ id: "settings.llmModels.private.ollamaModel" })}>
                        <Select
                            fullWidth
                            size="small"
                            value={ollamaModel}
                            onChange={(e: SelectChangeEvent<string>) => handleOllamaModelChange(e)}
                            disabled={loadingOllamaModels || !ollamaVerified}
                            displayEmpty
                        >
                            <MenuItem value="" disabled>
                                {loadingOllamaModels
                                    ? intl.formatMessage({ id: "settings.llmModels.private.loadingModels" })
                                    : intl.formatMessage({ id: "settings.llmModels.private.selectModel" })}
                            </MenuItem>
                            {availableOllamaModels.map((model: { name: string }) => (
                                <MenuItem key={model.name} value={model.name}>
                                    {model.name}
                                </MenuItem>
                            ))}
                        </Select>

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={ollamaEnabled}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOllamaEnabled(e.target.checked)}
                                    disabled={!ollamaModel || !ollamaVerified}
                                />
                            }
                            label={intl.formatMessage({ id: "settings.llmModels.private.ollamaEnabled" })}
                            sx={{ mt: 1 }}
                        />
                    </SettingsFormField>
                )} */}
      {/* </SettingsSection> */}

      <SettingsActionBar>
        <Button variant="contained" onClick={handleSave}>{intl.formatMessage({ id: "settings.savePreferences" })}</Button>
      </SettingsActionBar>
    </>
  );
}

export default LLMConfiguration;
