import { FormControlLabel, Switch } from "@mui/material";
import SettingsSection from "@/components/Settings/SettingsSection";
import SettingsFormField from "@/components/Settings/SettingsFormField";
import SettingsActionBar from "@/components/Settings/SettingsActionBar";
import { Button } from "@mui/material";
import { useLLMConfigurationStore } from "@/stores/LLM/LLMConfiguration";
import { LLMService } from "@/service/llm";
import { useMemo } from "react";
import TextFieldWithOptions from "@/components/Text/TextFieldWithOptions";
import { useIntl } from "react-intl";
function PrivateLLMConfiguration() {
    const {
        ollamaBaseURL,
        ollamaModel,
        ollamaEnabled,
        setOllamaBaseURL,
        setOllamaModel,
        setOllamaEnabled
    } = useLLMConfigurationStore();
    const intl = useIntl();
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
            <SettingsSection title={intl.formatMessage({ id: "settings.llmModels.private.ollamaConfiguration" })} sx={{ mb: 3 }}>
                <SettingsFormField label={intl.formatMessage({ id: "settings.llmModels.private.ollamaBaseURL" })}>
                    <TextFieldWithOptions
                        fullWidth
                        size="small"
                        value={ollamaBaseURL}
                        onChange={(e) => setOllamaBaseURL(e.target.value)}
                        onClear={() => setOllamaBaseURL("")}
                        placeholder={intl.formatMessage({ id: "settings.llmModels.private.ollamaBaseURLPlaceholder" })}
                    />
                </SettingsFormField>
                <SettingsFormField label={intl.formatMessage({ id: "settings.llmModels.private.ollamaModel" })}>
                    <TextFieldWithOptions
                        fullWidth
                        size="small"
                        value={ollamaModel}
                        onChange={(e) => setOllamaModel(e.target.value)}
                        onClear={() => setOllamaModel("")}
                        placeholder={intl.formatMessage({ id: "settings.llmModels.private.ollamaModelPlaceholder" })}
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
                    label={intl.formatMessage({ id: "settings.llmModels.private.ollamaEnabled" })}
                    sx={{ mt: 1 }}
                />
            </SettingsSection>

            <SettingsActionBar>
                <Button variant="contained" onClick={handleSave}>{intl.formatMessage({ id: "settings.savePreferences" })}</Button>
            </SettingsActionBar>
        </>
    );
}

export default PrivateLLMConfiguration;
