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
  | 'file:get-files-in-path'
  | 'file:read-text-file'
  | 'assets:get-local-asset';

// Add dialog channels
type DialogChannels = 'dialog:showSaveDialog';

type KnowledgeBaseChannels =
  | 'kb:list'
  | 'kb:query'
  | 'kb:queryNonStreaming'
  | 'kb:retrieve'
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
  | 'workspace:update_user_role'
  | 'workspace:get_settings'
  | 'workspace:create_settings'
  | 'workspace:update_settings'
  | 'workspace:delete_settings';

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

// ✅ Updated MenuBarChannels to include window state channels
type MenuBarChannels = 'menu-action' | 'window-action' | 'window:is-maximized';

// ✅ Add WindowChannels for window state management
type WindowChannels = 
  | 'window:state-changed' 
  | 'window:bounds-changed' 
  | 'window:init'
  | 'window:create-window'
  | 'window:close-window'
  | 'window:focus-window'
  | 'window:focus-tab'
  | 'window:sync-state'
  | 'window:tab-focused';

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

// Add health check channels
type HealthCheckChannels = 'health:start-periodic-check' | 'health:stop-periodic-check' | 'health:check' | 'health:check-failed' | 'health:is-running';

// ✅ UPDATED: Enhanced AgentChannels with decomposed task support
type AgentChannels = 
  | 'agent:execute_task' 
  | 'agent:get_status' 
  | 'agent:clear_cache' 
  | 'agent:stream_update' 
  | 'agent:human_interaction_request'
  | 'agent:human_interaction_response'
  | 'agent:resume_workflow'
  | 'agent:tool_execution_start'
  | 'agent:tool_execution_complete'
  | 'agent:tool_execution_updated'
  | 'agent:execute_mcp_tool'
  | 'agent:clear_interactions'
  | 'agent:get_pending_interactions'
  | 'agent:result_synthesized'
  | 'agent:agent_updated'
  | 'agent:execution_updated'
  | 'agent:task_updated'
  | 'agent:save_agent_to_db'
  | 'agent:save_task_to_db'
  | 'agent:save_tool_execution_to_db'
  | 'agent:update_execution_status'
  | 'agent:add_log_to_db'
  | 'agent:create_execution_record'
  | 'agent:update_agent_status'
  | 'agent:update_task_status'
  | 'agent:clear_task_state'
  | 'agent:clear_all_task_state'
  | 'agent:save_decomposed_tasks_to_db'
  | 'agent:create_task_with_decomposition'
  | 'agent:update_task_assignment'
  | 'agent:load_task_hierarchy'
  | 'agent:task_assigned';

// Add this new type around line 130 with other channel types
type InitializationChannels = 'init:progress-update' | 'init:step-complete' | 'init:complete';

// Add Moodle API channels to the type definitions
type MoodleApiChannels = 
  | 'moodle:test-connection'
  | 'moodle:get-course'
  | 'moodle:get-enrolled-users'
  | 'moodle:get-course-contents'
  | 'moodle:get-grades'
  | 'moodle:get-user-info'
  | 'moodle:get-courses'
  | 'moodle:get-preset-url'
  | 'moodle:get-assignments'
  | 'moodle:get-assignment-submissions'
  | 'moodle:get-assignment-grades'
  | 'moodle:update-assignment-grade'
  | 'moodle:publish-grades-batch'
  | 'moodle:get-assignment-grade-details';

