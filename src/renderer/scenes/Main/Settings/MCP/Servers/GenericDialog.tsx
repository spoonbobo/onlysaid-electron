import { useMemo } from "react";
import MCPDialog from "@/renderer/components/Dialog/MCP/MCPDialog";
import { serverRegistry } from "../Registry/ServerRegistry";

interface GenericDialogProps {
  open: boolean;
  serverKey: string;
  initialData?: Record<string, any>;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
}

const GenericDialog = ({ open, serverKey, initialData, onClose, onSave }: GenericDialogProps) => {
  const serverModule = useMemo(() => serverRegistry.get(serverKey), [serverKey]);

  if (!serverModule) {
    console.warn(`Server module not found: ${serverKey}`);
    return null;
  }

  // Use custom dialog if provided
  if (serverModule.customDialog) {
    const CustomDialog = serverModule.customDialog;
    return (
      <CustomDialog
        open={open}
        initialData={initialData}
        onClose={onClose}
        onSave={onSave}
      />
    );
  }

  // Use generic dialog with module-defined fields
  if (serverModule.getDialogFields) {
    const fields = serverModule.getDialogFields();

    return (
      <MCPDialog
        open={open}
        onClose={onClose}
        onSave={onSave}
        title={`${serverModule.metadata.title} Configuration`}
        fields={fields}
        serviceType={serverModule.metadata.id}
        initialData={initialData}
      />
    );
  }

  console.warn(`No dialog configuration found for server: ${serverKey}`);
  return null;
};

export default GenericDialog;
