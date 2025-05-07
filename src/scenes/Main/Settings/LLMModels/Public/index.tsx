import { Typography, Box, FormControlLabel, Switch, Button } from "@mui/material";
import SettingsSection from "@/components/Settings/SettingsSection";
import SettingsFormField from "@/components/Settings/SettingsFormField";
import SettingsActionBar from "@/components/Settings/SettingsActionBar";
import { useLLMConfigurationStore } from "@/stores/LLM/LLMConfiguration";
import { LLMService } from "@/service/llm";
import { useMemo, useState, useEffect } from "react";
import TextFieldWithOptions from "@/components/Text/TextFieldWithOptions";
import { useIntl } from "react-intl";

function PublicLLMConfiguration() {
    // First get the store
    const llmStore = useLLMConfigurationStore();
    const intl = useIntl();
    const {
        openAIKey,
        deepSeekKey,
        openAIEnabled,
        deepSeekEnabled,
        setOpenAIKey,
        setDeepSeekKey,
        setOpenAIEnabled,
        setDeepSeekEnabled
    } = llmStore;

    // Then initialize state variables
    const [verifyingDeepSeek, setVerifyingDeepSeek] = useState(false);
    const [verifyingOpenAI, setVerifyingOpenAI] = useState(false);
    const [deepSeekVerified, setDeepSeekVerified] = useState(!!deepSeekKey && deepSeekEnabled);
    const [openAIVerified, setOpenAIVerified] = useState(!!openAIKey && openAIEnabled);

    const llmService = useMemo(() => new LLMService(), []);

    // Use a single useEffect for verification status changes
    useEffect(() => {
        // Disable models when required conditions aren't met
        if (!deepSeekKey || !deepSeekVerified) {
            setDeepSeekEnabled(false);
        }

        if (!openAIKey || !openAIVerified) {
            setOpenAIEnabled(false);
        }
    }, [
        deepSeekKey, deepSeekVerified, setDeepSeekEnabled,
        openAIKey, openAIVerified, setOpenAIEnabled
    ]);

    const handleSave = async () => {
        console.log(deepSeekEnabled && !!deepSeekKey && (deepSeekVerified || !deepSeekKey));
        await llmService.UpdateConfiguration({
            openAIKey,
            deepSeekKey,
            openAIEnabled: openAIEnabled && !!openAIKey && (openAIVerified || !openAIKey),
            deepSeekEnabled: deepSeekEnabled && !!deepSeekKey && (deepSeekVerified || !deepSeekKey)
        });
    };

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

    // Reset verification when keys change
    const handleOpenAIKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOpenAIKey(e.target.value);
        setOpenAIVerified(false);
    };

    const handleDeepSeekKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDeepSeekKey(e.target.value);
        setDeepSeekVerified(false);
    };

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

    return (
        <>
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
                            helperText={openAIEnabled && !openAIVerified && !!openAIKey ? "API key needs verification" : ""}
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

            <SettingsActionBar>
                <Button variant="contained" onClick={handleSave}>{intl.formatMessage({ id: "settings.savePreferences" })}</Button>
            </SettingsActionBar>
        </>
    );
}

export default PublicLLMConfiguration;
