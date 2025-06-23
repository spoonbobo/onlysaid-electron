import { useState, useEffect, useMemo } from "react";
import { Chip } from "@mui/material";
import { useIntl } from "react-intl";
import { useMCPStore } from "@/renderer/stores/MCP/MCPStore";
import { useMCPSettingsStore } from "@/renderer/stores/MCP/MCPSettingsStore";
import SelectMCPDialog, { IMCPServiceDisplay, IMCPToolDisplay } from "@/renderer/components/Dialog/MCP/SelectMCPDialog";
import { useLLMConfigurationStore } from "@/renderer/stores/LLM/LLMConfiguration";
import { useMCPClientStore } from "@/renderer/stores/MCP/MCPClient";
import { getServiceTools, formatMCPName } from "@/utils/mcp";

interface MCPSelectorProps {
  disabled?: boolean;
}

export default function MCPSelector({ disabled = false }: MCPSelectorProps) {
  const [availableMcps, setAvailableMcps] = useState<IMCPServiceDisplay[]>([]);
  const {
    selectedMcpServerIds,
    setSelectedMcpServerIds,
    addSelectedMcpServerId,
    removeSelectedMcpServerId,
    clearSelectedMcpServerIds
  } = useMCPSettingsStore();
  const { getAllConfiguredServers } = useMCPStore();
  const { ListMCPTool } = useMCPClientStore.getState();
  const { aiMode } = useLLMConfigurationStore();
  const intl = useIntl();

  const [dialogOpen, setDialogOpen] = useState(false);
  const componentDisabled = disabled;
  const [initialSelectAllDone, setInitialSelectAllDone] = useState(false);

  useEffect(() => {
    if (aiMode === "agent") {
      loadMcps();
    } else {
      setAvailableMcps([]);
      setInitialSelectAllDone(false);
    }
  }, [aiMode]);

  useEffect(() => {
    if (aiMode === "agent" && availableMcps.length > 0) {
      const currentSelected = selectedMcpServerIds.filter(id => availableMcps.some(mcp => mcp.id === id));
      if (currentSelected.length !== selectedMcpServerIds.length) {
        setSelectedMcpServerIds(currentSelected);
      }
    } else if (aiMode === "agent" && availableMcps.length === 0 && selectedMcpServerIds.length > 0) {
      clearSelectedMcpServerIds();
    }
  }, [availableMcps, aiMode, selectedMcpServerIds, setSelectedMcpServerIds, clearSelectedMcpServerIds]);

  const loadMcps = async () => {
    // console.log("MCPSelector: loadMcps called");
    const allServers = getAllConfiguredServers();

    const enabledAndConfiguredMcpsBase: Omit<IMCPServiceDisplay, 'tools' | 'toolsError'>[] = Object.entries(allServers)
      .filter(([_, serviceDetails]) => serviceDetails.enabled && serviceDetails.configured)
      .map(([key, _]) => ({
        id: key,
        name: formatMCPName(key),
      }));

    const mcpDataWithTools = enabledAndConfiguredMcpsBase.map((mcpBase) => {
      // console.log(`MCPSelector: Loading tools for MCP ${mcpBase.id}`);

      const storedTools = getServiceTools(mcpBase.id);

      const validTools: IMCPToolDisplay[] = storedTools.map(tool => ({
        name: tool.name,
        description: tool.description || ""
      }));

      // console.log(`MCPSelector: Successfully processed tools for ${mcpBase.id}:`, validTools.length);

      return {
        ...mcpBase,
        tools: validTools,
        toolsError: false
      };
    });

    // console.log("MCPSelector: Final mcpDataWithTools:", mcpDataWithTools);
    setAvailableMcps(mcpDataWithTools);

    if (mcpDataWithTools.length > 0 && !initialSelectAllDone) {
      setInitialSelectAllDone(true);
    } else if (mcpDataWithTools.length === 0) {
      if (selectedMcpServerIds.length > 0) {
        clearSelectedMcpServerIds();
      }
      setInitialSelectAllDone(false);
    }
  };

  const handleDialogOpen = () => {
    if (componentDisabled || availableMcps.length === 0) return;
    loadMcps();
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleToggleMcp = (mcpId: string) => {
    if (selectedMcpServerIds.includes(mcpId)) {
      removeSelectedMcpServerId(mcpId);
    } else {
      addSelectedMcpServerId(mcpId);
    }
  };

  const handleSelectAllToggle = () => {
    if (selectedMcpServerIds.length === availableMcps.length) {
      clearSelectedMcpServerIds();
    } else {
      setSelectedMcpServerIds(availableMcps.map(mcp => mcp.id));
    }
  };

  const chipLabel = useMemo(() => {
    if (availableMcps.length === 0) {
      return intl.formatMessage({ id: "mcp.noServicesAvailable", defaultMessage: "No MCPs" });
    }
    if (selectedMcpServerIds.length === 0) {
      return intl.formatMessage({ id: "mcp.selectServices", defaultMessage: "Select MCPs" });
    }
    if (selectedMcpServerIds.length === availableMcps.length) {
      return intl.formatMessage({ id: "mcp.allServicesSelected", defaultMessage: "All MCPs" });
    }
    if (selectedMcpServerIds.length === 1) {
      const mcp = availableMcps.find(m => m.id === selectedMcpServerIds[0]);
      return mcp?.name || intl.formatMessage({ id: "mcp.singleServiceSelected", defaultMessage: "1 MCP Selected" });
    }
    return intl.formatMessage({ id: "mcp.multipleServicesSelected" }, { count: selectedMcpServerIds.length }) || `${selectedMcpServerIds.length} MCPs Selected`;
  }, [selectedMcpServerIds, availableMcps, intl]);

  const isAllSelected = availableMcps.length > 0 && selectedMcpServerIds.length === availableMcps.length;

  if (aiMode !== "agent") {
    return null;
  }

  return (
    <>
      <Chip
        label={chipLabel}
        onClick={availableMcps.length > 0 ? handleDialogOpen : undefined}
        disabled={componentDisabled || availableMcps.length === 0}
        size="small"
        variant="outlined"
        sx={{
          height: 24,
          fontSize: "0.75rem",
          fontWeight: 500,
          borderColor: "transparent",
          color: "text.primary",
          cursor: (componentDisabled || availableMcps.length === 0) ? 'default' : 'pointer',
          opacity: (componentDisabled || availableMcps.length === 0) ? 0.6 : 1,
          maxWidth: 150,
        }}
      />
      <SelectMCPDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        availableMcps={availableMcps}
        selectedMcpIds={selectedMcpServerIds}
        handleToggleMcp={handleToggleMcp}
        handleSelectAllToggle={handleSelectAllToggle}
        isAllSelected={isAllSelected}
      />
    </>
  );
}
