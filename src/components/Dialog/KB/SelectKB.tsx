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
} from "@mui/material";
import { IKnowledgeBase } from "@/../../types/KnowledgeBase/KnowledgeBase";
import { useIntl } from "react-intl";

interface SelectKBDialogProps {
  open: boolean;
  onClose: () => void;
  availableKBs: IKnowledgeBase[];
  selectedKbIds: string[];
  handleToggleKB: (kbId: string) => void;
  handleSelectAllToggle: () => void;
  isAllSelected: boolean;
}

export default function SelectKBDialog({
  open,
  onClose,
  availableKBs,
  selectedKbIds,
  handleToggleKB,
  handleSelectAllToggle,
  isAllSelected,
}: SelectKBDialogProps) {
  const intl = useIntl();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth scroll="paper">
      <DialogTitle sx={{ pb: 1 }}>
        {intl.formatMessage({ id: "kb.selectDialog.title", defaultMessage: "Select Knowledge Bases" })}
      </DialogTitle>
      <DialogContent sx={{ padding: 0, borderTop: '1px solid divider', borderBottom: '1px solid divider' }}>
        <List dense sx={{ width: '100%', bgcolor: 'background.paper', maxHeight: 300, overflowY: 'auto' }}>
          {availableKBs.length > 0 && (
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
                    indeterminate={selectedKbIds.length > 0 && selectedKbIds.length < availableKBs.length}
                    disableRipple
                    size="small"
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      {intl.formatMessage({ id: "chat.kb.selectAll", defaultMessage: "Select All" })}
                    </Typography>
                  }
                />
              </ListItem>
              <Divider component="li" sx={{ marginX: 0 }} />
            </>
          )}
          {availableKBs.map((kb) => (
            <ListItem
              key={kb.id}
              onClick={() => handleToggleKB(kb.id)}
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
                  checked={selectedKbIds.includes(kb.id)}
                  disableRipple
                  size="small"
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography sx={{ fontSize: '0.875rem' }}>
                    {kb.name}
                  </Typography>
                }
              />
            </ListItem>
          ))}
          {availableKBs.length === 0 && (
            <Box sx={{ padding: 2, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                {intl.formatMessage({ id: "chat.noKBsFoundInWorkspace", defaultMessage: "No Knowledge Bases found in this workspace." })}
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
