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
  oneasiaKey: string;
  openAIEnabled: boolean;
  deepSeekEnabled: boolean;
  oneasiaEnabled: boolean;
  ollamaBaseURL: string;
  ollamaModel: string;
  ollamaEnabled: boolean;
  ollamaVerified: boolean;
  h20Key: string;
  h20Enabled: boolean;
  h20Verified: boolean;
}

function LLMConfiguration() {
  // Get the store
  const llmStore = useLLMConfigurationStore();
  const intl = useIntl();
  const {
    // Public LLM settings
    openAIKey,
    deepSeekKey,
    oneasiaKey,
    openAIEnabled,
    deepSeekEnabled,
    oneasiaEnabled,
    setOpenAIKey,
    setDeepSeekKey,
    setOneasiaKey,
    setOpenAIEnabled,
    setDeepSeekEnabled,
    setOneasiaEnabled,
    // Private LLM settings
    ollamaBaseURL,
    ollamaModel,
    ollamaEnabled,
    setOllamaModel,
    setOllamaEnabled,
    ollamaVerified,
    setOllamaVerified,
    h20Key,
    h20Enabled,
    setH20Key,
    setH20Enabled,
    h20Verified,
    setH20Verified
  } = llmStore;

  // State variables for verification
  const [verifyingDeepSeek, setVerifyingDeepSeek] = useState(false);
  const [verifyingOpenAI, setVerifyingOpenAI] = useState(false);
  const [verifyingOneasia, setVerifyingOneasia] = useState(false);
  const [verifyingH20, setVerifyingH20] = useState(false);
  const [deepSeekVerified, setDeepSeekVerified] = useState(!!deepSeekKey && deepSeekEnabled);
  const [openAIVerified, setOpenAIVerified] = useState(!!openAIKey && openAIEnabled);
  const [oneasiaVerified, setOneasiaVerified] = useState(!!oneasiaKey && oneasiaEnabled);
  // h20Verified is already coming from the store
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

    if (!oneasiaKey || !oneasiaVerified) {
      setOneasiaEnabled(false);
    }

    // H20 doesn't require API key, so don't disable it
    // if (!h20Key) {
    //   setH20Enabled(false);
    // }

    if (!ollamaBaseURL || !ollamaVerified || !ollamaModel) {
      setOllamaEnabled(false);
    }
  }, [
    deepSeekKey, deepSeekVerified, setDeepSeekEnabled,
    openAIKey, openAIVerified, setOpenAIEnabled,
    oneasiaKey, oneasiaVerified, setOneasiaEnabled,
    // Don't include h20Key in dependencies
    ollamaBaseURL, ollamaVerified, ollamaModel, setOllamaEnabled
  ]);

  const handleSave = async () => {
    await llmService.UpdateConfiguration({
      openAIKey,
      deepSeekKey,
      oneasiaKey,
      h20Key,
      openAIEnabled: openAIEnabled && !!openAIKey && (openAIVerified || !openAIKey),
      deepSeekEnabled: deepSeekEnabled && !!deepSeekKey && (deepSeekVerified || !deepSeekKey),
      oneasiaEnabled: oneasiaEnabled && !!oneasiaKey && (oneasiaVerified || !oneasiaKey),
      h20Enabled: h20Enabled, // H20 can work without key
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

  const handleVerifyOneasia = async () => {
    try {
      setVerifyingOneasia(true);
      const isVerified = await llmService.VerifyLLM("oneasia", oneasiaKey);
      setOneasiaVerified(isVerified);
    } catch (error) {
      console.error("Error verifying Oneasia vLLM API key:", error);
      setOneasiaVerified(false);
    } finally {
      setVerifyingOneasia(false);
    }
  };

  const handleVerifyH20 = async () => {
    try {
      setVerifyingH20(true);
      const isVerified = await llmService.VerifyLLM("h20", h20Key);
      setH20Verified(isVerified); // This will update the store
    } catch (error) {
      console.error("Error verifying H20 API key:", error);
      setH20Verified(false);
    } finally {
      setVerifyingH20(false);
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

  const handleOneasiaKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOneasiaKey(e.target.value);
    setOneasiaVerified(false);
  };

  const handleH20KeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setH20Key(e.target.value);
    setH20Verified(false); // This will update the store
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

  const handleClearOneasia = () => {
    setOneasiaKey("");
    setOneasiaVerified(false);
    setOneasiaEnabled(false);
  };

  const handleClearOllamaModel = () => {
    setOllamaModel("");
    setOllamaEnabled(false);
  };

  const handleClearH20 = () => {
    setH20Key("");
    setH20Verified(false);
    setH20Enabled(false);
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

      <SettingsSection title={intl.formatMessage({ id: "settings.llmModels.public.oneasiaConfiguration" })} sx={{ mb: 3 }}>
        <SettingsFormField label={intl.formatMessage({ id: "settings.llmModels.public.oneasiaKey" })}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextFieldWithOptions
              fullWidth
              size="small"
              value={oneasiaKey}
              onChange={handleOneasiaKeyChange}
              onClear={handleClearOneasia}
              placeholder={intl.formatMessage({ id: "settings.llmModels.public.oneasiaKeyPlaceholder" })}
              isPassword
              error={oneasiaEnabled && !oneasiaVerified && !!oneasiaKey}
              helperText={oneasiaEnabled && !oneasiaVerified && !!oneasiaKey ? intl.formatMessage({ id: "settings.llmModels.public.oneasiaKeyError" }) : ""}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleVerifyOneasia}
              disabled={!oneasiaKey || verifyingOneasia}
              color={oneasiaVerified ? "success" : "primary"}
              sx={{ whiteSpace: 'nowrap', width: '90px' }}
            >
              {verifyingOneasia ? intl.formatMessage({ id: "settings.llmModels.public.verifying" }) : oneasiaVerified ? intl.formatMessage({ id: "settings.llmModels.public.verified" }) : intl.formatMessage({ id: "settings.llmModels.public.verify" })}
            </Button>
          </Box>
        </SettingsFormField>
        <FormControlLabel
          control={
            <Switch
              checked={oneasiaEnabled}
              onChange={(e) => setOneasiaEnabled(e.target.checked)}
              disabled={!oneasiaKey || (!!oneasiaKey && !oneasiaVerified)}
            />
          }
          label={
            <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
              {intl.formatMessage({ id: "settings.llmModels.public.enableOneasiaModels" })}
              {!oneasiaVerified && oneasiaKey && (
                <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                  {intl.formatMessage({ id: "settings.llmModels.public.requiresVerification" })}
                </Typography>
              )}
            </Box>
          }
          sx={{ mt: 1 }}
        />
      </SettingsSection>

      <SettingsSection title={intl.formatMessage({ id: "settings.llmModels.public.h20Configuration" })} sx={{ mb: 3 }}>
        <SettingsFormField label={intl.formatMessage({ id: "settings.llmModels.public.h20Key" })}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextFieldWithOptions
              fullWidth
              size="small"
              value={h20Key}
              onChange={handleH20KeyChange}
              onClear={handleClearH20}
              placeholder={intl.formatMessage({ id: "settings.llmModels.public.h20KeyPlaceholder" })}
              isPassword
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleVerifyH20}
              color="success"
              sx={{ whiteSpace: 'nowrap', width: '90px' }}
            >
              Ready
            </Button>
          </Box>
        </SettingsFormField>
        <FormControlLabel
          control={
            <Switch
              checked={h20Enabled}
              onChange={(e) => setH20Enabled(e.target.checked)}
            />
          }
          label={
            <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
              {intl.formatMessage({ id: "settings.llmModels.public.enableH20Models" })}
              <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                (No API key required)
              </Typography>
            </Box>
          }
          sx={{ mt: 1 }}
        />
      </SettingsSection>

      <SettingsActionBar>
        <Button variant="contained" onClick={handleSave}>{intl.formatMessage({ id: "settings.savePreferences" })}</Button>
      </SettingsActionBar>
    </>
  );
}

export default LLMConfiguration;
