import React from "react";
import { IEnhancedServerModule, IMoodleConfig } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCP/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const MoodleServerModule: IEnhancedServerModule<IMoodleConfig> = {
  metadata: {
    id: "moodle",
    title: "Moodle MCP Server",
    description: "MCP server for Moodle platform integration to manage courses, students, assignments, and quizzes.",
    version: "unknown",
    icon: "School",
    sourceUrl: "https://github.com/peancor/moodle-mcp-server",
    platforms: ["windows", "macos", "linux"],
    category: "learning"
  },

  defaultConfig: {
    apiUrl: "",
    apiToken: "",
    courseId: ""
  },

  isConfigured: (config: IMoodleConfig) => {
    return !!(config.apiUrl && config.apiToken && config.courseId);
  },

  createClientConfig: (config: IMoodleConfig, homedir: string) => ({
    enabled: true,
    command: "npx",
    args: ["-y", "moodle-mcp-server@latest"],
    env: {
      MOODLE_API_URL: config.apiUrl,
      MOODLE_API_TOKEN: config.apiToken,
      MOODLE_COURSE_ID: config.courseId
    },
    clientName: "moodle-mcp-server",
    clientVersion: "unknown"
  }),

  getDialogFields: (): Field[] => [
    {
      key: "apiUrl",
      label: "Moodle API URL",
      type: "text",
      required: true,
      description: "The Moodle webservice REST API endpoint URL",
      placeholder: "https://your-moodle.com/webservice/rest/server.php"
    },
    {
      key: "apiToken",
      label: "Moodle API Token",
      type: "password",
      required: true,
      description: "The API token for accessing Moodle webservices",
      descriptionLink: {
        text: "How to get API Token",
        url: "https://docs.moodle.org/en/Using_web_services#How_to_get_a_user_token"
      }
    },
    {
      key: "courseId",
      label: "Course ID",
      type: "text",
      required: true,
      description: "The ID of the Moodle course to manage",
      placeholder: "1"
    }
  ],

  validateConfig: (config: IMoodleConfig) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!config.apiUrl) {
      errors.apiUrl = "Moodle API URL is required";
      isValid = false;
    } else if (!config.apiUrl.includes('/webservice/rest/server.php')) {
      errors.apiUrl = "API URL should end with '/webservice/rest/server.php'";
      isValid = false;
    }

    if (!config.apiToken) {
      errors.apiToken = "Moodle API Token is required";
      isValid = false;
    }

    if (!config.courseId) {
      errors.courseId = "Course ID is required";
      isValid = false;
    } else if (!/^\d+$/.test(config.courseId)) {
      errors.courseId = "Course ID must be a number";
      isValid = false;
    }

    return { isValid, errors };
  },

  setEnabled: async (enabled: boolean) => { },
  setConfig: (config: Partial<IMoodleConfig>) => { },
  setAutoApproved: (autoApproved: boolean) => { },
  getEnabled: () => false,
  getConfig: () => ({ apiUrl: "", apiToken: "", courseId: "" }),
  getConfigured: () => false,
  getAutoApproved: () => false
};

serverRegistry.register("moodle", MoodleServerModule);
