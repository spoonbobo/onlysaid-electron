import { IChatMessage } from '@/../../types/Chat/Message';
import { IUser } from '@/../../types/User/User';

/**
 * Formats a collection of chat messages into a single formatted string
 * with the format: identity (Role) [TIME]: message content
 * 
 * @param messages - Array of chat messages to format
 * @param currentUser - The current user to determine roles
 * @returns Formatted string containing all messages
 */
export const formatMessagesForContext = (
  messages: IChatMessage[], 
  currentUser: IUser | null
): string => {
  if (!messages || messages.length === 0) {
    return '';
  }

  return messages
    .map(msg => {
      // Determine the role
      let role = 'Assistant';
      if (msg.sender === currentUser?.id) {
        role = 'User';
      } else if (msg.is_tool_response) {
        role = 'Tool';
      }

      // Get the identity (username or fallback)
      const identity = msg.sender_object?.username || 'Unknown';

      // Format the timestamp
      const timestamp = msg.created_at || msg.sent_at;
      let formattedTime = new Date().toISOString(); // fallback
      
      if (timestamp) {
        try {
          formattedTime = new Date(timestamp).toISOString();
        } catch (error) {
          console.warn('[MessageFormatter] Invalid timestamp:', timestamp);
        }
      }

      // Format the message content
      const content = msg.text || '';

      return `${identity} (${role}) [${formattedTime}]: ${content}`;
    })
    .join('\n');
};

/**
 * Formats a single message with the standard format
 * 
 * @param message - The message to format
 * @param currentUser - The current user to determine role
 * @returns Formatted message string
 */
export const formatSingleMessage = (
  message: IChatMessage,
  currentUser: IUser | null
): string => {
  return formatMessagesForContext([message], currentUser);
}; 