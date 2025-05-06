import { Box, Typography, Paper, Button, Switch, FormControlLabel, Tooltip, Link } from "@mui/material";
import { OpenInNew, RestartAlt } from "@mui/icons-material";
import { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

interface ServerCardProps {
    title: string;
    description: string;
    version: string;
    isEnabled: boolean;
    isConfigured: boolean;
    onToggle: (enabled: boolean) => void;
    onConfigure: () => void;
    onReset?: () => void;
    icon?: ReactNode;
    sourceUrl?: string;
}

const ServerCard = ({
    title,
    description,
    version,
    isEnabled,
    isConfigured,
    onToggle,
    onConfigure,
    onReset,
    icon,
    sourceUrl
}: ServerCardProps) => {
    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {icon && <Box sx={{ color: 'primary.main' }}>{icon}</Box>}
                    <Box>
                        <Typography variant="h6">{title}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                <FormattedMessage id="settings.mcp.version" values={{ version }} />
                            </Typography>
                            {sourceUrl && (
                                <Link href={sourceUrl} target="_blank" rel="noopener" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}>
                                    Source <OpenInNew sx={{ fontSize: '0.8rem', ml: 0.5 }} />
                                </Link>
                            )}
                        </Box>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {onReset && (
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={onReset}
                            color="secondary"
                        >
                            <FormattedMessage id="settings.mcp.reset" defaultMessage="Reset" />
                        </Button>
                    )}
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={onConfigure}
                    >
                        <FormattedMessage id="settings.mcp.configure" />
                    </Button>
                </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
                {description}
            </Typography>

            <Tooltip title={!isConfigured ? "This service must be configured before it can be enabled" : ""}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={isEnabled}
                            onChange={(e) => onToggle(e.target.checked)}
                            disabled={!isConfigured}
                        />
                    }
                    label={
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                            {isEnabled ? "Enabled" : "Disabled"}
                            {!isConfigured && (
                                <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                                    <FormattedMessage id="settings.mcp.requiresConfiguration" />
                                </Typography>
                            )}
                        </Box>
                    }
                />
            </Tooltip>
        </Paper>
    );
};

export default ServerCard;