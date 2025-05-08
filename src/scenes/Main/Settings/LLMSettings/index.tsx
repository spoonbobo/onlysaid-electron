import { Typography, Box, Slider, Button, TextField } from "@mui/material";
import SettingsSection from "@/components/Settings/SettingsSection";
import SettingsFormField from "@/components/Settings/SettingsFormField";
import SettingsActionBar from "@/components/Settings/SettingsActionBar";
import { useLLMConfigurationStore } from "@/stores/LLM/LLMConfiguration";
import { LLMService, LLMModel } from "@/service/ai";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import TextFieldWithOptions from "@/components/Text/TextFieldWithOptions";
import { toast } from "@/utils/toast";

function LLMSettings() {
    const intl = useIntl();
    const {
        temperature,
        setTemperature,
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
