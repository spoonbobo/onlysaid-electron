import { ipcMain, BrowserWindow } from 'electron';
import { SocketClient } from '../service/socket';

export const setupSocketHandlers = (mainWindow: BrowserWindow): void => {
  const socketClient = new SocketClient();

  // Add a readiness handler
  ipcMain.handle('socket:is-ready', () => true);

  // IPC handlers for socket operations
  ipcMain.handle('socket:initialize', (_event, user) => {
    console.log('Socket initialize handler called with user:', user?.username);
    socketClient.initialize(user);
    return { success: true };
  });

  ipcMain.handle('socket:close', () => {
    socketClient.close();
  });

  ipcMain.handle('socket:send-message', (_event, message, workspaceId) => {
    socketClient.sendMessage(message, workspaceId);
  });

  ipcMain.handle('socket:delete-message', (_event, { roomId, messageId }) => {
    socketClient.deleteMessage(roomId, messageId);
  });

  ipcMain.handle('socket:send-ping', () => {
    console.log('Main: Received socket:send-ping request');
    socketClient.sendPing();
    return { success: true };
  });

  ipcMain.handle('socket:join-workspace', (_event, workspaceId) => {
    socketClient.joinWorkspace(workspaceId);
    return { success: true };
  });

  // Set up the event callbacks that will send events to renderer
  socketClient.onConnect(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('socket:connected');
    }
  });

  socketClient.onDisconnect(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('socket:disconnected');
    }
  });

  socketClient.onMessage((message) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('socket:new-message', message);
    }
  });

  socketClient.onMessageDeleted((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('socket:message-deleted', data);
    }
  });

  socketClient.onPong((data) => {
    console.log('Main: Received pong from SocketClient, forwarding to renderer', data);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('socket:pong', data);
    }
  });

  socketClient.onConnectionEstablished((details) => {
    console.log('Main: Received connection details from SocketClient, forwarding to renderer', details);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('socket:connection-details', details);
    }
  });

};