export type Channels =
  | AuthChannels
  | GoogleAuthChannels
  | MicrosoftAuthChannels
  | GoogleServiceChannels
  | DbChannels
  | ApiChannels
  | MenuChannels
  | MenuBarChannels
  | WindowChannels
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
  | CryptoChannels
  | HealthCheckChannels
  | AgentChannels
  | InitializationChannels
  | MoodleApiChannels;

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
    removeAllListeners: (channel: Channels) => ipcRenderer.removeAllListeners(channel),
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
    
    // New settings methods
    get_settings: (args: { token: string; workspaceId: string }) =>
      ipcRenderer.invoke('workspace:get_settings', args),
    create_settings: (args: { 
        token: string; 
        workspaceId: string; 
        request: { 
            moodle_course_id?: string;
            moodle_api_token?: string;
        } 
    }) => ipcRenderer.invoke('workspace:create_settings', args),
    update_settings: (args: { 
        token: string; 
        workspaceId: string; 
        request: { 
            moodle_course_id?: string;
            moodle_api_token?: string;
        } 
    }) => ipcRenderer.invoke('workspace:update_settings', args),
    delete_settings: (args: { token: string; workspaceId: string }) =>
      ipcRenderer.invoke('workspace:delete_settings', args),
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
    getFilesInPath: (args: { workspaceId: string; pathPrefix: string; token: string }) =>
      ipcRenderer.invoke('file:get-files-in-path', args),
    readTextFile: (args: { workspaceId: string; fileId: string; token: string }) =>
      ipcRenderer.invoke('file:read-text-file', args),
  },
  dialog: {
    showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:showSaveDialog', options),
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
    queryNonStreaming: (args: {
      workspaceId: string;
      queryText: string;
      kbIds?: string[];
      model?: string;
      conversationHistory?: any[];
      topK?: number;
      preferredLanguage?: string;
      messageId?: string;
    }) => ipcRenderer.invoke('kb:queryNonStreaming', args),
    retrieve: (args: {
      workspaceId: string;
      queryText: string;
      kbIds?: string[];
      topK?: number;
    }) => ipcRenderer.invoke('kb:retrieve', args),
  },
  ai: {
    getCompletion: (args: { messages: any[], options: any }) => ipcRenderer.invoke('ai:get_completion', args),
    getCompletionLangChain: (params: { messages: any[], options: any }) => 
      ipcRenderer.invoke('ai:get_completion_langchain', params),
    clearLangChainCache: () =>
      ipcRenderer.invoke('langchain:clear_cache'),
    getLangChainCacheInfo: () =>
      ipcRenderer.invoke('langchain:get_cache_info'),
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
  // ✅ Updated window handler with new methods
  window: {
    action: (action: string) => ipcRenderer.invoke('window-action', action),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  },
  app: {
    getName: () => ipcRenderer.invoke('app:get-name'),
    getProductName: () => ipcRenderer.invoke('app:get-product-name'),
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
  n8nApi: {
    testConnection: (args: { apiUrl: string; apiKey: string }) => 
      ipcRenderer.invoke('n8n:test-connection', args),
    getWorkflows: (args: { apiUrl: string; apiKey: string }) => 
      ipcRenderer.invoke('n8n:get-workflows', args),
    toggleWorkflow: (args: { apiUrl: string; apiKey: string; workflowId: string; active: boolean }) => 
      ipcRenderer.invoke('n8n:toggle-workflow', args),
  },
  // Add health check handler
  healthCheck: {
    startPeriodicCheck: (token: string) => ipcRenderer.invoke('health:start-periodic-check', token),
    stopPeriodicCheck: () => ipcRenderer.invoke('health:stop-periodic-check'),
    checkHealth: (token: string) => ipcRenderer.invoke('health:check', token),
    isRunning: () => ipcRenderer.invoke('health:is-running'),
    onHealthCheckFailed: (callback: (event: IpcRendererEvent) => void) => {
      ipcRenderer.on('health:check-failed', callback);
      return () => ipcRenderer.removeListener('health:check-failed', callback);
    },
  },
  // ✅ ENHANCED: Agent handler with decomposed task support
  agent: {
    executeTask: (params: { task: string; options: any; limits?: any }) =>
      ipcRenderer.invoke('agent:execute_task', params),
    getStatus: () =>
      ipcRenderer.invoke('agent:get_status'),
    clearCache: () =>
      ipcRenderer.invoke('agent:clear_cache'),
    approveTool: (params: { approvalId: string; approved: boolean }) =>
      ipcRenderer.invoke('agent:approve_tool', params),
    abortTask: (params: { taskId?: string }) =>
      ipcRenderer.invoke('agent:abort_task', params),
    resumeWorkflow: (params: { threadId: string; response: any; workflowType?: string }) =>
      ipcRenderer.invoke('agent:resume_workflow', params),
    onToolApprovalRequest: (callback: (event: IpcRendererEvent, data: any) => void) => {
      ipcRenderer.on('agent:tool_approval_request', callback);
      return () => ipcRenderer.removeListener('agent:tool_approval_request', callback);
    },
    getExecutionHistory: (params: { limit?: number }) =>
      ipcRenderer.invoke('agent:get_execution_history', params),
    getExecutionGraph: (params: { executionId: string }) =>
      ipcRenderer.invoke('agent:get_execution_graph', params),
    getAgentCards: () =>
      ipcRenderer.invoke('agent:get_agent_cards'),
    getAgentCard: (params: { agentId: string }) =>
      ipcRenderer.invoke('agent:get_agent_card', params),
    getAgentCardsByRole: (params: { role: string }) =>
      ipcRenderer.invoke('agent:get_agent_cards_by_role', params),
    agentAction: (params: { agentId: string; action: string; payload?: any }) =>
      ipcRenderer.invoke('agent:agent_action', params),
    abortToolExecution: (params: { executionId: string }) =>
      ipcRenderer.invoke('agent:abort_tool_execution', params),
    saveAgentToDb: (params: { executionId: string; agentId: string; role: string; expertise?: string[] }) =>
      ipcRenderer.invoke('agent:save_agent_to_db', params),
    saveTaskToDb: (params: { executionId: string; agentId: string; taskDescription: string; priority?: number }) =>
      ipcRenderer.invoke('agent:save_task_to_db', params),
    saveToolExecutionToDb: (params: { 
      executionId: string; 
      agentId: string; 
      toolName: string; 
      toolArguments?: any; 
      approvalId?: string; 
      taskId?: string; 
      mcpServer?: string 
    }) =>
      ipcRenderer.invoke('agent:save_tool_execution_to_db', params),
    updateExecutionStatus: (params: { executionId: string; status: string; result?: string; error?: string }) =>
      ipcRenderer.invoke('agent:update_execution_status', params),
    addLogToDb: (params: { 
      executionId: string; 
      logType: string; 
      message: string; 
      agentId?: string; 
      taskId?: string; 
      toolExecutionId?: string; 
      metadata?: any 
    }) =>
      ipcRenderer.invoke('agent:add_log_to_db', params),
    createExecutionRecord: (params: { 
      executionId: string; 
      taskDescription: string; 
      chatId?: string; 
      workspaceId?: string 
    }) =>
      ipcRenderer.invoke('agent:create_execution_record', params),
    updateAgentStatus: (params: { agentId: string; status: string; currentTask?: string; executionId: string }) =>
      ipcRenderer.invoke('agent:update_agent_status', params),
    updateTaskStatus: (params: { taskId: string; status: string; result?: string; error?: string; executionId: string }) =>
      ipcRenderer.invoke('agent:update_task_status', params),
    
    // ✅ NEW: Decomposed task methods
    saveDecomposedTasksToDb: (params: { 
      executionId: string; 
      subtasks: any[]; 
      taskAnalysis?: string; 
    }) =>
      ipcRenderer.invoke('agent:save_decomposed_tasks_to_db', params),
    createTaskWithDecomposition: (params: any) =>
      ipcRenderer.invoke('agent:create_task_with_decomposition', params),
    updateTaskAssignment: (params: { 
      taskId: string; 
      agentId: string; 
      assignmentReason?: string; 
      executionId: string; 
    }) =>
      ipcRenderer.invoke('agent:update_task_assignment', params),
    loadTaskHierarchy: (params: { executionId: string }) =>
      ipcRenderer.invoke('agent:load_task_hierarchy', params),
  },
  moodleApi: {
    testConnection: (args: { baseUrl: string; apiKey: string }) => 
      ipcRenderer.invoke('moodle:test-connection', args),
    getCourse: (args: { baseUrl: string; apiKey: string; courseId: string }) => 
      ipcRenderer.invoke('moodle:get-course', args),
    getEnrolledUsers: (args: { baseUrl: string; apiKey: string; courseId: string }) => 
      ipcRenderer.invoke('moodle:get-enrolled-users', args),
    getCourseContents: (args: { baseUrl: string; apiKey: string; courseId: string }) => 
      ipcRenderer.invoke('moodle:get-course-contents', args),
    getGrades: (args: { baseUrl: string; apiKey: string; courseId: string }) => 
      ipcRenderer.invoke('moodle:get-grades', args),
    getUserInfo: (args: { baseUrl: string; apiKey: string }) => 
      ipcRenderer.invoke('moodle:get-user-info', args),
    getCourses: (args: { baseUrl: string; apiKey: string }) => 
      ipcRenderer.invoke('moodle:get-courses', args),
    getAssignments: (args: { baseUrl: string; apiKey: string; courseId: string }) => 
      ipcRenderer.invoke('moodle:get-assignments', args),
    getAssignmentSubmissions: (args: { baseUrl: string; apiKey: string; assignmentId: string }) => 
      ipcRenderer.invoke('moodle:get-assignment-submissions', args),
    getAssignmentGrades: (args: { baseUrl: string; apiKey: string; assignmentId: string }) => 
      ipcRenderer.invoke('moodle:get-assignment-grades', args),
    updateAssignmentGrade: (args: { 
      baseUrl: string; 
      apiKey: string; 
      assignmentId: string; 
      userId: string; 
      grade: number; 
      feedback?: string;
      courseId?: string;
    }) => ipcRenderer.invoke('moodle:update-assignment-grade', args),
    publishGradesBatch: (args: {
      baseUrl: string;
      apiKey: string;
      courseId: string;
      assignmentId: string;
      grades: Array<{
        userId: string;
        grade: number;
        feedback?: string;
      }>;
    }) => ipcRenderer.invoke('moodle:publish-grades-batch', args),
    getAssignmentGradeDetails: (args: {
      baseUrl: string;
      apiKey: string;
      assignmentId: string;
      userId?: string;
    }) => ipcRenderer.invoke('moodle:get-assignment-grade-details', args),
  },
  moodleAuth: {
    getPresetUrl: () => ipcRenderer.invoke('moodle:get-preset-url'),
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
