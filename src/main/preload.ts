// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import os from 'os';

// namespace
type AuthChannels = 'auth:sign-in' | 'auth:signed-in';
type WindowChannels =
    | 'window:create-tab'
    | 'window:close-tab'
    | 'window:focus-tab'
    | 'window:rename-tab'
    | 'window:sync-state'
    | 'window:tab-created'
    | 'window:create-window'
    | 'window:close-window'
    | 'window:focus-window'
    | 'window:detach-tab'
    | 'window:move-tab'
    | 'window:init'
    | 'window:tab-moved'
    | 'window:tab-detached'
    | 'window:tab-focused'
    | 'window:tab-closed'
    | 'window:bounds-changed'
    | 'window:state-changed'
    | 'window:get-active-tab';
type MenuChannels = 'menu:close-tab' | 'menu:new-tab';
type MiscChannels = 'ipc-example';
type DbChannels = 'db:initialize' | 'db:query' | 'db:transaction' | 'db:close';
type SystemChannels = 'system:get-cpu-usage' | 'system:get-memory-usage' | 'system:get-storage-usage';

type SSEChannels = 'streaming:abort_stream' | 'streaming:chat_stream_complete' | 'streaming:chunk';
type MCPChannels = 'mcp:initialize_client';

type ApiChatChannels = 'chat:get' | 'chat:create' | 'chat:update' | 'chat:delete';
type ApiUserChannels = 'user:auth' | 'user:get' | 'user:get_one';
type ApiChannels = ApiChatChannels | ApiUserChannels;

export type Channels =
    | AuthChannels
    | DbChannels
    | ApiChannels
    | WindowChannels
    | MenuChannels
    | MiscChannels
    | SystemChannels
    | SSEChannels
    | MCPChannels;

const electronHandler = {
    ipcRenderer: {
        sendMessage(channel: Channels, ...args: unknown[]) {
            ipcRenderer.send(channel, ...args);
        },
        on(channel: Channels, func: (...args: unknown[]) => void) {
            const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
                func(...args);
            ipcRenderer.on(channel, subscription);

            return () => {
                ipcRenderer.removeListener(channel, subscription);
            };
        },
        once(channel: Channels, func: (...args: unknown[]) => void) {
            ipcRenderer.once(channel, (_event, ...args) => func(...args));
        },
        invoke(channel: Channels, ...args: unknown[]) {
            return ipcRenderer.invoke(channel, ...args);
        },
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
    },
    window: {
        // Tab operations
        createTab: (...args: unknown[]) => ipcRenderer.invoke('window:create-tab', ...args),
        closeTab: (...args: unknown[]) => ipcRenderer.invoke('window:close-tab', ...args),
        focusTab: (...args: unknown[]) => ipcRenderer.invoke('window:focus-tab', ...args),
        renameTab: (...args: unknown[]) => ipcRenderer.invoke('window:rename-tab', ...args),

        // Window operations
        createWindow: (...args: unknown[]) => ipcRenderer.invoke('window:create-window', ...args),
        closeWindow: (...args: unknown[]) => ipcRenderer.invoke('window:close-window', ...args),
        focusWindow: (...args: unknown[]) => ipcRenderer.invoke('window:focus-window', ...args),

        // Multi-window tab operations
        detachTab: (...args: unknown[]) => ipcRenderer.invoke('window:detach-tab', ...args),
        moveTab: (...args: unknown[]) => ipcRenderer.invoke('window:move-tab', ...args),

        // State sync
        syncState: (...args: unknown[]) => ipcRenderer.send('window:sync-state', ...args),
        getActiveTab: (...args: unknown[]) => ipcRenderer.invoke('window:get-active-tab', ...args),
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
    },
    fileSystem: {
        openFolderDialog: () => ipcRenderer.invoke('folder:open-dialog'),
        getFolderContents: (folderPath: string) => ipcRenderer.invoke('folder:get-contents', folderPath),
        uploadFile: (...args: unknown[]) => ipcRenderer.invoke('upload-file', ...args),
    },
    homedir: () => os.homedir(),
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
