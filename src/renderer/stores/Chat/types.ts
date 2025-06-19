import { IChatMessage, IReaction } from "@/../../types/Chat/Message";
import { IChatRoom } from "@/../../types/Chat/Chatroom";
import { IFile } from "@/../../types/File/File";

export interface ChatState {
  activeChatByContext: Record<string, string | null>;
  messages: Record<string, IChatMessage[]>;
  messageOffsets: Record<string, number>;
  chats: IChatRoom[];
  inputByContextChat: Record<string, string>;
  isLoading: boolean;
  error: string | null;
  isTyping: boolean;
  chatOverlayMinimized: boolean;
  lastReadMessageIds: Record<string, string>;

  createChat: (userId: string, type: string, workspaceId?: string) => Promise<IChatRoom | null>;
  deleteChat: (chatId: string, local?: boolean) => Promise<void>;
  getChat: (userId: string, type: string, workspaceId?: string) => Promise<void>;
  updateChat: (chatId: string, data: Partial<IChatRoom>, local?: boolean) => Promise<void>;
  setActiveChat: (chatId: string, contextId?: string) => void;
  markAsRead: (chatId: string) => void;
  markChatAsRead: (chatId: string, workspaceId?: string) => Promise<void>;
  getActiveChatIdForContext: (contextId: string) => string | null;
  cleanupContextReferences: (contextId: string) => void;
  cleanupChatReferences: (chatId: string) => void;

  sendMessage: (chatId: string, messageData: Partial<IChatMessage>, workspaceId?: string) => Promise<string | void>;
  updateMessage: (chatId: string, messageId: string, data: Partial<IChatMessage>) => Promise<void>;
  fetchMessages: (chatId: string, loadMore?: boolean, preserveHistory?: boolean) => Promise<boolean>;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  editMessage: (chatId: string, messageId: string, content: string) => Promise<void>;
  appendMessage: (chatId: string, message: IChatMessage) => void;
  getMessageById: (chatId: string, messageId: string) => Promise<IChatMessage | null>;
  refreshMessage: (chatId: string, messageId: string) => Promise<void>;

  setInput: (chatId: string, input: string, contextId?: string) => void;
  getInput: (chatId: string, contextId?: string) => string;

  toggleReaction: (chatId: string, messageId: string, reaction: string) => Promise<void>;

  setChatOverlayMinimized: (minimized: boolean) => void;

  updateMessageFiles: (chatId: string, messageId: string, files: IFile[]) => void;

  populateMessageSenderObjects: (messages: IChatMessage[]) => Promise<IChatMessage[]>;

  markMessagesAsRead: (chatId: string, messageIds?: string[]) => Promise<void>;
  getUnreadMessages: (chatId: string) => IChatMessage[];
  getUnreadCount: (chatId: string) => number;
  hasUnreadMessages: (chatId: string) => boolean;
}

export const MESSAGE_FETCH_LIMIT = 35; 