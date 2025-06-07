import { IEnhancedServerModule, IGoogleCalendarConfig } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCP/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const GoogleCalendarServerModule: IEnhancedServerModule<IGoogleCalendarConfig> = {
  metadata: {
    id: "google-calendar", // Matches SERVICE_TYPE_MAPPING in MCPStore
    title: "Google Calendar MCP Server",
    description: "MCP server for Google Calendar integration. Requires a custom server build.",
    version: "1.2.0", // Placeholder
    icon: "CalendarToday", // Example Material UI icon name, adjust as needed
    sourceUrl: "https://github.com/nspady/google-calendar-mcp?tab=readme-ov-file",
    platforms: ["windows", "macos", "linux"], // Assuming it's cross-platform via Node.js
    category: "productivity"
  },

  defaultConfig: {
    indexPath: "", // e.g., "/path/to/your/google-calendar-mcp/build/index.js"
  },

  isConfigured: (config: IGoogleCalendarConfig) => {
    return !!config.indexPath;
  },

  createClientConfig: (config: IGoogleCalendarConfig, homedir: string) => ({
    enabled: true, // This should ideally reflect the actual enabled state from the store
    command: "node",
    args: [config.indexPath],
    // No 'env' as per previous discussion
    clientName: "google-calendar-client",
    clientVersion: "1..0"
  }),

  getDialogFields: (): Field[] => [
    {
      key: "indexPath",
      label: "Path to index.js",
      type: "text", // Or perhaps a file picker if you have that component type
      required: true,
      placeholder: "/path/to/your/google-calendar-mcp/build/index.js",
      description: "The absolute path to the server's main executable file (index.js). Authentication is handled by the server.",
      descriptionLink: {
        text: "View Authentication Setup Guide",
        url: "https://github.com/nspady/google-calendar-mcp?tab=readme-ov-file#authentication"
      }
    }
  ],

  validateConfig: (config: IGoogleCalendarConfig) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!config.indexPath) {
      errors.indexPath = "Path to index.js is required";
      isValid = false;
    }
    // Add more specific path validation if needed (e.g., check if it looks like a path)

    return { isValid, errors };
  },

  // Placeholder store interaction methods.
  // These would need to be properly implemented to interact with useMCPStore.
  setEnabled: async (enabled: boolean) => { console.log(`GoogleCalendar enabled: ${enabled}`) },
  setConfig: (config: Partial<IGoogleCalendarConfig>) => { console.log("GoogleCalendar config set:", config) },
  setAutoApproved: (autoApproved: boolean) => { console.log(`GoogleCalendar autoApproved: ${autoApproved}`) },
  getEnabled: () => false,
  getConfig: () => ({ indexPath: "" }),
  getConfigured: () => false,
  getAutoApproved: () => false
};

// Register the module with the key used in MCPStore's SERVER_REGISTRY
serverRegistry.register("googleCalendar", GoogleCalendarServerModule);
