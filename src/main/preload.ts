// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent, shell } from 'electron';
import os from 'os';
import { IChatMessage } from '@/../../types/Chat/Message';
import { IUser } from '@/../../types/User/User';
import {
  ILogUsageArgs,
  IGetUsageLogsArgs,
  IGetUsageAnalyticsArgs,
  IGetPlanArgs,
  ICreatePlanArgs,
  IUpdatePlanArgs
} from '@/../../types/Usage/Usage';
import {
  IUserDeviceListArgs,
  IUserDeviceRegisterArgs,
  IUserDeviceUpdateArgs,
  IUserDeviceRemoveArgs
} from '@/../../types/User/UserDevice';

// namespace
type AuthChannels = 'auth:sign-in' | 'auth:signed-in' | 'auth:cancel';
type GoogleAuthChannels = 'google-auth:request-calendar' | 'google-auth:result' | 'google-auth:disconnect' | 'google-auth:disconnected' | 'google-calendar:fetch-calendars' | 'google-calendar:fetch-events';
type MenuChannels = 'menu:close-tab' | 'menu:new-tab';
type MiscChannels = 'ipc-example';
type DbChannels = 'db:initialize' | 'db:query' | 'db:transaction' | 'db:close';
type SystemChannels = 'system:get-cpu-usage' | 'system:get-memory-usage' | 'system:get-storage-usage';
type FileSystemChannels =
  | 'get-file-content'
  | 'upload-file'
  | 'folder:open-dialog'
  | 'folder:get-contents'
  | 'file:upload'
  | 'file:download'
  | 'file:status'
  | 'file:cancel'
  | 'file:progress-update'
  | 'file:completed'
  | 'file:error'
  | 'file:get-metadata'
  | 'file:get-multiple-metadata'
  | 'file:get-workspace-icon'
  | 'assets:get-local-asset';

// Add dialog channels
type DialogChannels = 'dialog:showSaveDialog';

type KnowledgeBaseChannels =
  | 'kb:list'
  | 'kb:query'
  | 'kb:create'
  | 'kb:get'
  | 'kb:update'
  | 'kb:delete'
  | 'kb:view'
  | 'kb:register'
  | 'kb:getStatus'
  | 'kb:synchronize'
  | 'kb:fullUpdate';

type AIChannels = 'ai:get_completion';

type SSEChannels = 'streaming:abort_stream' | 'streaming:chat_stream_complete' | 'streaming:chunk' | 'streaming:query_stream_complete';
type MCPChannels = 'mcp:initialize_client' | 'mcp:list_tools' | 'mcp:execute_tool';

type ApiChatChannels = 'chat:get' | 'chat:create' | 'chat:update' | 'chat:delete';
type ApiUserChannels = 'user:auth' | 'user:get' | 'user:get_one' | 'user:update' | 'user:search' | 'user:usage:log' | 'user:usage:get-logs' | 'user:usage:get-analytics' | 'user:plan:get' | 'user:plan:create' | 'user:plan:update' | 'user:devices:list' | 'user:devices:register' | 'user:devices:update' | 'user:devices:remove';
type ApiWorkspaceChannels =
  | 'workspace:get'
  | 'workspace:create'
  | 'workspace:update'
  | 'workspace:delete'
  | 'workspace:add_users'
  | 'workspace:remove_user'
  | 'workspace:get_users'
  | 'workspace:send_invitation'
  | 'workspace:get_invitations'
  | 'workspace:get_user_invitations'
  | 'workspace:get_user_join_requests'
  | 'workspace:update_invitation'
  | 'workspace:cancel_invitation'
  | 'workspace:join_request'
  | 'workspace:get_join_requests'
  | 'workspace:update_join_request'
  | 'workspace:leave'
  | 'workspace:get_by_id'
  | 'workspace:update_user_role';

// Add new storage channels
type ApiStorageChannels = 'storage:list-contents';

type ApiChannels = ApiChatChannels | ApiUserChannels | ApiWorkspaceChannels | ApiStorageChannels;

type RedisChannels = 'redis:connect' | 'redis:disconnect' | 'redis:get' | 'redis:set' |
  'redis:del' | 'redis:publish' | 'redis:start-server' | 'redis:stop-server';

