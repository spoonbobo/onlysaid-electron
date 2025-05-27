import { useMCPStore } from "@/renderer/stores/MCP/MCPStore";
import { ComponentType } from "react";
import { serverRegistry } from "../Registry/ServerRegistry";
import { IConfigurableComponentProps, IEnhancedComponentProps } from "@/../../types/MCP/server";

// Create the HOC
const withReset = <P extends IConfigurableComponentProps>(
  WrappedComponent: ComponentType<P>,
  defaultServerKey: string
) => {
  const EnhancedComponent = (props: Omit<P, keyof IEnhancedComponentProps> & IEnhancedComponentProps) => {
    const {
      setServerEnabled,
      setServerConfig,
      setServerAutoApproved,
      getServerAutoApproved,
      getAllConfiguredServers,
      isServerConfigured
    } = useMCPStore();

    // Use serverKey from props if available, otherwise use default
    const serverKey = (props as any).serverKey || defaultServerKey;

    const servers = getAllConfiguredServers();
    const serverModule = serverRegistry.get(serverKey);

    const handleReset = () => {
      if (serverModule) {
        // Reset to default config from module
        setServerConfig(serverKey, serverModule.defaultConfig);
        setServerEnabled(serverKey, false);
        setServerAutoApproved(serverKey, false);
      }
    };

    const handleAutoApprovalToggle = (autoApproved: boolean) => {
      setServerAutoApproved(serverKey, autoApproved);
    };

    const isAutoApproved = getServerAutoApproved(serverKey);

    // Enhanced component with reset and auto-approval functionality
    return (
      <WrappedComponent
        {...props as P}
        onReset={handleReset}
        isAutoApproved={isAutoApproved}
        onAutoApprovalToggle={handleAutoApprovalToggle}
      />
    );
  };

  return EnhancedComponent;
};

export default withReset;
