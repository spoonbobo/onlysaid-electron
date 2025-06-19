import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { INotificationData, INotificationCounts } from "@/../../types/Notifications/notification";

interface NotificationStore {
  notifications: INotificationData[];
  counts: INotificationCounts;
  enableMockNotifications: boolean; // Flag to enable/disable mock notifications

  // Core methods
  addNotification: (notification: Omit<INotificationData, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: (workspaceId?: string, homeSection?: string, workspaceSection?: string, homeContext?: string, workspaceContext?: string) => void;
  removeNotification: (notificationId: string) => void;
  clearAllNotifications: (workspaceId?: string, homeSection?: string, workspaceSection?: string, homeContext?: string, workspaceContext?: string) => void;

  // Count methods
  getHomeNotificationCount: () => number;
  getHomeSectionNotificationCount: (section: string) => number;
  getHomeContextNotificationCount: (section: string, context: string) => number;
  getWorkspaceNotificationCount: (workspaceId: string) => number;
  getWorkspaceSectionNotificationCount: (workspaceId: string, section: string) => number;
  getWorkspaceContextNotificationCount: (workspaceId: string, section: string, context: string) => number;
  hasHomeNotifications: () => boolean;
  hasWorkspaceNotifications: (workspaceId: string) => boolean;
  hasHomeContextNotifications: (section: string, context: string) => boolean;
  hasWorkspaceContextNotifications: (workspaceId: string, section: string, context: string) => boolean;
  updateCounts: () => void;

  // Mock control
  setMockNotifications: (enabled: boolean) => void;

  // Dummy methods for development
  addDummyHomeNotification: (section?: string, context?: string) => void;
  addDummyWorkspaceNotification: (workspaceId: string, section?: string, context?: string) => void;
  resetAllNotifications: () => void;
}

// Add a flag to prevent recursive count updates
let isUpdatingCounts = false;

const calculateCounts = (notifications: INotificationData[]): INotificationCounts => {
  // Count unread notifications for home (no workspaceId)
  const homeCount = notifications.filter(
    notification => !notification.read && !notification.workspaceId
  ).length;

  // Count unread notifications per home section
  const homeSectionCounts: Record<string, number> = {};
  notifications
    .filter(notification => !notification.read && !notification.workspaceId && notification.homeSection)
    .forEach(notification => {
      const section = notification.homeSection!;
      homeSectionCounts[section] = (homeSectionCounts[section] || 0) + 1;
    });

  // Count unread notifications per home context
  const homeContextCounts: Record<string, Record<string, number>> = {};
  notifications
    .filter(notification => !notification.read && !notification.workspaceId && notification.homeSection && notification.homeContext)
    .forEach(notification => {
      const section = notification.homeSection!;
      const context = notification.homeContext!;

      if (!homeContextCounts[section]) {
        homeContextCounts[section] = {};
      }
      homeContextCounts[section][context] = (homeContextCounts[section][context] || 0) + 1;
    });

  // Count unread notifications per workspace
  const workspaceCounts: Record<string, number> = {};
  notifications
    .filter(notification => !notification.read && notification.workspaceId)
    .forEach(notification => {
      const workspaceId = notification.workspaceId!;
      workspaceCounts[workspaceId] = (workspaceCounts[workspaceId] || 0) + 1;
    });

  // Count unread notifications per workspace section
  const workspaceSectionCounts: Record<string, Record<string, number>> = {};
  notifications
    .filter(notification => !notification.read && notification.workspaceId && notification.workspaceSection)
    .forEach(notification => {
      const workspaceId = notification.workspaceId!;
      const section = notification.workspaceSection!;

      if (!workspaceSectionCounts[workspaceId]) {
        workspaceSectionCounts[workspaceId] = {};
      }
      workspaceSectionCounts[workspaceId][section] = (workspaceSectionCounts[workspaceId][section] || 0) + 1;
    });

  // Count unread notifications per workspace context
  const workspaceContextCounts: Record<string, Record<string, Record<string, number>>> = {};
  notifications
    .filter(notification => !notification.read && notification.workspaceId && notification.workspaceSection && notification.workspaceContext)
    .forEach(notification => {
      const workspaceId = notification.workspaceId!;
      const section = notification.workspaceSection!;
      const context = notification.workspaceContext!;

      if (!workspaceContextCounts[workspaceId]) {
        workspaceContextCounts[workspaceId] = {};
      }
      if (!workspaceContextCounts[workspaceId][section]) {
        workspaceContextCounts[workspaceId][section] = {};
      }
      workspaceContextCounts[workspaceId][section][context] = (workspaceContextCounts[workspaceId][section][context] || 0) + 1;
    });

  return {
    home: homeCount,
    homeSections: homeSectionCounts,
    homeContexts: homeContextCounts,
    workspaces: workspaceCounts,
    workspaceSections: workspaceSectionCounts,
    workspaceContexts: workspaceContextCounts
  };
};

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      counts: {
        home: 0,
        homeSections: {},
        homeContexts: {},
        workspaces: {},
        workspaceSections: {},
        workspaceContexts: {}
      },
      enableMockNotifications: false,