type SocketChannels =
  | 'socket:initialize'
  | 'socket:close'
  | 'socket:connected'
  | 'socket:disconnected'
  | 'socket:send-message'
  | 'socket:delete-message'
  | 'socket:new-message'
  | 'socket:message-deleted'
  | 'socket:notification'
  | 'socket:room-update'
  | 'socket:send-ping'
  | 'socket:pong'
  | 'socket:connection-details'
  | 'socket:join-workspace'
  | 'socket:file-progress'
  | 'socket:file-completed'
  | 'socket:file-error'
  | 'socket:leave-workspace'
  | 'socket:workspace-joined'
  | 'socket:workspace-left'
  | 'socket:unread-message';

// Add these channels to the type definitions
type GoogleServiceChannels = 'google-services:ready' | 'google-services:error';

// Add to type definitions
type MicrosoftAuthChannels = 'microsoft-auth:request-calendar' | 'microsoft-auth:result' | 'microsoft-auth:disconnect' | 'microsoft-auth:disconnected' | 'microsoft-calendar:fetch-calendars' | 'microsoft-calendar:fetch-events';

type OneasiaChannels = 'oneasia:authenticate' | 'oneasia:get-models';

// Add these new channel types
type MenuBarChannels = 'menu-action' | 'window-action';

// Add this new type near the other type definitions (around line 7-15)
type AppChannels = 'app:get-version' | 'app:get-build-time' | 'app:get-device-id' | 'app:get-device-info' | 'app:open-account-management';

type CryptoChannels = 
  | 'crypto:initialize-user'
  | 'crypto:derive-master-key'
  | 'crypto:get-user-keys'
  | 'crypto:create-chat-key'
  | 'crypto:get-chat-key'
  | 'crypto:encrypt-message'
  | 'crypto:decrypt-message'
  | 'crypto:derive-chat-key'
  | 'crypto:derive-workspace-key';

export type Channels =
  | AuthChannels
  | GoogleAuthChannels
  | MicrosoftAuthChannels
  | GoogleServiceChannels
  | DbChannels
  | ApiChannels
  | MenuChannels
  | MenuBarChannels
  | MiscChannels
  | SystemChannels
  | SSEChannels
  | MCPChannels
  | FileSystemChannels
  | DialogChannels
  | RedisChannels
  | SocketChannels
  | KnowledgeBaseChannels
  | AIChannels
  | OneasiaChannels
  | AppChannels
  | CryptoChannels;

