import { ipcMain, BrowserWindow } from 'electron';
import { SocketClient } from '../service/socket';

export const setupSocketHandlers = (mainWindow: BrowserWindow): void => {
  const socketClient = new SocketClient();

  // Add a readiness handler
  ipcMain.handle('socket:is-ready', () => true);

  // IPC handlers for socket operations
  ipcMain.handle('socket:initialize', async (_event, user, token) => {
    console.log('Socket initialize handler called with user:', user?.username);
    
    // Generate deviceId in main process
    const crypto = require('crypto');
    const os = require('os');
    const deviceId = crypto.createHash('sha256')
      .update(os.hostname() + os.platform() + os.arch())
      .digest('hex')
      .substring(0, 16);
    
    socketClient.initialize(user, deviceId, token);
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

  // Add new leave workspace handler
  ipcMain.handle('socket:leave-workspace', (_event, workspaceId) => {
    socketClient.leaveWorkspace(workspaceId);
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

  // Add file progress event forwarding
  socketClient.onFileProgress((data) => {
    console.log(`📡 Received file progress: ${data.operationId} - ${data.progress}%`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('file:progress-update', {
        operationId: data.operationId,
        progress: data.progress,
        stage: data.stage,
        timestamp: Date.now()
      });
    }
  });

  socketClient.onFileCompleted((data) => {
    console.log(`✅ Received file completed: ${data.operationId}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('file:completed', {
        operationId: data.operationId,
        result: data.result,
        timestamp: Date.now()
      });
    }
  });

  socketClient.onFileError((data) => {
    console.log(`❌ Received file error: ${data.operationId}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('file:error', {
        operationId: data.operationId,
        error: data.error,
        timestamp: Date.now()
      });
    }
  });

  // Add new workspace event forwarding
  socketClient.onWorkspaceJoined((data) => {
    // console.log('Main: User joined workspace, forwarding to renderer', data);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('socket:workspace-joined', data);
    }
  });

  socketClient.onWorkspaceLeft((data) => {
    console.log('Main: User left workspace, forwarding to renderer', data);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('socket:workspace-left', data);
    }
  });
};
