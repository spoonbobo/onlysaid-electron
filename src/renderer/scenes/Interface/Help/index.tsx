import { HelpItem } from "../../../components/Dialog/Help/HelpDialog";
import { useIntl } from "react-intl";

interface HelpContent {
  title: string;
  items: HelpItem[];
}

// Hook to get help content with translations
export function useHelpContent() {
  const intl = useIntl();

  // General help when no context is selected
  const generalHelp: HelpContent = {
    title: intl.formatMessage({ id: "help.general.title", defaultMessage: "General Help" }),
    items: [
      {
        title: intl.formatMessage({ id: "help.general.gettingStarted.title", defaultMessage: "Getting Started" }),
        description: intl.formatMessage({ id: "help.general.gettingStarted.description", defaultMessage: "Select a workspace or create a new one to get started." }),
        shortcut: "Ctrl+N"
      },
      {
        title: intl.formatMessage({ id: "help.general.navigation.title", defaultMessage: "Navigation" }),
        description: intl.formatMessage({ id: "help.general.navigation.description", defaultMessage: "Use the sidebar to navigate between different sections." })
      }
    ]
  };

  // Workspace context help
  const workspaceHelp: HelpContent = {
    title: intl.formatMessage({ id: "help.workspace.title", defaultMessage: "Workspace Help" }),
    items: [
      {
        title: intl.formatMessage({ id: "help.workspace.manageFiles.title", defaultMessage: "Manage Files" }),
        description: intl.formatMessage({ id: "help.workspace.manageFiles.description", defaultMessage: "Create, delete and organize your workspace files." }),
        shortcut: "Ctrl+F"
      },
      {
        title: intl.formatMessage({ id: "help.workspace.chatrooms.title", defaultMessage: "Chatrooms" }),
        description: intl.formatMessage({ id: "help.workspace.chatrooms.description", defaultMessage: "Create a chatroom to collaborate with others or AI assistants." }),
        shortcut: "Ctrl+Shift+C"
      },
      {
        title: intl.formatMessage({ id: "help.workspace.quickAccess.title", defaultMessage: "Quick Access" }),
        description: intl.formatMessage({ id: "help.workspace.quickAccess.description", defaultMessage: "Pin frequently used files or folders to the quick access menu." })
      }
    ]
  };

  // Home context help
  const homeHelp: HelpContent = {
    title: intl.formatMessage({ id: "help.home.title", defaultMessage: "Home Help" }),
    items: [
      {
        title: intl.formatMessage({ id: "help.home.agentChat.title", defaultMessage: "Agent Chat" }),
        description: intl.formatMessage({ id: "help.home.agentChat.description", defaultMessage: "Chat with AI agents for assistance with various tasks." }),
        shortcut: "Ctrl+A"
      },
      {
        title: intl.formatMessage({ id: "help.home.settings.title", defaultMessage: "Settings" }),
        description: intl.formatMessage({ id: "help.home.settings.description", defaultMessage: "Configure your preferences and account settings." }),
        shortcut: "Ctrl+,"
      },
      {
        title: intl.formatMessage({ id: "help.home.recentItems.title", defaultMessage: "Recent Items" }),
        description: intl.formatMessage({ id: "help.home.recentItems.description", defaultMessage: "View and access your recently used items." })
      }
    ]
  };

  // Settings context help
  const settingsHelp: HelpContent = {
    title: intl.formatMessage({ id: "help.settings.title", defaultMessage: "Settings Help" }),
    items: [
      {
        title: intl.formatMessage({ id: "help.settings.userProfile.title", defaultMessage: "User Profile" }),
        description: intl.formatMessage({ id: "help.settings.userProfile.description", defaultMessage: "Update your profile information and preferences." })
      },
      {
        title: intl.formatMessage({ id: "help.settings.appearance.title", defaultMessage: "Appearance" }),
        description: intl.formatMessage({ id: "help.settings.appearance.description", defaultMessage: "Customize the application theme and layout." })
      },
      {
        title: intl.formatMessage({ id: "help.settings.apiKeys.title", defaultMessage: "API Keys" }),
        description: intl.formatMessage({ id: "help.settings.apiKeys.description", defaultMessage: "Manage your API keys for external services." })
      }
    ]
  };

  // Default help
  const defaultHelp: HelpContent = {
    title: intl.formatMessage({ id: "help.default.title", defaultMessage: "Help" }),
    items: [
      {
        title: intl.formatMessage({ id: "help.default.gettingStarted.title", defaultMessage: "Getting Started" }),
        description: intl.formatMessage({ id: "help.default.gettingStarted.description", defaultMessage: "Select a workspace or create a new one to get started." })
      },
      {
        title: intl.formatMessage({ id: "help.default.support.title", defaultMessage: "Support" }),
        description: intl.formatMessage({ id: "help.default.support.description", defaultMessage: "Contact support for additional assistance." })
      }
    ]
  };

  // Function to get the appropriate help content based on context type
  const getHelpContentByContextType = (contextType: string | undefined): HelpContent => {
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
  };

  return {
    generalHelp,
    workspaceHelp,
    homeHelp,
    settingsHelp,
    defaultHelp,
    getHelpContentByContextType
  };
}