const electronHandler = {
  ipcRenderer: {
    sendMessage: (channel: Channels, args: unknown[]) => ipcRenderer.send(channel, args),
    on: (channel: Channels, func: (event: IpcRendererEvent, ...args: unknown[]) => void) => {
      const subscription = (event: IpcRendererEvent, ...args: unknown[]) => func(event, ...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    once: (channel: Channels, func: (event: IpcRendererEvent, ...args: unknown[]) => void) => ipcRenderer.once(channel, (event, ...args) => func(event, ...args)),
    invoke: (channel: Channels, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
    send: (channel: Channels, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
    removeListener: (channel: Channels, func: (...args: unknown[]) => void) => ipcRenderer.removeListener(channel, func),
  },
  auth: {
    signIn: (...args: unknown[]) => ipcRenderer.invoke('auth:sign-in', ...args),
  },
  googleAuth: {
    requestCalendar: () => ipcRenderer.send('google-auth:request-calendar'),
    disconnect: () => ipcRenderer.send('google-auth:disconnect'),
    onResult: (callback: (event: IpcRendererEvent, result: any) => void) => {
      ipcRenderer.on('google-auth:result', callback);
      return () => ipcRenderer.removeListener('google-auth:result', callback);
    },
    onDisconnected: (callback: (event: IpcRendererEvent, result: any) => void) => {
      ipcRenderer.on('google-auth:disconnected', callback);
      return () => ipcRenderer.removeListener('google-auth:disconnected', callback);
    },
  },
  googleCalendar: {
    fetchCalendars: (token: string) => ipcRenderer.invoke('google-calendar:fetch-calendars', token),
    fetchEvents: (params: { token: string; calendarId?: string; timeMin?: string; timeMax?: string; maxResults?: number }) =>
      ipcRenderer.invoke('google-calendar:fetch-events', params),
  },
  db: {
    initialize: (...args: unknown[]) => ipcRenderer.invoke('db:initialize', ...args),
    query: (...args: unknown[]) => ipcRenderer.invoke('db:query', ...args),
    transaction: (...args: unknown[]) => ipcRenderer.invoke('db:transaction', ...args),
    close: (...args: unknown[]) => ipcRenderer.invoke('db:close', ...args),
  },
  user: {
    auth: (...args: unknown[]) => ipcRenderer.invoke('user:auth', ...args),
    get: (...args: unknown[]) => ipcRenderer.invoke('user:get', ...args),
    get_one: (...args: unknown[]) => ipcRenderer.invoke('user:get_one', ...args),
    update: (...args: unknown[]) => ipcRenderer.invoke('user:update', ...args),
    search: (args: { token: string; email: string; limit?: number }) =>
      ipcRenderer.invoke('user:search', args),

    // Usage tracking with proper types
    logUsage: (args: ILogUsageArgs) =>
      ipcRenderer.invoke('user:usage:log', args),
    getUsageLogs: (args: IGetUsageLogsArgs) =>
      ipcRenderer.invoke('user:usage:get-logs', args),
    getUsageAnalytics: (args: IGetUsageAnalyticsArgs) =>
      ipcRenderer.invoke('user:usage:get-analytics', args),

    // Plan management with proper types
    getPlan: (args: IGetPlanArgs) =>
      ipcRenderer.invoke('user:plan:get', args),
    createPlan: (args: ICreatePlanArgs) =>
      ipcRenderer.invoke('user:plan:create', args),
    updatePlan: (args: IUpdatePlanArgs) =>
      ipcRenderer.invoke('user:plan:update', args),

    // Device management
    listDevices: (args: IUserDeviceListArgs) =>
      ipcRenderer.invoke('user:devices:list', args),
    registerDevice: (args: IUserDeviceRegisterArgs) =>
      ipcRenderer.invoke('user:devices:register', args),
    updateDevice: (args: IUserDeviceUpdateArgs) =>
      ipcRenderer.invoke('user:devices:update', args),
    removeDevice: (args: IUserDeviceRemoveArgs) =>
      ipcRenderer.invoke('user:devices:remove', args),
  },

  workspace: {
    get: (...args: unknown[]) => ipcRenderer.invoke('workspace:get', ...args),
    create: (...args: unknown[]) => ipcRenderer.invoke('workspace:create', ...args),
    update: (...args: unknown[]) => ipcRenderer.invoke('workspace:update', ...args),
    delete: (...args: unknown[]) => ipcRenderer.invoke('workspace:delete', ...args),
    add_users: (...args: unknown[]) => ipcRenderer.invoke('workspace:add_users', ...args),
    get_users: (...args: unknown[]) => ipcRenderer.invoke('workspace:get_users', ...args),
    remove_user: (...args: unknown[]) => ipcRenderer.invoke('workspace:remove_user', ...args),
    send_invitation: (...args: unknown[]) => ipcRenderer.invoke('workspace:send_invitation', ...args),
    get_invitations: (...args: unknown[]) => ipcRenderer.invoke('workspace:get_invitations', ...args),
    get_user_invitations: (...args: unknown[]) => ipcRenderer.invoke('workspace:get_user_invitations', ...args),
    get_user_join_requests: (...args: unknown[]) => ipcRenderer.invoke('workspace:get_user_join_requests', ...args),

    update_invitation: (...args: unknown[]) => ipcRenderer.invoke('workspace:update_invitation', ...args),
    cancel_invitation: (...args: unknown[]) => ipcRenderer.invoke('workspace:cancel_invitation', ...args),
    join_request: (...args: unknown[]) => ipcRenderer.invoke('workspace:join_request', ...args),
    get_join_requests: (...args: unknown[]) => ipcRenderer.invoke('workspace:get_join_requests', ...args),
    update_join_request: (...args: unknown[]) => ipcRenderer.invoke('workspace:update_join_request', ...args),
    get_by_id: (...args: unknown[]) => ipcRenderer.invoke('workspace:get_by_id', ...args),
    update_user_role: (...args: unknown[]) => ipcRenderer.invoke('workspace:update_user_role', ...args),
    leave: (...args: unknown[]) => ipcRenderer.invoke('workspace:leave', ...args),
  },
  chat: {
    get: (...args: unknown[]) => ipcRenderer.invoke('chat:get', ...args),
    create: (...args: unknown[]) => ipcRenderer.invoke('chat:create', ...args),
    update: (...args: unknown[]) => ipcRenderer.invoke('chat:update', ...args),
    delete: (...args: unknown[]) => ipcRenderer.invoke('chat:delete', ...args),
  },
  // Add new storage handler
  storage: {
    listContents: (args: { workspaceId: string; relativePath?: string; token: string }) =>
      ipcRenderer.invoke('storage:list-contents', args),
  },
  streaming: {
    chat_stream_complete: (...args: unknown[]) => ipcRenderer.invoke('streaming:chat_stream_complete', ...args),
    chunk: (...args: unknown[]) => ipcRenderer.invoke('streaming:chunk', ...args),
    abort_stream: (...args: unknown[]) => ipcRenderer.invoke('streaming:abort_stream', ...args),
    query_stream_complete: (...args: unknown[]) => ipcRenderer.invoke('streaming:query_stream_complete', ...args),
  },
  menu: {
    newTab: (...args: unknown[]) => ipcRenderer.invoke('menu:new-tab', ...args),
    closeTab: (...args: unknown[]) => ipcRenderer.invoke('menu:close-tab', ...args),
  },
  api: {
    getUrl: () => ipcRenderer.invoke('api:get-url'),
  },
  mcp: {
    initialize_client: (...args: unknown[]) => ipcRenderer.invoke('mcp:initialize_client', ...args),
    list_tools: (...args: unknown[]) => ipcRenderer.invoke('mcp:list_tools', ...args),
    execute_tool: (args: { serverName: string; toolName: string; arguments: Record<string, any> }) =>
      ipcRenderer.invoke('mcp:execute_tool', args),
  },
  fileSystem: {
    openFolderDialog: () => ipcRenderer.invoke('folder:open-dialog'),
    getFolderContents: (folderPath: string) => ipcRenderer.invoke('folder:get-contents', folderPath),
    uploadFile: (args: { workspaceId: string, fileData: string, fileName: string, token: string, metadata?: Record<string, any> }) =>
      ipcRenderer.invoke('upload-file', args),
    getFileContent: (...args: unknown[]) => ipcRenderer.invoke('get-file-content', ...args),
    upload: (workspaceId: string, filePath: string, token: string, metadata?: Record<string, any>) =>
      ipcRenderer.invoke('file:upload', { workspaceId, filePath, token, metadata }),
    download: (workspaceId: string, fileId: string, destinationPath: string, token: string) =>
      ipcRenderer.invoke('file:download', { workspaceId, fileId, destinationPath, token }),
    getStatus: (operationId: string) => ipcRenderer.invoke('file:status', { operationId }),
    cancelOperation: (operationId: string) => ipcRenderer.invoke('file:cancel', { operationId }),
    onProgress: (callback: (data: { operationId: string, progress: number }) => void) => {
      const channel: Channels = 'file:progress-update';
      const subscription = (_: IpcRendererEvent, data: { operationId: string, progress: number }) => callback(data);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    getFileMetadata: (args: { workspaceId: string; fileId: string; token: string }) =>
      ipcRenderer.invoke('file:get-metadata', args),
    getFilesMetadata: (args: { workspaceId: string; fileIds: string[]; token: string }) =>
      ipcRenderer.invoke('file:get-multiple-metadata', args),
    getWorkspaceIcon: (args: { workspaceId: string; imagePath: string; token: string }) =>
      ipcRenderer.invoke('file:get-workspace-icon', args),
    getLocalAsset: (assetPath: string) =>
      ipcRenderer.invoke('assets:get-local-asset', assetPath),
  },
  homedir: () => os.homedir(),
  session: {
    setCookie: (cookieDetails: { url: string; name: string; value: string; httpOnly: boolean; secure: boolean; }) => ipcRenderer.invoke('session:set-cookie', cookieDetails),
  },
  redis: {
    startServer: (...args: unknown[]) => ipcRenderer.invoke('redis:start-server', ...args),
    stopServer: (...args: unknown[]) => ipcRenderer.invoke('redis:stop-server', ...args),
  },
  socket: {
    initialize: (user: IUser, token?: string | null) => ipcRenderer.invoke('socket:initialize', user, token),
    close: () => ipcRenderer.invoke('socket:close'),
    sendMessage: (message: IChatMessage, workspaceId: string) => 
      ipcRenderer.invoke('socket:send-message', message, workspaceId),
    deleteMessage: (roomId: string, messageId: string) => 
      ipcRenderer.invoke('socket:delete-message', { roomId, messageId }),
    sendPing: () => ipcRenderer.invoke('socket:send-ping'),
    joinWorkspace: (workspaceId: string) => 
      ipcRenderer.invoke('socket:join-workspace', workspaceId),
    leaveWorkspace: (workspaceId: string) => 
      ipcRenderer.invoke('socket:leave-workspace', workspaceId),
  },
  knowledgeBase: {
    list: (...args: unknown[]) => ipcRenderer.invoke('kb:list', ...args),
    create: (...args: unknown[]) => ipcRenderer.invoke('kb:create', ...args),
    get: (...args: unknown[]) => ipcRenderer.invoke('kb:get', ...args),
    update: (...args: unknown[]) => ipcRenderer.invoke('kb:update', ...args),
    delete: (...args: unknown[]) => ipcRenderer.invoke('kb:delete', ...args),
    view: (...args: unknown[]) => ipcRenderer.invoke('kb:view', ...args),
    registerKB: (...args: unknown[]) => ipcRenderer.invoke('kb:register', ...args),
    getKBStatus: (...args: unknown[]) => ipcRenderer.invoke('kb:getStatus', ...args),
    synchronizeKB: (...args: unknown[]) => ipcRenderer.invoke('kb:synchronize', ...args),
    fullUpdateKB: (...args: unknown[]) => ipcRenderer.invoke('kb:fullUpdate', ...args),
  },
  ai: {
    getCompletion: (args: { messages: any[], options: any }) => ipcRenderer.invoke('ai:get_completion', args),
  },
  shell: {
    openExternal: (url: string) => shell.openExternal(url),
  },
  microsoftAuth: {
    requestCalendar: () => ipcRenderer.send('microsoft-auth:request-calendar'),
    disconnect: () => ipcRenderer.send('microsoft-auth:disconnect'),
    onResult: (callback: (event: IpcRendererEvent, result: any) => void) => {
      ipcRenderer.on('microsoft-auth:result', callback);
      return () => ipcRenderer.removeListener('microsoft-auth:result', callback);
    },
    onDisconnected: (callback: (event: IpcRendererEvent, result: any) => void) => {
      ipcRenderer.on('microsoft-auth:disconnected', callback);
      return () => ipcRenderer.removeListener('microsoft-auth:disconnected', callback);
    },
  },
  microsoftCalendar: {
    fetchCalendars: (token: string, refreshToken?: string) =>
      ipcRenderer.invoke('microsoft-calendar:fetch-calendars', token, refreshToken),
    fetchEvents: (params: {
      token: string;
      refreshToken?: string;
      calendarId?: string;
      timeMin?: string;
      timeMax?: string;
      maxResults?: number
    }) =>
      ipcRenderer.invoke('microsoft-calendar:fetch-events', params),
  },
  oneasia: {
    authenticate: (apiKey: string) => ipcRenderer.invoke('oneasia:authenticate', apiKey),
    getModels: (apiKey: string) => ipcRenderer.invoke('oneasia:get-models', apiKey),
  },
  menuBar: {
    action: (action: string) => ipcRenderer.invoke('menu-action', action),
  },
  window: {
    action: (action: string) => ipcRenderer.invoke('window-action', action),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    getBuildTime: () => ipcRenderer.invoke('app:get-build-time'),
    getDeviceId: () => ipcRenderer.invoke('app:get-device-id'),
    getDeviceInfo: () => ipcRenderer.invoke('app:get-device-info'),
    openAccountManagement: () => ipcRenderer.invoke('app:open-account-management'),
  },
  crypto: {
    initializeUser: (userId: string, password: string) => 
      ipcRenderer.invoke('crypto:initialize-user', userId, password),
    deriveMasterKey: (password: string, salt: string) => 
      ipcRenderer.invoke('crypto:derive-master-key', password, salt),
    getUserKeys: (userId: string) => 
      ipcRenderer.invoke('crypto:get-user-keys', userId),
    createChatKey: (chatId: string, createdBy: string, userIds: string[], userMasterKeys: Record<string, string>) => 
      ipcRenderer.invoke('crypto:create-chat-key', chatId, createdBy, userIds, userMasterKeys),
    getChatKey: (userId: string, chatId: string, masterKey: string) => 
      ipcRenderer.invoke('crypto:get-chat-key', userId, chatId, masterKey),
    encryptMessage: (message: string, chatKey: string) => 
      ipcRenderer.invoke('crypto:encrypt-message', message, chatKey),
    decryptMessage: (encryptedMessage: any, chatKey: string) => 
      ipcRenderer.invoke('crypto:decrypt-message', encryptedMessage, chatKey),
    deriveChatKey: (chatId: string, workspaceId: string) => 
      ipcRenderer.invoke('crypto:derive-chat-key', chatId, workspaceId),
    deriveWorkspaceKey: (workspaceId: string, context?: string) => 
      ipcRenderer.invoke('crypto:derive-workspace-key', workspaceId, context),
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
