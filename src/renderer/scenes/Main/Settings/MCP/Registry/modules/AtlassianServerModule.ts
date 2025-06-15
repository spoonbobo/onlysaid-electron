import React from "react";
import { IEnhancedServerModule, IAtlassianConfig } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCP/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const AtlassianServerModule: IEnhancedServerModule<IAtlassianConfig> = {
  metadata: {
    id: "atlassian",
    title: "Atlassian MCP Server",
    description: "MCP server for Atlassian tools (Confluence, Jira) integration with comprehensive read/write operations.",
    version: "0.11.2",
    icon: "Business",
    sourceUrl: "https://github.com/sooperset/mcp-atlassian",
    platforms: ["windows", "macos", "linux"],
    category: "productivity"
  },

  defaultConfig: {
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
  },

  isConfigured: (config: IAtlassianConfig) => {
    const hasBasicConfig = !!config.jiraUrl || !!config.confluenceUrl;
    
    if (config.authType === 'cloud') {
      return hasBasicConfig && !!config.oauthClientId && !!config.oauthClientSecret && !!config.cloudId;
    } else {
      return hasBasicConfig && (
        (!!config.username && !!config.apiToken) || 
        !!config.personalAccessToken
      );
    }
  },

  createClientConfig: (config: IAtlassianConfig, homedir: string) => {
    const env: Record<string, string> = {};

    if (config.jiraUrl) env.JIRA_URL = config.jiraUrl;
    if (config.confluenceUrl) env.CONFLUENCE_URL = config.confluenceUrl;

    if (config.authType === 'cloud') {
      if (config.oauthClientId) env.ATLASSIAN_OAUTH_CLIENT_ID = config.oauthClientId;
      if (config.oauthClientSecret) env.ATLASSIAN_OAUTH_CLIENT_SECRET = config.oauthClientSecret;
      if (config.oauthRedirectUri) env.ATLASSIAN_OAUTH_REDIRECT_URI = config.oauthRedirectUri;
      if (config.oauthScope) env.ATLASSIAN_OAUTH_SCOPE = config.oauthScope;
      if (config.cloudId) env.ATLASSIAN_OAUTH_CLOUD_ID = config.cloudId;
    } else {
      if (config.personalAccessToken) {
        env.ATLASSIAN_PAT = config.personalAccessToken;
      } else if (config.username && config.apiToken) {
        env.ATLASSIAN_USERNAME = config.username;
        env.ATLASSIAN_API_TOKEN = config.apiToken;
      }
    }

    if (config.sslVerify !== undefined) {
      env.JIRA_SSL_VERIFY = config.sslVerify.toString();
      env.CONFLUENCE_SSL_VERIFY = config.sslVerify.toString();
    }
    if (config.readOnlyMode) env.READ_ONLY_MODE = "true";
    if (config.enabledTools) env.ENABLED_TOOLS = config.enabledTools;

    return {
      enabled: true,
      command: "uvx",
      args: ["mcp-atlassian"],
      env,
      clientName: "mcp-atlassian",
      clientVersion: "1.0.0"
    };
  },

  getDialogFields: (): Field[] => [
    {
      key: "authType",
      label: "Authentication Type",
      type: "select",
      required: true,
      options: ["cloud", "server"],
      description: "Choose authentication method: Cloud (OAuth 2.0) or Server/Data Center (PAT)"
    },
    {
      key: "jiraUrl",
      label: "Jira URL",
      type: "text",
      required: false,
      placeholder: "https://your-company.atlassian.net",
      description: "Your Jira instance URL"
    },
    {
      key: "confluenceUrl",
      label: "Confluence URL",
      type: "text",
      required: false,
      placeholder: "https://your-company.atlassian.net/wiki",
      description: "Your Confluence instance URL"
    },
    {
      key: "oauthClientId",
      label: "OAuth Client ID",
      type: "text",
      required: false,
      description: "OAuth app client ID (Cloud only)"
    },
    {
      key: "oauthClientSecret",
      label: "OAuth Client Secret",
      type: "password",
      required: false,
      description: "OAuth app client secret (Cloud only)"
    },
    {
      key: "cloudId",
      label: "Cloud ID",
      type: "text",
      required: false,
      description: "Your Atlassian Cloud ID (Cloud only)"
    },
    {
      key: "personalAccessToken",
      label: "Personal Access Token",
      type: "password",
      required: false,
      description: "Personal Access Token (Server/Data Center)"
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: false,
      description: "Username for basic auth (Server/Data Center)"
    },
    {
      key: "apiToken",
      label: "API Token",
      type: "password",
      required: false,
      description: "API Token for basic auth (Server/Data Center)"
    }
  ],

  validateConfig: (config: IAtlassianConfig) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    // At least one URL is required
    if (!config.jiraUrl && !config.confluenceUrl) {
      errors.jiraUrl = "At least one of Jira URL or Confluence URL is required";
      errors.confluenceUrl = "At least one of Jira URL or Confluence URL is required";
      isValid = false;
    }

    // Validate URLs format
    if (config.jiraUrl && !config.jiraUrl.startsWith('http')) {
      errors.jiraUrl = "Jira URL must start with http:// or https://";
      isValid = false;
    }
    if (config.confluenceUrl && !config.confluenceUrl.startsWith('http')) {
      errors.confluenceUrl = "Confluence URL must start with http:// or https://";
      isValid = false;
    }

    // Validate authentication based on type
    if (config.authType === 'cloud') {
      if (!config.oauthClientId) {
        errors.oauthClientId = "OAuth Client ID is required for Cloud authentication";
        isValid = false;
      }
      if (!config.oauthClientSecret) {
        errors.oauthClientSecret = "OAuth Client Secret is required for Cloud authentication";
        isValid = false;
      }
      if (!config.cloudId) {
        errors.cloudId = "Cloud ID is required for Cloud authentication";
        isValid = false;
      }
    } else {
      // Server/Data Center
      if (!config.personalAccessToken && (!config.username || !config.apiToken)) {
        errors.personalAccessToken = "Either Personal Access Token or Username+API Token is required";
        errors.username = "Either Personal Access Token or Username+API Token is required";
        errors.apiToken = "Either Personal Access Token or Username+API Token is required";
        isValid = false;
      }
    }

    return { isValid, errors };
  },

  setEnabled: async (enabled: boolean) => { },
  setConfig: (config: Partial<IAtlassianConfig>) => { },
  setAutoApproved: (autoApproved: boolean) => { },
  getEnabled: () => false,
  getConfig: () => ({
    jiraUrl: "",
    confluenceUrl: "",
    authType: "cloud" as const,
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
  }),
  getConfigured: () => false,
  getAutoApproved: () => false
};

serverRegistry.register("atlassian", AtlassianServerModule);
