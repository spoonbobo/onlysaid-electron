import { useNotificationStore } from "@/renderer/stores/Notification/NotificationStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";

// Direct store access functions
export const getNotificationStore = () => {
  return useNotificationStore.getState();
};

export const getCurrentTopicContext = () => {
  return useTopicStore.getState();
};

// Basic notification functions
export const addNotification = (notification: {
  type: 'message' | 'mention' | 'workspace_invite' | 'system';
  title: string;
  content: string;
  workspaceId?: string;
  workspaceSection?: string;
  workspaceContext?: string;
  homeSection?: string;
  homeContext?: string;
}) => {
  return getNotificationStore().addNotification(notification);
};

export const markNotificationAsRead = (notificationId: string) => {
  return getNotificationStore().markAsRead(notificationId);
};

export const clearAllNotifications = () => {
  return getNotificationStore().resetAllNotifications();
};

// Home notification functions
export const getHomeNotificationCount = () => {
  return getNotificationStore().getHomeNotificationCount();
};

export const getHomeSectionNotificationCount = (section: string) => {
  return getNotificationStore().getHomeSectionNotificationCount(section);
};

export const getHomeContextNotificationCount = (section: string, context: string) => {
  return getNotificationStore().getHomeContextNotificationCount(section, context);
};

export const hasHomeNotifications = () => {
  return getNotificationStore().hasHomeNotifications();
};

export const hasHomeContextNotifications = (section: string, context: string) => {
  return getNotificationStore().hasHomeContextNotifications(section, context);
};

// Workspace notification functions
export const getWorkspaceNotificationCount = (workspaceId: string) => {
  return getNotificationStore().getWorkspaceNotificationCount(workspaceId);
};

export const getWorkspaceSectionNotificationCount = (workspaceId: string, section: string) => {
  return getNotificationStore().getWorkspaceSectionNotificationCount(workspaceId, section);
};

export const getWorkspaceContextNotificationCount = (workspaceId: string, section: string, context: string) => {
  return getNotificationStore().getWorkspaceContextNotificationCount(workspaceId, section, context);
};

export const hasWorkspaceNotifications = (workspaceId: string) => {
  return getNotificationStore().hasWorkspaceNotifications(workspaceId);
};

export const hasWorkspaceContextNotifications = (workspaceId: string, section: string, context: string) => {
  return getNotificationStore().hasWorkspaceContextNotifications(workspaceId, section, context);
};

// Context-aware notification functions
export const getCurrentContextDetails = () => {
  const { selectedContext, selectedTopics } = getCurrentTopicContext();

  const workspaceId = selectedContext?.id;
  const section = selectedContext?.section || '';
  const sectionName = section.split(':')[1] || '';
  const activeContextId = selectedContext?.section ? selectedTopics[selectedContext.section] || null : null;

  return {
    contextType: selectedContext?.type,
    workspaceId,
    section,
    sectionName,
    activeContextId,
    selectedContext
  };
};

export const getCurrentContextNotificationCount = () => {
  const { contextType, workspaceId, sectionName, activeContextId } = getCurrentContextDetails();

  if (contextType === 'workspace' && workspaceId && sectionName && activeContextId) {
    return getWorkspaceContextNotificationCount(workspaceId, sectionName, activeContextId);
  } else if (contextType === 'home' && sectionName && activeContextId) {
    return getHomeContextNotificationCount(sectionName, activeContextId);
  }
  return 0;
};

export const hasCurrentContextNotifications = () => {
  const { contextType, workspaceId, sectionName, activeContextId } = getCurrentContextDetails();

  if (contextType === 'workspace' && workspaceId && sectionName && activeContextId) {
    return hasWorkspaceContextNotifications(workspaceId, sectionName, activeContextId);
  } else if (contextType === 'home' && sectionName && activeContextId) {
    return hasHomeContextNotifications(sectionName, activeContextId);
  }
  return false;
};

export const markCurrentContextAsRead = () => {
  const { contextType, workspaceId, sectionName, activeContextId } = getCurrentContextDetails();

  if (contextType === 'workspace' && workspaceId && sectionName && activeContextId) {
    getNotificationStore().markAllAsRead(workspaceId, undefined, sectionName, undefined, activeContextId);
  } else if (contextType === 'home' && sectionName && activeContextId) {
    getNotificationStore().markAllAsRead(undefined, sectionName, undefined, activeContextId);
  }
};

