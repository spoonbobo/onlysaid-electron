// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import os from 'os';

// namespace
type AuthChannels = 'auth:sign-in' | 'auth:signed-in';
type MenuChannels = 'menu:close-tab' | 'menu:new-tab';
type MiscChannels = 'ipc-example';
type DbChannels = 'db:initialize' | 'db:query' | 'db:transaction' | 'db:close';
type SystemChannels = 'system:get-cpu-usage' | 'system:get-memory-usage' | 'system:get-storage-usage';
type FileSystemChannels = 'get-file-content';

type SSEChannels = 'streaming:abort_stream' | 'streaming:chat_stream_complete' | 'streaming:chunk' | 'streaming:query_stream_complete';
type MCPChannels = 'mcp:initialize_client' | 'mcp:list_tools';

type ApiChatChannels = 'chat:get' | 'chat:create' | 'chat:update' | 'chat:delete';
type ApiUserChannels = 'user:auth' | 'user:get' | 'user:get_one' | 'user:update';
type ApiWorkspaceChannels =
  | 'workspace:get'
  | 'workspace:create'
  | 'workspace:update'
  | 'workspace:delete'
  | 'workspace:add_users'
  | 'workspace:remove_user'
  | 'workspace:get_users';
type ApiChannels = ApiChatChannels | ApiUserChannels | ApiWorkspaceChannels;

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
  | 'socket:join-workspace';

export type Channels =
  | AuthChannels
  | DbChannels
  | ApiChannels
  | MenuChannels
  | MiscChannels
  | SystemChannels
  | SSEChannels
  | MCPChannels
  | FileSystemChannels
  | RedisChannels
  | SocketChannels;

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
  },
  auth: {
    signIn: (...args: unknown[]) => ipcRenderer.invoke('auth:sign-in', ...args),
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
  },
  workspace: {
    get: (...args: unknown[]) => ipcRenderer.invoke('workspace:get', ...args),
    create: (...args: unknown[]) => ipcRenderer.invoke('workspace:create', ...args),
    update: (...args: unknown[]) => ipcRenderer.invoke('workspace:update', ...args),
    delete: (...args: unknown[]) => ipcRenderer.invoke('workspace:delete', ...args),
    add_users: (...args: unknown[]) => ipcRenderer.invoke('workspace:add_users', ...args),
    get_users: (...args: unknown[]) => ipcRenderer.invoke('workspace:get_users', ...args),
    remove_user: (...args: unknown[]) => ipcRenderer.invoke('workspace:remove_user', ...args),
  },
  chat: {
    get: (...args: unknown[]) => ipcRenderer.invoke('chat:get', ...args),
    create: (...args: unknown[]) => ipcRenderer.invoke('chat:create', ...args),
    update: (...args: unknown[]) => ipcRenderer.invoke('chat:update', ...args),
    delete: (...args: unknown[]) => ipcRenderer.invoke('chat:delete', ...args),
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
  },
  fileSystem: {
    openFolderDialog: () => ipcRenderer.invoke('folder:open-dialog'),
    getFolderContents: (folderPath: string) => ipcRenderer.invoke('folder:get-contents', folderPath),
    uploadFile: (...args: unknown[]) => ipcRenderer.invoke('upload-file', ...args),
    getFileContent: (...args: unknown[]) => ipcRenderer.invoke('get-file-content', ...args),
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
    initialize: (user: any) => ipcRenderer.invoke('socket:initialize', user),
    close: () => ipcRenderer.invoke('socket:close'),
    sendMessage: (message: any, workspaceId: string) => ipcRenderer.invoke('socket:send-message', message, workspaceId),
    deleteMessage: (roomId: string, messageId: string) =>
      ipcRenderer.invoke('socket:delete-message', { roomId, messageId }),
    sendPing: () => ipcRenderer.invoke('socket:send-ping'),
    joinWorkspace: (workspaceId: string) => ipcRenderer.invoke('socket:join-workspace', workspaceId),
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
