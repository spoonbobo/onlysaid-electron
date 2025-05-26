import io from 'socket.io-client';
import { IUser } from '@/../../types/User/User';
import { IChatMessage } from '@/../../types/Chat/Message';

export class SocketClient {
  private socketInstance: any = null;
  private socketServerUrl: string | null = null;
  private currentUser: IUser | null = null;
  private currentSocketId: string | null = null;

  // Message tracking to prevent duplicates/loops
  private deletedMessageTracker: Set<string> = new Set();

  // Callbacks storage
  private messageCallback: ((message: IChatMessage) => void) | null = null;
  private messageDeletedCallback: ((data: { roomId: string, messageId: string }) => void) | null = null;
  // private roomUpdateCallback: ((room: any) => void) | null = null; // Commented out as server doesn't seem to emit 'room_update'
  private connectCallback: (() => void) | null = null;
  private disconnectCallback: (() => void) | null = null;
  private pongCallback: ((data: { timestamp: number }) => void) | null = null;
  private connectionDetailsCallback: ((details: { socketId: string }) => void) | null = null;
  private fileProgressCallback: ((data: { operationId: string, progress: number, stage?: string }) => void) | null = null;
  private fileCompletedCallback: ((data: { operationId: string, result?: any }) => void) | null = null;
  private fileErrorCallback: ((data: { operationId: string, error: string }) => void) | null = null;

  constructor() { }

  initialize(user: IUser): void {
    console.log("Socket URL", process.env.SOCKET_SERVER_URL);
    this.socketServerUrl = process.env.SOCKET_SERVER_URL || 'https://onlysaid-dev.com';
    console.log("Connecting to socket server:", this.socketServerUrl);
    this.currentUser = user;
    this.currentSocketId = null;

    if (this.socketInstance) {
      this.socketInstance.disconnect();
    }

    this.socketInstance = io(this.socketServerUrl, {
      path: '/socket.io/',
      auth: {
        user: user
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    if (this.socketInstance) {
      // Add error handling
      this.socketInstance.on('connect_error', (err: any) => {
        console.error('Socket connection error:', err.message);
      });

      this.socketInstance.on('connect_timeout', () => {
        console.error('Socket connection timeout');
      });

      this.socketInstance.on('error', (err: any) => {
        console.error('Socket error:', err);
      });

      this.socketInstance.on('connect', () => {
        console.log('Socket connected successfully');
        if (this.connectCallback) this.connectCallback();
      });

      this.socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        this.currentSocketId = null;
        if (this.disconnectCallback) this.disconnectCallback();
      });

      this.setupMessageListener();
      this.setupMessageDeletedListener();
      this.setupPongListener();
      this.setupConnectionEstablishedListener();
      this.setupFileProgressListeners();
    }
  }

  close(): void {
    if (this.socketInstance) {
      this.socketInstance.disconnect();
      this.socketInstance = null;
    }
    this.currentUser = null;
    this.currentSocketId = null;
  }

  sendMessage(message: IChatMessage, workspaceId: string): void {
    // console.log('SocketClient: Emitting message', message);
    // console.log('SocketClient: Socket instance', this.socketInstance);
    // console.log('SocketClient: Socket instance connected', this.socketInstance?.connected);
    if (this.socketInstance && this.socketInstance.connected) {
      // console.log('SocketClient: Emitting message to socket', message);
      this.socketInstance.emit('message', { message, workspaceId });
    } else {
      console.warn('Socket not connected, cannot send message');
    }
  }

  deleteMessage(roomId: string, messageId: string): void {
    if (this.socketInstance && this.socketInstance.connected) {
      this.socketInstance.emit('delete_message', { roomId, messageId });
      this.deletedMessageTracker.add(messageId);
    }
  }

  sendPing(): void {
    if (this.socketInstance && this.socketInstance.connected) {
      console.log('SocketClient: Emitting ping');
      this.socketInstance.emit('ping', { timestamp: Date.now() });
    } else {
      console.warn('Socket not connected, cannot send ping');
    }
  }

  onConnect(callback: () => void): void {
    this.connectCallback = callback;
  }

  onDisconnect(callback: () => void): void {
    this.disconnectCallback = callback;
  }

  onMessage(callback: (message: IChatMessage) => void): void {
    this.messageCallback = callback;
  }

  onMessageDeleted(callback: (data: { roomId: string, messageId: string }) => void): void {
    this.messageDeletedCallback = callback;
  }

  onPong(callback: (data: { timestamp: number }) => void): void {
    this.pongCallback = callback;
  }

  onConnectionEstablished(callback: (details: { socketId: string }) => void): void {
    this.connectionDetailsCallback = callback;
  }

  joinWorkspace(workspaceId: string): void {
    if (this.socketInstance && this.socketInstance.connected) {
      this.socketInstance.emit('join_workspace', workspaceId);
    } else {
      console.warn('Socket not connected, cannot join workspace');
    }
  }

  onFileProgress(callback: (data: { operationId: string, progress: number, stage?: string }) => void): void {
    this.fileProgressCallback = callback;
  }

  onFileCompleted(callback: (data: { operationId: string, result?: any }) => void): void {
    this.fileCompletedCallback = callback;
  }

  onFileError(callback: (data: { operationId: string, error: string }) => void): void {
    this.fileErrorCallback = callback;
  }

  // Private helper methods
  private setupMessageListener(): void {
    if (!this.socketInstance) return;

    this.socketInstance.on('message', (message: IChatMessage) => {
      if (this.messageCallback) {
        this.messageCallback(message);
      }
    });
  }

  private setupMessageDeletedListener(): void {
    if (!this.socketInstance) return;

    this.socketInstance.on('message_deleted', (data: { roomId: string, messageId: string }) => {
      if (!this.deletedMessageTracker.has(data.messageId) && this.messageDeletedCallback) {
        this.messageDeletedCallback(data);
      }
      this.deletedMessageTracker.delete(data.messageId);
    });
  }

  private setupPongListener(): void {
    if (!this.socketInstance) return;

    this.socketInstance.on('pong', (data: { timestamp: number }) => {
      console.log('SocketClient: Received pong', data);
      if (this.pongCallback) {
        this.pongCallback(data);
      }
    });
  }

  private setupConnectionEstablishedListener(): void {
    if (!this.socketInstance) return;

    this.socketInstance.on('connection_established', (data: { socketId: string }) => {
      console.log('SocketClient: Connection established with details', data);
      this.currentSocketId = data.socketId;
      if (this.connectionDetailsCallback) {
        this.connectionDetailsCallback(data);
      }
    });
  }

  private setupFileProgressListeners(): void {
    if (!this.socketInstance) return;

    this.socketInstance.on('file:progress', (data: { operationId: string, progress: number, stage?: string }) => {
      if (this.fileProgressCallback) {
        this.fileProgressCallback(data);
      }
    });

    this.socketInstance.on('file:completed', (data: { operationId: string, result?: any }) => {
      if (this.fileCompletedCallback) {
        this.fileCompletedCallback(data);
      }
    });

    this.socketInstance.on('file:error', (data: { operationId: string, error: string }) => {
      if (this.fileErrorCallback) {
        this.fileErrorCallback(data);
      }
    });
  }
}