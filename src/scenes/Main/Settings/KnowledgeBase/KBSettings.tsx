import { Typography, Box, FormControl, InputLabel, Select, MenuItem, Button, Chip } from "@mui/material";
import SettingsSection from "@/components/Settings/SettingsSection";
import SettingsFormField from "@/components/Settings/SettingsFormField";
import SettingsActionBar from "@/components/Settings/SettingsActionBar";
import { useKBSettingsStore } from "@/stores/KB/KBSettingStore";
import { useLLMConfigurationStore } from "@/stores/LLM/LLMConfiguration";
import { LLMService, LLMModel, EmbeddingModel, EmbeddingService } from "@/service/ai";
import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { toast } from "@/utils/toast";

function KBSettings() {
    const intl = useIntl();
    const { queryEngineLLM, embeddingEngine, setQueryEngineLLM, setEmbeddingEngine, resetToDefaults, isKBUsable } = useKBSettingsStore();
    const { openAIEnabled, deepSeekEnabled, ollamaEnabled } = useLLMConfigurationStore();
    const [llms, setLlms] = useState<LLMModel[]>([]);
    const [embeddingModels, setEmbeddingModels] = useState<EmbeddingModel[]>([]);

    useEffect(() => {
        const llmService = new LLMService();
        llmService.GetEnabledLLM()
            .then(enabledLLMs => {
                setLlms(enabledLLMs);
                console.log(enabledLLMs);

                // Set default query engine if not set and there are available LLMs
                if (!queryEngineLLM && enabledLLMs.length > 0) {
                    setQueryEngineLLM(enabledLLMs[0].id);
                }
            })
            .catch(error => {
                console.error("Failed to load LLMs:", error);
            });

        const embeddingService = new EmbeddingService();
        embeddingService.GetEmbeddingModels()
            .then(enabledEmbeddingModels => {
                setEmbeddingModels(enabledEmbeddingModels);
                console.log(enabledEmbeddingModels);
            })
            .catch(error => {
                console.error("Failed to load embedding models:", error);
            });
    }, [queryEngineLLM, setQueryEngineLLM]);

    const handleQueryEngineChange = (event: any) => {
        setQueryEngineLLM(event.target.value);
    };

    const handleEmbeddingEngineChange = (event: any) => {
        setEmbeddingEngine(event.target.value);
    };

    const handleSave = () => {
        toast.success(intl.formatMessage({ id: "settings.savedSuccessfully" }));
    };

    return (
        <>
            <SettingsSection title={intl.formatMessage({ id: "settings.kbSettings" })} sx={{ mb: 3 }}>
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">
                        <FormattedMessage id="settings.kb.status" defaultMessage="知識庫狀態" />: {isKBUsable() ? (
                            <Chip size="small" color="success" label={intl.formatMessage({ id: "settings.kb.configured" })} />
                        ) : (
                            <Chip size="small" color="error" label={intl.formatMessage({ id: "settings.kb.notConfigured" })} />
                        )}
                    </Typography>
                </Box>

                <SettingsFormField label={intl.formatMessage({ id: "settings.kb.queryEngine" })}>
                    <FormControl fullWidth>
                        <InputLabel id="query-engine-label">
                            {intl.formatMessage({ id: "settings.kb.selectQueryEngine" })}
                        </InputLabel>
                        <Select
                            labelId="query-engine-label"
                            value={queryEngineLLM}
                            onChange={handleQueryEngineChange}
                            label={intl.formatMessage({ id: "settings.kb.selectQueryEngine" })}
                        >
                            {llms.length > 0 ? (
                                llms.map((llm) => (
                                    <MenuItem key={llm.id} value={llm.id}>
                                        {llm.name}
                                    </MenuItem>
                                ))
                            ) : (
                                <MenuItem value="" disabled>
                                    {intl.formatMessage({ id: "settings.kb.noLLMsAvailable" })}
                                </MenuItem>
                            )}
                        </Select>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                            {intl.formatMessage({ id: "settings.kb.queryEngineDescription" })}
                        </Typography>
                    </FormControl>
                </SettingsFormField>

                <SettingsFormField label={intl.formatMessage({ id: "settings.kb.embeddingEngine" })}>
                    <FormControl fullWidth>
                        <InputLabel id="embedding-engine-label">
                            {intl.formatMessage({ id: "settings.kb.selectEmbeddingEngine" })}
                        </InputLabel>
                        <Select
                            labelId="embedding-engine-label"
                            value={embeddingEngine}
                            onChange={handleEmbeddingEngineChange}
                            label={intl.formatMessage({ id: "settings.kb.selectEmbeddingEngine" })}
                        >
                            <MenuItem value="none">
                                {intl.formatMessage({ id: "settings.kb.none" })}
                            </MenuItem>
                            {embeddingModels.length > 0 ? (
                                embeddingModels.map((model) => (
                                    <MenuItem key={model.id} value={model.id}>
                                        {model.name}
                                    </MenuItem>
                                ))
                            ) : (
                                <MenuItem value="" disabled>
                                    {intl.formatMessage({ id: "settings.kb.noEmbeddingModelsAvailable" })}
                                </MenuItem>
                            )}
                        </Select>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                            {intl.formatMessage({ id: "settings.kb.embeddingEngineDescription" })}
                        </Typography>
                    </FormControl>
                </SettingsFormField>
            </SettingsSection>

            <SettingsActionBar>
                <Button variant="contained" onClick={handleSave}>
                    {intl.formatMessage({ id: "common.save" })}
                </Button>
                <Button variant="outlined" onClick={resetToDefaults} sx={{ ml: 2 }}>
                    {intl.formatMessage({ id: "common.resetToDefaults" })}
                </Button>
            </SettingsActionBar>
        </>
    );
}

export default KBSettings;
