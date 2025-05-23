import { useState, useEffect, useMemo } from "react";
import { Chip } from "@mui/material";
import { useIntl } from "react-intl";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import { useMCPSettingsStore } from "@/stores/MCP/MCPSettingsStore";
import SelectMCPDialog, { IMCPServiceDisplay, IMCPToolDisplay } from "@/components/Dialog/MCP/SelectMCPDialog";
import { useLLMConfigurationStore } from "@/stores/LLM/LLMConfiguration";
import { useMCPClientStore } from "@/stores/MCP/MCPClient";

interface MCPSelectorProps {
  disabled?: boolean;
}

const formatMCPName = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
    .replace(/Category$/, '') // Remove "Category" suffix if present
    .trim();
};

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
    console.log("MCPSelector: loadMcps called");
    const allServers = getAllConfiguredServers();
    const enabledAndConfiguredMcpsBase: Omit<IMCPServiceDisplay, 'tools' | 'toolsError'>[] = Object.entries(allServers)
      .filter(([_, serviceDetails]) => serviceDetails.enabled && serviceDetails.configured)
      .map(([key, _]) => ({
        id: key,
        name: formatMCPName(key),
      }));

    const mcpDataWithTools = await Promise.all(
      enabledAndConfiguredMcpsBase.map(async (mcpBase) => {
        console.log(`MCPSelector: Loading tools for MCP ${mcpBase.id}`);
        try {
          const toolsResultWrapper = await ListMCPTool(mcpBase.id) as { success: boolean, data?: { tools?: any[] }, error?: string }; // More specific type
          let validTools: IMCPToolDisplay[] = [];
          let encounteredError = false;

          // Check if the call was successful and data.tools exists and is an array
          if (toolsResultWrapper && toolsResultWrapper.success && toolsResultWrapper.data && Array.isArray(toolsResultWrapper.data.tools)) {
            validTools = (toolsResultWrapper.data.tools as any[])
              .filter(tool => tool && typeof tool.name === 'string')
              .map(tool => ({
                name: tool.name,
                description: typeof tool.description === 'string' ? tool.description : ""
              }));
            console.log(`MCPSelector: Successfully processed tools for ${mcpBase.id}:`, validTools.length);
          } else {
            // Handle cases where tools are not in the expected format or call wasn't successful
            console.warn(`MCPSelector: Tools for MCP ${mcpBase.id} not in expected format or call failed. Wrapper:`, toolsResultWrapper);
            encounteredError = true;
            // If there's an error message in the wrapper, log it
            if (toolsResultWrapper && toolsResultWrapper.error) {
              console.error(`MCPSelector: Error from ListMCPTool for ${mcpBase.id}: ${toolsResultWrapper.error}`);
            }
          }
          return { ...mcpBase, tools: validTools, toolsError: encounteredError };
        } catch (error) {
          console.error(`MCPSelector: Exception caught while loading tools for MCP ${mcpBase.id}:`, error);
          return { ...mcpBase, tools: [], toolsError: true };
        }
      })
    );
    console.log("MCPSelector: Final mcpDataWithTools:", mcpDataWithTools);
    setAvailableMcps(mcpDataWithTools);

    if (mcpDataWithTools.length > 0 && !initialSelectAllDone) {
      if (selectedMcpServerIds.length === 0) {
        setSelectedMcpServerIds(mcpDataWithTools.map(mcp => mcp.id));
      }
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