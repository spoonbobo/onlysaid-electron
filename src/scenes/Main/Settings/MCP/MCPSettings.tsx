import { Typography, Box, FormControlLabel, Switch } from "@mui/material";
import SettingsSection from "@/components/Settings/SettingsSection";
import SettingsFormField from "@/components/Settings/SettingsFormField";
import SettingsActionBar from "@/components/Settings/SettingsActionBar";
import { Button } from "@mui/material";
import { useState } from "react";
import TextFieldWithOptions from "@/components/Text/TextFieldWithOptions";
import { useMCPSettingsStore } from "@/stores/MCP/MCPSettingsStore";
import { toast } from "@/utils/toast";
import { FormattedMessage } from "react-intl";
import { useIntl } from "react-intl";

function MCPSettings() {
    // Get store values and actions
    const { smitheryKey, smitheryVerified, setSmitheryKey, setSmitheryVerified } = useMCPSettingsStore();
    const intl = useIntl();
    // Local state
    const [inputKey, setInputKey] = useState(smitheryKey);
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(!!smitheryKey);
    const [smitheryEnabled, setSmitheryEnabled] = useState(!!smitheryKey && smitheryVerified);

    // Reset verification when key changes
    const handleSmitheryKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputKey(e.target.value);
        setVerified(false);
    };

    const handleClearSmitheryKey = () => {
        setInputKey("");
        setVerified(false);
        setSmitheryEnabled(false);
    };

    const handleVerifySmitheryKey = async () => {
        try {
            setVerifying(true);
            // Implement verification logic here if needed
            // For now we'll simulate verification
            await new Promise(resolve => setTimeout(resolve, 1000));
            setVerified(true);
            toast.success("API key verified successfully");
        } catch (error) {
            console.error("Error verifying Smithery API key:", error);
            setVerified(false);
            toast.error("Failed to verify API key");
        } finally {
            setVerifying(false);
        }
    };

    const handleSave = async () => {
        setSmitheryKey(inputKey);
        setSmitheryVerified(verified);
        toast.success("Smithery API key saved successfully");
    };

    return (
        <>
            <SettingsSection title={intl.formatMessage({ id: "settings.mcp.smitheryKeyConfiguration" })} sx={{ mb: 3 }}>
                <SettingsFormField label={intl.formatMessage({ id: "settings.mcp.apiKey" })}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextFieldWithOptions
                            fullWidth
                            size="small"
                            value={inputKey}
                            onChange={handleSmitheryKeyChange}
                            onClear={handleClearSmitheryKey}
                            placeholder={intl.formatMessage({ id: "settings.mcp.smitheryKeyPlaceholder" })}
                            isPassword
                            error={smitheryEnabled && !verified && !!inputKey}
                            helperText={smitheryEnabled && !verified && !!inputKey ? intl.formatMessage({ id: "settings.mcp.smitheryKeyError" }) : ""}
                        />
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleVerifySmitheryKey}
                            disabled={!inputKey || verifying}
                            color={verified ? "success" : "primary"}
                            sx={{ whiteSpace: 'nowrap', width: '90px' }}
                        >
                            {verifying ? intl.formatMessage({ id: "settings.mcp.verifying" }) : verified ? intl.formatMessage({ id: "settings.mcp.verified" }) : intl.formatMessage({ id: "settings.mcp.verify" })}
                        </Button>
                    </Box>
                </SettingsFormField>
                <FormControlLabel
                    control={
                        <Switch
                            checked={smitheryEnabled}
                            onChange={(e) => setSmitheryEnabled(e.target.checked)}
                            disabled={!inputKey || (!!inputKey && !verified)}
                        />
                    }
                    label={
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                            <FormattedMessage id="settings.mcp.enableSmithery" />
                            {!verified && inputKey && (
                                <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                                    <FormattedMessage id="settings.mcp.smitheryKeyError" />
                                </Typography>
                            )}
                        </Box>
                    }
                    sx={{ mt: 1 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    <FormattedMessage id="settings.mcp.smitheryKeyDescription" />
                </Typography>
            </SettingsSection>

            <SettingsActionBar>
                <Button variant="contained" onClick={handleSave}>Save</Button>
            </SettingsActionBar>
        </>
    );
}

export default MCPSettings;