      addNotification: (notificationData) => {
        const notification: INotificationData = {
          ...notificationData,
          id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          read: false
        };

        set(state => {
          const newNotifications = [notification, ...state.notifications];
          const newCounts = calculateCounts(newNotifications);
          
          return {
            notifications: newNotifications,
            counts: newCounts
          };
        });
      },

      markAsRead: (notificationId) => {
        set(state => {
          const updatedNotifications = state.notifications.map(notification =>
            notification.id === notificationId
              ? { ...notification, read: true }
              : notification
          );
          const newCounts = calculateCounts(updatedNotifications);

          return {
            notifications: updatedNotifications,
            counts: newCounts
          };
        });
      },

      markAllAsRead: (workspaceId, homeSection, workspaceSection, homeContext, workspaceContext) => {
        set(state => {
          const updatedNotifications = state.notifications.map(notification => {
            // Workspace context specific
            if (workspaceId && workspaceSection && workspaceContext &&
              notification.workspaceId === workspaceId &&
              notification.workspaceSection === workspaceSection &&
              notification.workspaceContext === workspaceContext) {
              return { ...notification, read: true };
            }
            // Home context specific
            if (homeSection && homeContext &&
              notification.homeSection === homeSection &&
              notification.homeContext === homeContext) {
              return { ...notification, read: true };
            }
            // Workspace section specific
            if (workspaceId && workspaceSection && !workspaceContext &&
              notification.workspaceId === workspaceId &&
              notification.workspaceSection === workspaceSection) {
              return { ...notification, read: true };
            }
            // Home section specific
            if (homeSection && !homeContext &&
              notification.homeSection === homeSection) {
              return { ...notification, read: true };
            }
            // Workspace specific
            if (workspaceId && !workspaceSection && notification.workspaceId === workspaceId) {
              return { ...notification, read: true };
            }
            // Home general
            if (!workspaceId && !homeSection && !notification.workspaceId) {
              return { ...notification, read: true };
            }
            return notification;
          });
          const newCounts = calculateCounts(updatedNotifications);

          return {
            notifications: updatedNotifications,
            counts: newCounts
          };
        });
      },

      removeNotification: (notificationId) => {
        set(state => {
          const filteredNotifications = state.notifications.filter(
            notification => notification.id !== notificationId
          );
          const newCounts = calculateCounts(filteredNotifications);

          return {
            notifications: filteredNotifications,
            counts: newCounts
          };
        });
      },

      clearAllNotifications: (workspaceId, homeSection, workspaceSection, homeContext, workspaceContext) => {
        set(state => {
          const filteredNotifications = state.notifications.filter(notification => {
            // Workspace context specific
            if (workspaceId && workspaceSection && workspaceContext) {
              return !(notification.workspaceId === workspaceId &&
                notification.workspaceSection === workspaceSection &&
                notification.workspaceContext === workspaceContext);
            }
            // Home context specific
            if (homeSection && homeContext) {
              return !(notification.homeSection === homeSection &&
                notification.homeContext === homeContext);
            }
            // Workspace section specific
            if (workspaceId && workspaceSection && !workspaceContext) {
              return !(notification.workspaceId === workspaceId &&
                notification.workspaceSection === workspaceSection);
            }
            // Home section specific
            if (homeSection && !homeContext) {
              return notification.homeSection !== homeSection;
            }
            // Workspace specific
            if (workspaceId && !workspaceSection) {
              return notification.workspaceId !== workspaceId;
            }
            // Home general
            return !!notification.workspaceId;
          });
          const newCounts = calculateCounts(filteredNotifications);

          return {
            notifications: filteredNotifications,
            counts: newCounts
          };
        });
      },

      getHomeNotificationCount: () => {
        return get().counts.home;
      },

      getHomeSectionNotificationCount: (section) => {
        return get().counts.homeSections[section] || 0;
      },

      getHomeContextNotificationCount: (section, context) => {
        return get().counts.homeContexts[section]?.[context] || 0;
      },

      getWorkspaceNotificationCount: (workspaceId) => {
        return get().counts.workspaces[workspaceId] || 0;
      },

      getWorkspaceSectionNotificationCount: (workspaceId, section) => {
        return get().counts.workspaceSections[workspaceId]?.[section] || 0;
      },

