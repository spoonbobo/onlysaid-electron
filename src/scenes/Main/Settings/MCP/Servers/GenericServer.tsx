import { useMemo, useState } from "react";
import { Box } from "@mui/material";
import * as Icons from "@mui/icons-material";
import ServerCard from "./ServerCard";
import GenericDialog from "./GenericDialog";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import { serverRegistry } from "../Registry/ServerRegistry";
import { IGenericServerProps } from "@/../../types/MCP/server";

const GenericServer = ({
  serverKey,
  onReset,
  isAutoApproved = false,
  onAutoApprovalToggle
}: IGenericServerProps) => {
  const { setServerEnabled, setServerConfig, isServerConfigured, getAllConfiguredServers, initializeClient } = useMCPStore();
  const servers = getAllConfiguredServers();
  const [dialogOpen, setDialogOpen] = useState(false);

  const serverModule = useMemo(() => serverRegistry.get(serverKey), [serverKey]);

  if (!serverModule) {
    console.warn(`Server module not found: ${serverKey}`);
    return null;
  }

  const serverEnabled = servers[serverKey]?.enabled || false;
  const isConfigured = isServerConfigured(serverKey);
  const currentConfig = servers[serverKey]?.config || serverModule.defaultConfig;

  const handleToggle = (enabled: boolean) => {
    setServerEnabled(serverKey, enabled);
  };

  const handleAutoApprovalToggle = (autoApproved: boolean) => {
    if (onAutoApprovalToggle) {
      onAutoApprovalToggle(autoApproved);
    }
  };

  const handleConfigure = () => {
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleDialogSave = async (data: Record<string, any>) => {
    setServerConfig(serverKey, data);

    if (serverEnabled) {
      await initializeClient(serverModule.metadata.id);
    }

    setDialogOpen(false);
  };

  // Get icon component dynamically
  const IconComponent = useMemo(() => {
    if (serverModule.metadata.icon && (Icons as any)[serverModule.metadata.icon]) {
      return (Icons as any)[serverModule.metadata.icon];
    }
    return null;
  }, [serverModule.metadata.icon]);

  return (
    <>
      <ServerCard
        title={serverModule.metadata.title}
        description={serverModule.metadata.description}
        version={serverModule.metadata.version}
        isEnabled={serverEnabled}
        isConfigured={isConfigured}
        isAutoApproved={isAutoApproved || false}
        onToggle={handleToggle}
        onAutoApprovalToggle={handleAutoApprovalToggle}
        onConfigure={handleConfigure}
        onReset={onReset}
        icon={IconComponent ? <IconComponent /> : undefined}
        sourceUrl={serverModule.metadata.sourceUrl}
      />

      <GenericDialog
        open={dialogOpen}
        serverKey={serverKey}
        initialData={currentConfig}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
      />
    </>
  );
};

export default GenericServer;
