import { toast } from "@/utils/toast";
import type { IServerModule, IAtlassianConfig, IAtlassianState } from "@/../../types/MCP/server";

export const createAtlassianServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IAtlassianConfig> => {

  const defaultConfig: IAtlassianConfig = {
    jiraUrl: "",
    confluenceUrl: "",
    authType: "cloud",
    oauthClientId: "",
    oauthClientSecret: "",
    oauthRedirectUri: "http://localhost:8080/callback",
    oauthScope: "read:jira-work write:jira-work read:confluence-content.all write:confluence-content offline_access",
    cloudId: "",
    username: "",
    apiToken: "",
    personalAccessToken: "",
    sslVerify: true,
    readOnlyMode: false,
    enabledTools: ""
  };

  const isConfigured = (config: IAtlassianConfig): boolean => {
    const hasBasicConfig = !!config.jiraUrl || !!config.confluenceUrl;
    
    if (config.authType === 'cloud') {
      return hasBasicConfig && !!config.oauthClientId && !!config.oauthClientSecret && !!config.cloudId;
    } else {
      // Server/Data Center
      return hasBasicConfig && (
        (!!config.username && !!config.apiToken) || 
        !!config.personalAccessToken
      );
    }
  };

  const createClientConfig = (config: IAtlassianConfig, homedir: string) => {
    const env: Record<string, string> = {};

    // Required URLs
    if (config.jiraUrl) {
      env.JIRA_URL = config.jiraUrl;
    }
    if (config.confluenceUrl) {
      env.CONFLUENCE_URL = config.confluenceUrl;
    }

    // Authentication based on type
    if (config.authType === 'cloud') {
      // OAuth 2.0 for Cloud
      if (config.oauthClientId) env.ATLASSIAN_OAUTH_CLIENT_ID = config.oauthClientId;
      if (config.oauthClientSecret) env.ATLASSIAN_OAUTH_CLIENT_SECRET = config.oauthClientSecret;
      if (config.oauthRedirectUri) env.ATLASSIAN_OAUTH_REDIRECT_URI = config.oauthRedirectUri;
      if (config.oauthScope) env.ATLASSIAN_OAUTH_SCOPE = config.oauthScope;
      if (config.cloudId) env.ATLASSIAN_OAUTH_CLOUD_ID = config.cloudId;
    } else {
      // Server/Data Center authentication
      if (config.personalAccessToken) {
        env.ATLASSIAN_PAT = config.personalAccessToken;
      } else if (config.username && config.apiToken) {
        env.ATLASSIAN_USERNAME = config.username;
        env.ATLASSIAN_API_TOKEN = config.apiToken;
      }
    }

    // Optional settings
    if (config.sslVerify !== undefined) {
      env.JIRA_SSL_VERIFY = config.sslVerify.toString();
      env.CONFLUENCE_SSL_VERIFY = config.sslVerify.toString();
    }
    if (config.readOnlyMode) {
      env.READ_ONLY_MODE = "true";
    }
    if (config.enabledTools) {
      env.ENABLED_TOOLS = config.enabledTools;
    }

    return {
      enabled: getEnabled(),
      command: "uvx",
      args: ["mcp-atlassian"],
      env,
      clientName: "mcp-atlassian",
      clientVersion: "1.0.0"
    };
  };

  const setEnabled = async (enabled: boolean) => {
    if (enabled && !isConfigured(getConfig())) return;

    set((state: any) => ({
      ...state,
      atlassianEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("atlassian");
      if (!result.success) {
        toast.error(`Atlassian service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          atlassianEnabled: false
        }));
      } else {
        toast.success("Atlassian service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<IAtlassianConfig>) => {
    set((state: any) => ({
      ...state,
      atlassianConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.atlassianEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.atlassianConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      atlassianAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.atlassianAutoApproved || false;
  };

  return {
    defaultConfig,
    isConfigured,
    createClientConfig,
    setEnabled,
    setConfig,
    getEnabled,
    getConfig,
    getConfigured,
    setAutoApproved,
    getAutoApproved
  };
};

// Export for backward compatibility
export const isAtlassianConfigured = (config: IAtlassianConfig): boolean => {
  const hasBasicConfig = !!config.jiraUrl || !!config.confluenceUrl;
  
  if (config.authType === 'cloud') {
    return hasBasicConfig && !!config.oauthClientId && !!config.oauthClientSecret && !!config.cloudId;
  } else {
    return hasBasicConfig && (
      (!!config.username && !!config.apiToken) || 
      !!config.personalAccessToken
    );
  }
};
