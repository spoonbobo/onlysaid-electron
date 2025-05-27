import { HelpItem } from "../../../components/Dialog/Help/HelpDialog";

interface HelpContent {
  title: string;
  items: HelpItem[];
}

// General help when no context is selected
export const generalHelp: HelpContent = {
  title: "General Help",
  items: [
    {
      title: "Getting Started",
      description: "Select a workspace or create a new one to get started.",
      shortcut: "Ctrl+N"
    },
    {
      title: "Navigation",
      description: "Use the sidebar to navigate between different sections."
    }
  ]
};

// Workspace context help
export const workspaceHelp: HelpContent = {
  title: "Workspace Help",
  items: [
    {
      title: "Manage Files",
      description: "Create, delete and organize your workspace files.",
      shortcut: "Ctrl+F"
    },
    {
      title: "Chatrooms",
      description: "Create a chatroom to collaborate with others or AI assistants.",
      shortcut: "Ctrl+Shift+C"
    },
    {
      title: "Quick Access",
      description: "Pin frequently used files or folders to the quick access menu."
    }
  ]
};

// Home context help
export const homeHelp: HelpContent = {
  title: "Home Help",
  items: [
    {
      title: "Agent Chat",
      description: "Chat with AI agents for assistance with various tasks.",
      shortcut: "Ctrl+A"
    },
    {
      title: "Settings",
      description: "Configure your preferences and account settings.",
      shortcut: "Ctrl+,"
    },
    {
      title: "Recent Items",
      description: "View and access your recently used items."
    }
  ]
};

// Settings context help
export const settingsHelp: HelpContent = {
  title: "Settings Help",
  items: [
    {
      title: "User Profile",
      description: "Update your profile information and preferences."
    },
    {
      title: "Appearance",
      description: "Customize the application theme and layout."
    },
    {
      title: "API Keys",
      description: "Manage your API keys for external services."
    }
  ]
};

// Default help
export const defaultHelp: HelpContent = {
  title: "Help",
  items: [
    {
      title: "Getting Started",
      description: "Select a workspace or create a new one to get started."
    },
    {
      title: "Support",
      description: "Contact support for additional assistance."
    }
  ]
};

// Function to get the appropriate help content based on context type
export function getHelpContentByContextType(contextType: string | undefined): HelpContent {
  if (!contextType) {
    return generalHelp;
  }

  switch (contextType) {
    case "workspace":
      return workspaceHelp;
    case "home":
      return homeHelp;
    case "settings":
      return settingsHelp;
    default:
      return defaultHelp;
  }
}
