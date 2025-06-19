import { useNotificationStore } from "@/renderer/stores/Notification/NotificationStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import type { TopicContext } from "@/renderer/stores/Topic/TopicStore";
import { getUserFromStore } from '@/utils/user';
import { getUsersWithCache } from '@/renderer/stores/Chat/utils';

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
  messageId?: string;
}) => {
  return getNotificationStore().addNotification({
    notification_id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    message: notification.content,
    created_at: new Date().toISOString(),
    title: notification.title,
    type: notification.type,
    workspaceId: notification.workspaceId,
    workspaceSection: notification.workspaceSection,
    workspaceContext: notification.workspaceContext,
    homeSection: notification.homeSection,
    homeContext: notification.homeContext,
    messageId: notification.messageId
  });
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

export const markCurrentContextAsRead = async () => {
  const { contextType, workspaceId, sectionName, activeContextId } = getCurrentContextDetails();

  const currentUser = getUserFromStore();
  if (currentUser?.id) {
    if (contextType === 'workspace' && workspaceId && sectionName && activeContextId) {
      await markMessagesAsReadInDB(currentUser.id, workspaceId, sectionName, activeContextId);
      getNotificationStore().markAllAsRead(workspaceId, undefined, sectionName, undefined, activeContextId);
    } else if (contextType === 'home' && sectionName && activeContextId) {
      await markMessagesAsReadInDB(currentUser.id, undefined, sectionName, activeContextId);
      getNotificationStore().markAllAsRead(undefined, sectionName, undefined, activeContextId);
    }
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
    messageId?: string;
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
    messageId?: string;
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
export const markHomeSectionAsRead = async (section: string, context?: string) => {
  const currentUser = getUserFromStore();
  if (currentUser?.id) {
    await markMessagesAsReadInDB(currentUser.id, undefined, section, context);
  }

  if (context) {
    getNotificationStore().markAllAsRead(undefined, section, undefined, context);
  } else {
    getNotificationStore().markAllAsRead(undefined, section);
  }
};

export const markWorkspaceSectionAsRead = async (workspaceId: string, section: string, context?: string) => {
  const currentUser = getUserFromStore();
  if (currentUser?.id) {
    await markMessagesAsReadInDB(currentUser.id, workspaceId, section, context);
  }

  if (context) {
    getNotificationStore().markAllAsRead(workspaceId, undefined, section, undefined, context);
  } else {
    getNotificationStore().markAllAsRead(workspaceId, undefined, section);
  }
};

export const markWorkspaceAsRead = async (workspaceId: string) => {
  const currentUser = getUserFromStore();
  if (currentUser?.id) {
    await markMessagesAsReadInDB(currentUser.id, workspaceId);
  }

  getNotificationStore().markAllAsRead(workspaceId);
};

export const markHomeAsRead = async () => {
  const currentUser = getUserFromStore();
  if (currentUser?.id) {
    await markMessagesAsReadInDB(currentUser.id);
  }

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

export const handleWorkspaceContextChange = (
  newContext: TopicContext | null, 
  prevContext: TopicContext | null
) => {
  // Only clear notifications when entering a workspace from outside (like from dashboard)
  if (
    newContext?.type === 'workspace' && 
    newContext?.id && 
    prevContext?.type !== 'workspace'
  ) {
    // Clear workspace-level notifications when entering workspace
    // But maybe we should be more selective here too
    console.log(`🔔 Cleared notifications for workspace: ${newContext.id}`);
    // Comment this out temporarily to see notifications
    // getNotificationStore().markAllAsRead(newContext.id);
  }
  
  // Only clear chat-level notifications when entering specific chat contexts
  if (
    newContext?.type === 'workspace' && 
    newContext?.id && 
    newContext?.section?.includes('chatroom')
  ) {
    const { selectedTopics } = getCurrentTopicContext();
    const activeContextId = selectedTopics[newContext.section];
    
    if (activeContextId) {
      // Clear chat-specific notifications
      clearNotificationsForContext(newContext.id, 'chatroom', activeContextId);
      console.log(`🔔 Cleared chat notifications for: ${activeContextId}`);
    }
  }
};

// Add this flag to prevent multiple simultaneous executions
let isCreatingNotifications = false;

// Helper function to check if isRead column exists
const checkIsReadColumnExists = async (): Promise<boolean> => {
  try {
    const tableInfo = await window.electron.db.query({
      query: `PRAGMA table_info(messages)`,
      params: {}
    });
    
    return tableInfo.some((col: any) => col.name === 'isRead');
  } catch (error) {
    console.warn('🔔 Could not check messages table schema:', error);
    return false;
  }
};

// Helper function to mark messages as read in database
const markMessagesAsReadInDB = async (
  currentUserId: string,
  workspaceId?: string,
  section?: string,
  context?: string
) => {
  try {
    // Check if isRead column exists first (defensive coding)
    const hasIsReadColumn = await checkIsReadColumnExists();
    if (!hasIsReadColumn) {
      console.warn('🔔 Cannot mark messages as read - isRead column does not exist');
      return;
    }

    let query = `
      UPDATE messages 
      SET isRead = TRUE 
      WHERE sender != @currentUserId
      AND (isRead = FALSE OR isRead IS NULL)
    `;
    
    const params: any = { currentUserId };

    // Add workspace filtering
    if (workspaceId) {
      query += ` AND chat_id IN (
        SELECT id FROM chat WHERE workspace_id = @workspaceId
      )`;
      params.workspaceId = workspaceId;
    } else {
      // Home messages (no workspace)
      query += ` AND chat_id IN (
        SELECT id FROM chat WHERE workspace_id IS NULL
      )`;
    }

    // Add context filtering (specific chat)
    if (context) {
      query += ` AND chat_id = @context`;
      params.context = context;
    }

    console.log('🔔 Marking messages as read in DB:', { workspaceId, section, context, params });
    
    const result = await window.electron.db.query({
      query,
      params
    });

    console.log('🔔 Messages marked as read:', result);

  } catch (error) {
    console.error('🔔 Error marking messages as read in DB:', error);
  }
};

export const createNotificationsForUnreadMessages = async () => {
  if (isCreatingNotifications) {
    console.log('🔔 Notification creation already in progress, skipping...');
    return;
  }

  try {
    isCreatingNotifications = true;
    const currentUser = getUserFromStore();
    if (!currentUser?.id) {
      console.log('🔔 No current user found, skipping unread message notification creation');
      return;
    }

    console.log('🔔 Creating notifications for unread messages...');

    // Get existing notifications to avoid duplicates
    const existingNotifications = getAllNotifications();
    
    // Create a Set of message IDs that already have notifications
    // We'll store the message ID in the notification's context field
    const existingMessageNotificationIds = new Set(
      existingNotifications
        .filter(n => n.type === 'message' && n.messageId) // Add messageId field to notification
        .map(n => n.messageId)
    );

    console.log('🔔 [DEBUG] Existing message notification IDs:', existingMessageNotificationIds.size);

    // Check if isRead column exists before using it
    const hasIsReadColumn = await checkIsReadColumnExists();
    console.log('🔔 [DEBUG] isRead column exists:', hasIsReadColumn);

    // Use different queries based on column availability
    const query = hasIsReadColumn 
      ? `
        SELECT DISTINCT m.id, m.chat_id, m.sender, m.text, m.created_at, m.file_ids,
               c.workspace_id, c.type as chat_type, c.name as chat_name
        FROM messages m
        LEFT JOIN chat c ON m.chat_id = c.id
        WHERE m.sender != @currentUserId
        AND (m.isRead = FALSE OR m.isRead IS NULL)
        AND m.created_at > datetime('now', '-7 days')
        ORDER BY m.created_at DESC
        LIMIT 20
      `
      : `
        SELECT DISTINCT m.id, m.chat_id, m.sender, m.text, m.created_at, m.file_ids,
               c.workspace_id, c.type as chat_type, c.name as chat_name
        FROM messages m
        LEFT JOIN chat c ON m.chat_id = c.id
        WHERE m.sender != @currentUserId
        AND m.created_at > datetime('now', '-1 day')
        ORDER BY m.created_at DESC
        LIMIT 10
      `;

    const unreadMessages = await window.electron.db.query({
      query,
      params: { currentUserId: currentUser.id }
    });

    console.log('🔔 [DEBUG] Query result:', unreadMessages);

    if (!unreadMessages || !Array.isArray(unreadMessages)) {
      console.log('🔔 No unread messages found');
      return;
    }

    // Filter out messages that already have notifications AND messages with null workspaceId
    const newMessages = unreadMessages.filter(message => 
      !existingMessageNotificationIds.has(message.id) && message.workspace_id !== null
    );

    console.log(`🔔 Found ${unreadMessages.length} total unread messages, ${newMessages.length} new messages to notify about`);

    if (newMessages.length === 0) {
      console.log('🔔 No new messages to create notifications for');
      return;
    }

    // Get user info for senders
    const senderIds = [...new Set(newMessages.map((msg: any) => msg.sender))];
    const userMap = await getUsersWithCache(senderIds);

    // Create notifications for each NEW unread message
    for (const message of newMessages) {
      const sender = userMap[message.sender];
      const senderName = sender?.username || 'Someone';
      
      // Create preview text
      let messagePreview = message.text?.substring(0, 50) || '';
      if (message.file_ids) {
        try {
          const fileIds = JSON.parse(message.file_ids);
          if (Array.isArray(fileIds) && fileIds.length > 0) {
            messagePreview = messagePreview ? `${messagePreview} [+${fileIds.length} files]` : `[${fileIds.length} file(s)]`;
          }
        } catch (error) {
          // Ignore file parsing errors
        }
      }
      
      if (!messagePreview) {
        messagePreview = '[Message]';
      }

      console.log('🔔 [DEBUG] Creating notification for NEW message:', {
        messageId: message.id,
        chatId: message.chat_id,
        workspaceId: message.workspace_id,
        senderName,
        preview: messagePreview
      });

      // Determine if this is a workspace or home message
      if (message.workspace_id) {
        // Workspace message
        addWorkspaceNotification(
          message.workspace_id,
          'chatroom',
          {
            type: 'message',
            title: `${senderName}`,
            content: messagePreview,
            messageId: message.id  // Add this field for deduplication
          },
          message.chat_id
        );
      } else {
        // Home/direct message
        addHomeNotification(
          'agents',
          {
            type: 'message', 
            title: `${senderName}`,
            content: messagePreview,
            messageId: message.id  // Add this field for deduplication
          },
          message.chat_id
        );
      }
    }

    console.log(`🔔 Created notifications for ${newMessages.length} new unread messages`);

  } catch (error) {
    console.error('🔔 Error creating notifications for unread messages:', error);
  } finally {
    isCreatingNotifications = false;
  }
};
