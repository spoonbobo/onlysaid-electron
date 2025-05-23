import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  Checkbox,
  ListItemText,
  Typography,
  Divider,
  Box,
  Tooltip,
} from "@mui/material";
import { useIntl } from "react-intl";

export interface IMCPToolDisplay {
  name: string;
  description?: string;
  // input_schema?: any; // Keeping it simple for dialog display
}

export interface IMCPServiceDisplay {
  id: string;
  name: string;
  tools?: IMCPToolDisplay[];
  toolsError?: boolean; // To indicate if fetching tools failed
}

interface SelectMCPDialogProps {
  open: boolean;
  onClose: () => void;
  availableMcps: IMCPServiceDisplay[];
  selectedMcpIds: string[];
  handleToggleMcp: (mcpId: string) => void;
  handleSelectAllToggle: () => void;
  isAllSelected: boolean;
}

// MAX_TOOLS_TO_SHOW_IN_LIST is no longer needed for the main display string logic

export default function SelectMCPDialog({
  open,
  onClose,
  availableMcps,
  selectedMcpIds,
  handleToggleMcp,
  handleSelectAllToggle,
  isAllSelected,
}: SelectMCPDialogProps) {
  const intl = useIntl();

  // Generates detailed content for the tooltip
  const getTooltipContent = (tools: IMCPToolDisplay[] | undefined): string => {
    if (tools && tools.length > 0) {
      return tools.map(t => `${t.name}${t.description ? `: ${t.description}` : ''}`).join('\n');
    }
    // If toolsError is true but tools array is empty/undefined, this will also be hit.
    // The primary display will show "Error loading tools" in that case.
    // If no error and no tools, it will show "0 tools" and tooltip will say "No tools".
    return intl.formatMessage({ id: "mcp.dialog.noTools", defaultMessage: "No tools" });
  };

  // Generates the "X tools" string for the secondary display
  const getToolCountDisplayString = (tools: IMCPToolDisplay[] | undefined): string => {
    const count = tools ? tools.length : 0;
    // Using a generic "count" and specific ID to allow more flexible translation
    // For "0 tools", "1 tool", "{count} tools"
    if (count === 0) {
      return intl.formatMessage({ id: "mcp.dialog.toolCount.zero", defaultMessage: "0 tools" });
    } if (count === 1) {
      return intl.formatMessage({ id: "mcp.dialog.toolCount.one", defaultMessage: "1 tool" });
    }
    return intl.formatMessage({ id: "mcp.dialog.toolCount.other", defaultMessage: "{count} tools" }, { count });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ pb: 1 }}>
        {intl.formatMessage({ id: "mcp.selectDialog.title", defaultMessage: "Select MCP Services" })}
      </DialogTitle>
      <DialogContent sx={{ padding: 0, borderTop: '1px solid divider', borderBottom: '1px solid divider' }}>
        <List dense sx={{ width: '100%', bgcolor: 'background.paper', maxHeight: 300, overflowY: 'auto' }}>
          {availableMcps.length > 0 && (
            <>
              <ListItem
                onClick={handleSelectAllToggle}
                dense
                sx={{
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' },
                  paddingTop: 1, paddingBottom: 1, paddingX: 2
                }}
              >
                <ListItemIcon sx={{ minWidth: 'auto', marginRight: 1.5 }}>
                  <Checkbox
                    edge="start"
                    checked={isAllSelected}
                    indeterminate={selectedMcpIds.length > 0 && selectedMcpIds.length < availableMcps.length}
                    disableRipple
                    size="small"
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      {intl.formatMessage({ id: "mcp.selectAll", defaultMessage: "Select All" })}
                    </Typography>
                  }
                />
              </ListItem>
              <Divider component="li" sx={{ marginX: 0 }} />
            </>
          )}
          {availableMcps.map((mcp) => (
            <ListItem
              key={mcp.id}
              onClick={() => handleToggleMcp(mcp.id)}
              dense
              sx={{
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'action.hover' },
                paddingTop: 1, paddingBottom: 1, paddingX: 2,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <ListItemIcon sx={{ minWidth: 'auto', marginRight: 1.5 }}>
                <Checkbox
                  edge="start"
                  checked={selectedMcpIds.includes(mcp.id)}
                  disableRipple
                  size="small"
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: selectedMcpIds.includes(mcp.id) ? 500 : 'normal' }}>
                    {mcp.name}
                  </Typography>
                }
                secondary={
                  mcp.toolsError ? (
                    <Typography variant="caption" color="error">
                      {intl.formatMessage({ id: "mcp.dialog.toolsError", defaultMessage: "Error loading tools" })}
                    </Typography>
                  ) : (
                    <Tooltip
                      title={getTooltipContent(mcp.tools)}
                      arrow
                      placement="top-start"
                    >
                      <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getToolCountDisplayString(mcp.tools)}
                      </Typography>
                    </Tooltip>
                  )
                }
                sx={{ flexGrow: 1, overflow: 'hidden' }}
              />
            </ListItem>
          ))}
          {availableMcps.length === 0 && (
            <Box sx={{ padding: 2, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                {intl.formatMessage({ id: "mcp.noEnabledAndConfigured", defaultMessage: "No enabled and configured MCP services found." })}
              </Typography>
            </Box>
          )}
        </List>
      </DialogContent>
      <DialogActions sx={{ paddingTop: 1, paddingBottom: 1 }}>
        <Button onClick={onClose} size="small">
          {intl.formatMessage({ id: "common.close", defaultMessage: "Close" })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}