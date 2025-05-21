import { useState, useEffect, useMemo } from "react";
import { Chip, Menu, MenuItem, Typography, Checkbox, ListItemIcon, ListItemText } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useIntl } from "react-intl";
import { useKBStore } from "@/stores/KB/KBStore";
import { useKBSettingsStore } from "@/stores/KB/KBSettingStore";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { useLLMConfigurationStore } from "@/stores/LLM/LLMConfiguration";
import { IKnowledgeBase } from "@/../../types/KnowledgeBase/KnowledgeBase";

interface KBSelectorProps {
  disabled?: boolean;
}

export default function KBSelector({ disabled = false }: KBSelectorProps) {
  const [availableKBs, setAvailableKBs] = useState<IKnowledgeBase[]>([]);
  const { selectedKbIds, setSelectedKBs, addSelectedKB, removeSelectedKB, clearSelectedKBs } = useKBSettingsStore();
  const { getKnowledgeBaseDetailsList } = useKBStore();
  const { selectedContext } = useTopicStore();
  const workspaceId = selectedContext?.id;
  const { aiMode } = useLLMConfigurationStore();

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);
  const intl = useIntl();
  const componentDisabled = disabled;

  // Flag to track if initial "select all" has been performed for the current workspace context
  const [initialSelectAllDone, setInitialSelectAllDone] = useState(false);

  useEffect(() => {
    if (aiMode === "query" && workspaceId) {
      loadKBs();
    } else {
      setAvailableKBs([]);
      clearSelectedKBs();
      setInitialSelectAllDone(false); // Reset flag when not in query mode or no workspace
    }
  }, [workspaceId, aiMode]); // Removed clearSelectedKBs, selectedKbIds from deps to avoid loops, managed by logic inside

  useEffect(() => {
    // Sync selected KBs with available KBs (e.g., if a selected KB is deleted)
    if (aiMode === "query" && availableKBs.length > 0) {
      const currentSelected = selectedKbIds.filter(id => availableKBs.some(kb => kb.id === id));
      if (currentSelected.length !== selectedKbIds.length) {
        setSelectedKBs(currentSelected);
      }
    } else if (aiMode === "query" && availableKBs.length === 0 && selectedKbIds.length > 0) {
      // If no KBs available, clear selection
      clearSelectedKBs();
    }
  }, [availableKBs, aiMode, selectedKbIds.length]); // Watch selectedKbIds.length to catch external changes


  const loadKBs = async () => {
    if (!workspaceId) return;
    try {
      const kbs = await getKnowledgeBaseDetailsList(workspaceId);
      const validKBs = kbs || [];
      setAvailableKBs(validKBs);

      if (validKBs.length > 0 && !initialSelectAllDone) {
        setSelectedKBs(validKBs.map(kb => kb.id));
        setInitialSelectAllDone(true);
      } else if (validKBs.length === 0) {
        clearSelectedKBs(); // Clear selection if no KBs are loaded
        setInitialSelectAllDone(false); // Reset if KBs disappear
      }
    } catch (error) {
      console.error('Failed to load knowledge bases:', error);
      setAvailableKBs([]);
      clearSelectedKBs();
      setInitialSelectAllDone(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLDivElement>) => {
    if (componentDisabled || availableKBs.length === 0) return;
    if (workspaceId) loadKBs(); // Refresh KBs
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleToggleKB = (kbId: string) => {
    if (selectedKbIds.includes(kbId)) {
      removeSelectedKB(kbId);
    } else {
      addSelectedKB(kbId);
    }
    // Keep menu open - click is on checkbox/item part
  };

  const handleSelectAllToggle = () => {
    if (selectedKbIds.length === availableKBs.length) {
      clearSelectedKBs(); // Deselect all
    } else {
      setSelectedKBs(availableKBs.map(kb => kb.id)); // Select all
    }
  };

  const chipLabel = useMemo(() => {
    if (availableKBs.length === 0) {
      return intl.formatMessage({ id: "chat.noKBsAvailable" }) || "No KBs";
    }
    if (selectedKbIds.length === 0) {
      return intl.formatMessage({ id: "chat.selectKB.multiple" }) || "Select KBs";
    }
    if (selectedKbIds.length === availableKBs.length) {
      return intl.formatMessage({ id: "chat.allKBsSelected" }) || "All KBs Selected";
    }
    if (selectedKbIds.length === 1) {
      const kb = availableKBs.find(k => k.id === selectedKbIds[0]);
      return kb?.name || `${selectedKbIds.length} KB Selected`;
    }
    return intl.formatMessage({ id: "chat.multipleKBsSelected" }, { count: selectedKbIds.length }) || `${selectedKbIds.length} KBs Selected`;
  }, [selectedKbIds, availableKBs, intl]);


  const isAllSelected = availableKBs.length > 0 && selectedKbIds.length === availableKBs.length;

  return (
    <>
      <Chip
        label={chipLabel}
        onClick={availableKBs.length > 0 ? handleMenuOpen : undefined}
        disabled={componentDisabled || availableKBs.length === 0}
        deleteIcon={availableKBs.length > 0 ? <ExpandMoreIcon fontSize="small" /> : undefined}
        onDelete={availableKBs.length > 0 ? handleMenuOpen : undefined}
        size="small"
        variant="outlined"
        sx={{
          height: 24,
          fontSize: "0.75rem",
          fontWeight: 500,
          borderColor: "transparent",
          color: "text.primary",
          "& .MuiChip-deleteIcon": { margin: 0, color: "text.secondary" },
          cursor: (componentDisabled || availableKBs.length === 0) ? 'default' : 'pointer'
        }}
      />
      <Menu
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            elevation: 1,
            sx: { minWidth: 160, maxHeight: 220, overflowY: 'auto' },
          }
        }}
      >
        {availableKBs.length > 0 && (
          <MenuItem onClick={handleSelectAllToggle} dense sx={{ paddingTop: 0.5, paddingBottom: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 'auto', marginRight: 0.5 }}>
              <Checkbox
                edge="start"
                checked={isAllSelected}
                indeterminate={selectedKbIds.length > 0 && selectedKbIds.length < availableKBs.length}
                disableRipple
                size="small"
              />
            </ListItemIcon>
            <ListItemText primary={<Typography sx={{ fontSize: '0.8rem' }}>{intl.formatMessage({ id: "chat.kb.selectAll" }) || "Select All"}</Typography>} />
          </MenuItem>
        )}
        {availableKBs.map((kb) => (
          <MenuItem key={kb.id} onClick={() => handleToggleKB(kb.id)} dense sx={{ paddingTop: 0.5, paddingBottom: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 'auto', marginRight: 0.5 }}>
              <Checkbox
                edge="start"
                checked={selectedKbIds.includes(kb.id)}
                disableRipple
                size="small"
              />
            </ListItemIcon>
            <ListItemText primary={<Typography sx={{ fontSize: '0.8rem' }}>{kb.name}</Typography>} />
          </MenuItem>
        ))}
        {availableKBs.length === 0 && (
          <MenuItem disabled dense sx={{ paddingTop: 0.5, paddingBottom: 0.5 }}>
            <Typography variant="body2" sx={{ maxWidth: 180, fontSize: '0.8rem' }}>
              {intl.formatMessage({ id: "chat.noKBsFoundInWorkspace" })}
            </Typography>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
