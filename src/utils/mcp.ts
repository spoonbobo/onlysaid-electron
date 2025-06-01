import { useMCPStore } from "@/renderer/stores/MCP/MCPStore";

export const SERVICE_TYPE_MAPPING: Record<string, string> = {
  tavily: 'tavily',
  weather: 'weather',
  location: 'location',
  weatherForecast: 'weather-forecast',
  nearbySearch: 'nearby-search',
  web3Research: 'web3-research',
  doorDash: 'doordash',
  whatsApp: 'whatsapp',
  github: 'github',
  ipLocation: 'ip-location',
  airbnb: 'airbnb',
  linkedIn: 'linkedin',
  googleCalendar: 'google-calendar',
  ms365: 'ms365',
  msTeams: 'ms-teams',
  lara: 'lara-translate',
  chess: 'chess'
};

export const getServiceTools = (serverKey: string) => {
  const serviceKey = SERVICE_TYPE_MAPPING[serverKey] || serverKey;
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
