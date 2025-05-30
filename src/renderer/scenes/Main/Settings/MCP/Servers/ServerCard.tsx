import { Box, Typography, Paper, Button, Switch, FormControlLabel, Tooltip, Link } from "@mui/material";
import { OpenInNew, RestartAlt } from "@mui/icons-material";
import { FormattedMessage } from "react-intl";
import { IServerCardProps } from "@/../../types/MCP/server";

const ServerCard = ({
  title,
  description,
  version,
  isEnabled,
  isConfigured,
  isAutoApproved,
  onToggle,
  onAutoApprovalToggle,
  onConfigure,
  onReset,
  icon,
  sourceUrl
}: IServerCardProps) => {
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

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mt: 2 }}>
        <Box sx={{ flex: 1, mr: 2 }}>
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
              sx={{ m: 0 }}
            />
          </Tooltip>
        </Box>

        <Box sx={{ flex: 0, minWidth: 'auto' }}>
          <FormControlLabel
            control={
              <Switch
                checked={isAutoApproved}
                onChange={(e) => onAutoApprovalToggle(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                <FormattedMessage id="settings.mcp.autoApprove" defaultMessage="Auto-approve requests" />
              </Typography>
            }
            sx={{ m: 0 }}
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default ServerCard;
