import { useMCPStore } from "@/renderer/stores/MCP/MCPStore";

export const SERVICE_TYPE_MAPPING = useMCPStore.getState().getServiceTypeMapping();

export const getServiceTools = (serverKey: string) => {
  const mapping = useMCPStore.getState().getServiceTypeMapping();
  const serviceKey = mapping[serverKey] || serverKey;
  return useMCPStore.getState().getServiceTools(serviceKey);
};

export const formatMCPName = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
    .replace(/Category$/, '')
    .trim();
};
