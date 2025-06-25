import { useState, useEffect, useMemo } from "react";
import { Chip, Typography, Checkbox, ListItemIcon, ListItemText } from "@mui/material";
import { useIntl } from "react-intl";
import { useKBStore } from "@/renderer/stores/KB/KBStore";
import { useKBSettingsStore } from "@/renderer/stores/KB/KBSettingStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { IKnowledgeBase } from "@/../../types/KnowledgeBase/KnowledgeBase";
import SelectKBDialog from "@/renderer/components/Dialog/KB/SelectKB";

interface KBSelectorProps {
  disabled?: boolean;
}

export default function KBSelector({ disabled = false }: KBSelectorProps) {
  const [availableKBs, setAvailableKBs] = useState<IKnowledgeBase[]>([]);
  const { selectedKbIds, setSelectedKBs, addSelectedKB, removeSelectedKB, clearSelectedKBs } = useKBSettingsStore();
  const { getKnowledgeBaseDetailsList } = useKBStore();
  const { selectedContext } = useTopicStore();
  const workspaceId = selectedContext?.id;

  const [dialogOpen, setDialogOpen] = useState(false);
  const intl = useIntl();
  const componentDisabled = disabled;

  const [initialSelectAllDone, setInitialSelectAllDone] = useState(false);
  const [hasLoadedKBs, setHasLoadedKBs] = useState(false);

  // Load KBs when workspaceId changes
  useEffect(() => {
    if (workspaceId) {
      loadKBs();
    } else {
      setAvailableKBs([]);
      setHasLoadedKBs(false);
      setInitialSelectAllDone(false);
    }
  }, [workspaceId]);

  // Only clear selections if we've actually loaded data and confirmed there are no KBs
  useEffect(() => {
    if (hasLoadedKBs) {
      if (availableKBs.length > 0) {
        const currentSelected = selectedKbIds.filter(id => availableKBs.some(kb => kb.id === id));
        if (currentSelected.length !== selectedKbIds.length) {
          setSelectedKBs(currentSelected);
        }
      } else if (selectedKbIds.length > 0) {
        // Only clear if we've confirmed there are no available KBs after loading
        clearSelectedKBs();
      }
    }
  }, [availableKBs, selectedKbIds, setSelectedKBs, clearSelectedKBs, hasLoadedKBs]);

  const loadKBs = async () => {
    if (!workspaceId) return;
    try {
      const kbs = await getKnowledgeBaseDetailsList(workspaceId);
      const validKBs = kbs || [];
      setAvailableKBs(validKBs);
      setHasLoadedKBs(true);

      if (validKBs.length > 0 && !initialSelectAllDone) {
        setSelectedKBs(validKBs.map(kb => kb.id));
        setInitialSelectAllDone(true);
      } else if (validKBs.length === 0) {
        clearSelectedKBs();
        setInitialSelectAllDone(false);
      }
    } catch (error) {
      console.error('Failed to load knowledge bases:', error);
      setAvailableKBs([]);
      setHasLoadedKBs(true);
      clearSelectedKBs();
      setInitialSelectAllDone(false);
    }
  };

  const handleDialogOpen = () => {
    if (componentDisabled || availableKBs.length === 0) return;
    if (workspaceId) loadKBs();
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleToggleKB = (kbId: string) => {
    if (selectedKbIds.includes(kbId)) {
      removeSelectedKB(kbId);
    } else {
      addSelectedKB(kbId);
    }
  };

  const handleSelectAllToggle = () => {
    if (selectedKbIds.length === availableKBs.length) {
      clearSelectedKBs();
    } else {
      setSelectedKBs(availableKBs.map(kb => kb.id));
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
        onClick={availableKBs.length > 0 ? handleDialogOpen : undefined}
        disabled={componentDisabled || availableKBs.length === 0}
        size="small"
        variant="outlined"
        sx={{
          height: 24,
          fontSize: "0.75rem",
          fontWeight: 500,
          borderColor: "transparent",
          color: "text.primary",
          cursor: (componentDisabled || availableKBs.length === 0) ? 'default' : 'pointer'
        }}
      />
      <SelectKBDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        availableKBs={availableKBs}
        selectedKbIds={selectedKbIds}
        handleToggleKB={handleToggleKB}
        handleSelectAllToggle={handleSelectAllToggle}
        isAllSelected={isAllSelected}
      />
    </>
  );
}