      getWorkspaceContextNotificationCount: (workspaceId, section, context) => {
        return get().counts.workspaceContexts[workspaceId]?.[section]?.[context] || 0;
      },

      hasHomeNotifications: () => {
        return get().counts.home > 0;
      },

      hasWorkspaceNotifications: (workspaceId) => {
        return get().getWorkspaceNotificationCount(workspaceId) > 0;
      },

      hasHomeContextNotifications: (section, context) => {
        return get().getHomeContextNotificationCount(section, context) > 0;
      },

      hasWorkspaceContextNotifications: (workspaceId, section, context) => {
        return get().getWorkspaceContextNotificationCount(workspaceId, section, context) > 0;
      },

      updateCounts: () => {
        if (isUpdatingCounts) return; // Prevent recursive calls
        
        isUpdatingCounts = true;
        const { notifications } = get();
        const newCounts = calculateCounts(notifications);
        
        set(state => ({ counts: newCounts }));
        isUpdatingCounts = false;
      },

      setMockNotifications: (enabled) => {
        set({ enableMockNotifications: enabled });
      },

      // Dummy methods for development
      addDummyHomeNotification: (section, context) => {
        if (!get().enableMockNotifications) return;

        const sections = section ? [section] : ['homepage', 'friends', 'agents'];
        const targetSection = sections[Math.floor(Math.random() * sections.length)];

        const dummyMessages = {
          homepage: [
            { title: "Welcome", content: "Welcome to your dashboard" },
            { title: "System Update", content: "New features are available" }
          ],
          friends: [
            { title: "Friend Request", content: "John Doe wants to be your friend" },
            { title: "Friend Online", content: "Sarah is now online" }
          ],
          agents: [
            { title: "Agent Update", content: "Your AI agent has new capabilities" },
            { title: "New Chat", content: "Start chatting with your agent" }
          ]
        };

        const messages = dummyMessages[targetSection as keyof typeof dummyMessages] || dummyMessages.homepage;
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];

        // Generate context if not provided and section supports it
        let targetContext = context;
        if (!targetContext && (targetSection === 'agents' || targetSection === 'friends')) {
          targetContext = `chat_${Math.random().toString(36).substr(2, 8)}`;
        }

        get().addNotification({
          type: Math.random() > 0.5 ? 'message' : 'system',
          title: randomMessage.title,
          content: randomMessage.content,
          homeSection: targetSection,
          homeContext: targetContext
        });
      },

      addDummyWorkspaceNotification: (workspaceId, section, context) => {
        if (!get().enableMockNotifications) return;

        const sections = section ? [section] : ['chatroom', 'members', 'knowledgeBase'];
        const targetSection = sections[Math.floor(Math.random() * sections.length)];

        const dummyMessages = {
          chatroom: [
            { title: "New Message", content: "Someone mentioned you in chat" },
            { title: "Active Discussion", content: "Team discussion is ongoing" }
          ],
          members: [
            { title: "New Member", content: "Someone joined the workspace" },
            { title: "Member Update", content: "Member role has been updated" }
          ],
          knowledgeBase: [
            { title: "New Document", content: "A document was uploaded to KB" },
            { title: "KB Updated", content: "Knowledge base has been updated" }
          ]
        };

        const messages = dummyMessages[targetSection as keyof typeof dummyMessages] || dummyMessages.chatroom;
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];

        // Generate context if not provided and section supports it
        let targetContext = context;
        if (!targetContext) {
          if (targetSection === 'chatroom') {
            targetContext = `chat_${Math.random().toString(36).substr(2, 8)}`;
          } else if (targetSection === 'knowledgeBase') {
            targetContext = `doc_${Math.random().toString(36).substr(2, 8)}`;
          }
        }

        get().addNotification({
          type: Math.random() > 0.5 ? 'message' : 'mention',
          title: randomMessage.title,
          content: randomMessage.content,
          workspaceId,
          workspaceSection: targetSection,
          workspaceContext: targetContext
        });
      },

      resetAllNotifications: () => {
        set({
          notifications: [],
          counts: {
            home: 0,
            homeSections: {},
            homeContexts: {},
            workspaces: {},
            workspaceSections: {},
            workspaceContexts: {}
          }
        });
      }
    }),
    {
      name: 'notification-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        counts: state.counts,
        enableMockNotifications: state.enableMockNotifications
      }),
      version: 5 // Increment version to reset persisted state with new structure
    }
  )
);

// Initialize counts on store creation
const initialState = useNotificationStore.getState();
const initialCounts = calculateCounts(initialState.notifications);
useNotificationStore.setState({ counts: initialCounts });