export const addNotificationToCurrentContext = (notification: {
  type: 'message' | 'mention' | 'workspace_invite' | 'system';
  title: string;
  content: string;
}) => {
  const { contextType, workspaceId, sectionName, activeContextId } = getCurrentContextDetails();

  if (contextType === 'workspace' && workspaceId && sectionName && activeContextId) {
    return addNotification({
      ...notification,
      workspaceId,
      workspaceSection: sectionName,
      workspaceContext: activeContextId
    });
  } else if (contextType === 'home' && sectionName && activeContextId) {
    return addNotification({
      ...notification,
      homeSection: sectionName,
      homeContext: activeContextId
    });
  }
};

// Convenience functions for specific notification types
export const addHomeNotification = (
  section: string,
  notification: {
    type: 'message' | 'mention' | 'workspace_invite' | 'system';
    title: string;
    content: string;
  },
  context?: string
) => {
  return addNotification({
    ...notification,
    homeSection: section,
    homeContext: context
  });
};

export const addWorkspaceNotification = (
  workspaceId: string,
  section: string,
  notification: {
    type: 'message' | 'mention' | 'workspace_invite' | 'system';
    title: string;
    content: string;
  },
  context?: string
) => {
  return addNotification({
    ...notification,
    workspaceId,
    workspaceSection: section,
    workspaceContext: context
  });
};

// Mark as read functions
export const markHomeSectionAsRead = (section: string, context?: string) => {
  if (context) {
    getNotificationStore().markAllAsRead(undefined, section, undefined, context);
  } else {
    getNotificationStore().markAllAsRead(undefined, section);
  }
};

export const markWorkspaceSectionAsRead = (workspaceId: string, section: string, context?: string) => {
  if (context) {
    getNotificationStore().markAllAsRead(workspaceId, undefined, section, undefined, context);
  } else {
    getNotificationStore().markAllAsRead(workspaceId, undefined, section);
  }
};

export const markWorkspaceAsRead = (workspaceId: string) => {
  getNotificationStore().markAllAsRead(workspaceId);
};

export const markHomeAsRead = () => {
  getNotificationStore().markAllAsRead();
};

// Mock notification functions (for development)
export const enableMockNotifications = (enabled: boolean) => {
  getNotificationStore().setMockNotifications(enabled);
};

export const addDummyHomeNotification = (section?: string, context?: string) => {
  getNotificationStore().addDummyHomeNotification(section, context);
};

export const addDummyWorkspaceNotification = (workspaceId: string, section?: string, context?: string) => {
  getNotificationStore().addDummyWorkspaceNotification(workspaceId, section, context);
};

// Batch operations
export const clearNotificationsForWorkspace = (workspaceId: string) => {
  getNotificationStore().clearAllNotifications(workspaceId);
};

export const clearNotificationsForHomeSection = (section: string) => {
  getNotificationStore().clearAllNotifications(undefined, section);
};

export const clearNotificationsForWorkspaceSection = (workspaceId: string, section: string) => {
  getNotificationStore().clearAllNotifications(workspaceId, undefined, section);
};

export const clearNotificationsForContext = (workspaceId?: string, section?: string, context?: string) => {
  if (workspaceId && section && context) {
    getNotificationStore().clearAllNotifications(workspaceId, undefined, section, undefined, context);
  } else if (section && context) {
    getNotificationStore().clearAllNotifications(undefined, section, undefined, context);
  }
};

// Get all notifications (filtered)
export const getAllNotifications = () => {
  return getNotificationStore().notifications;
};

export const getNotificationsForWorkspace = (workspaceId: string) => {
  return getAllNotifications().filter(n => n.workspaceId === workspaceId);
};

export const getNotificationsForHomeSection = (section: string) => {
  return getAllNotifications().filter(n => n.homeSection === section && !n.workspaceId);
};

export const getNotificationsForContext = (workspaceId?: string, section?: string, context?: string) => {
  const notifications = getAllNotifications();

  if (workspaceId && section && context) {
    return notifications.filter(n =>
      n.workspaceId === workspaceId &&
      n.workspaceSection === section &&
      n.workspaceContext === context
    );
  } else if (section && context) {
    return notifications.filter(n =>
      n.homeSection === section &&
      n.homeContext === context &&
      !n.workspaceId
    );
  }

  return [];
};

// Status functions
export const isMockNotificationsEnabled = () => {
  return getNotificationStore().enableMockNotifications;
};

export const getTotalNotificationCount = () => {
  return getAllNotifications().filter(n => !n.read).length;
};

export const getUnreadNotifications = () => {
  return getAllNotifications().filter(n => !n.read);
};
