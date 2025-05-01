// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example' | 'auth:sign-in' | 'auth:signed-in' |
  'db:initialize' | 'db:query' | 'db:transaction' | 'db:close' | 'api:get-rooms' | 'api:get-url' |
  'window:create-tab' | 'window:close-tab' | 'window:focus-tab' | 'window:rename-tab' |
  'window:sync-state' | 'window:tab-created' | 'menu:close-tab' | 'menu:new-tab';

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
  api: {
    getApiUrl: () => ipcRenderer.invoke('api:get-url')
  }
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
