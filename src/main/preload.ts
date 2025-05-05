// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// namespace
type AuthChannels = 'auth:sign-in' | 'auth:signed-in';
type WindowChannels = 'window:create-tab' | 'window:close-tab' | 'window:focus-tab' | 'window:rename-tab' | 'window:sync-state' | 'window:tab-created';
type MenuChannels = 'menu:close-tab' | 'menu:new-tab';
type MiscChannels = 'ipc-example';
type DbChannels = 'db:initialize' | 'db:query' | 'db:transaction' | 'db:close';
type SystemChannels = 'system:get-cpu-usage' | 'system:get-memory-usage' | 'system:get-storage-usage';


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
  | SystemChannels;

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
  window: {
    createTab: (...args: unknown[]) => ipcRenderer.invoke('window:create-tab', ...args),
    closeTab: (...args: unknown[]) => ipcRenderer.invoke('window:close-tab', ...args),
    focusTab: (...args: unknown[]) => ipcRenderer.invoke('window:focus-tab', ...args),
    renameTab: (...args: unknown[]) => ipcRenderer.invoke('window:rename-tab', ...args),
    syncState: (...args: unknown[]) => ipcRenderer.send('window:sync-state', ...args),
  },
  menu: {
    newTab: (...args: unknown[]) => ipcRenderer.invoke('menu:new-tab', ...args),
    closeTab: (...args: unknown[]) => ipcRenderer.invoke('menu:close-tab', ...args),
  },
  api: {
    getUrl: () => ipcRenderer.invoke('api:get-url'),
  },
  fileSystem: {
    openFolderDialog: () => ipcRenderer.invoke('folder:open-dialog'),
    getFolderContents: (folderPath: string) => ipcRenderer.invoke('folder:get-contents', folderPath)
  }
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
