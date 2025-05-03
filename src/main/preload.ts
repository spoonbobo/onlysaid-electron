// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// namespace
type AuthChannels = 'auth:sign-in' | 'auth:signed-in';
type WindowChannels = 'window:create-tab' | 'window:close-tab' | 'window:focus-tab' | 'window:rename-tab' | 'window:sync-state' | 'window:tab-created';
type MenuChannels = 'menu:close-tab' | 'menu:new-tab';
type MiscChannels = 'ipc-example';
type DbChannels = 'db:initialize' | 'db:query' | 'db:transaction' | 'db:close';


type ApiChatroomChannels = 'api:chatroom:get';
type ApiChannels = ApiChatroomChannels;

export type Channels =
  | AuthChannels
  | DbChannels
  | ApiChannels
  | WindowChannels
  | MenuChannels
  | MiscChannels;

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
  chatroom: {
    get: (...args: unknown[]) => ipcRenderer.invoke('chatroom:get', ...args),
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
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
