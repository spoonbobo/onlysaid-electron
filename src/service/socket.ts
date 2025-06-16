import io from 'socket.io-client';
import { IUser } from '@/../../types/User/User';
import { IChatMessage } from '@/../../types/Chat/Message';

export class SocketClient {
  private socketInstance: any = null;
  private socketServerUrl: string | null = null;
  private currentUser: IUser | null = null;
  private currentDeviceId: string | null = null;
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
  private workspaceJoinedCallback: ((data: { workspaceId: string, userId: string }) => void) | null = null;
  private workspaceLeftCallback: ((data: { workspaceId: string, userId: string }) => void) | null = null;

  constructor() { }

  async initialize(user: IUser, deviceId?: string, token?: string): Promise<void> {
    console.log("Socket URL", process.env.SOCKET_SERVER_URL);
    this.socketServerUrl = process.env.SOCKET_SERVER_URL || 'http://localhost:3001';
    console.log("Connecting to socket server:", this.socketServerUrl);
    this.currentUser = user;
    this.currentSocketId = null;

    // Use provided deviceId or generate fallback
    const finalDeviceId = deviceId || `fallback-${Date.now()}`;
    this.currentDeviceId = finalDeviceId;
    
    console.log("🔧 Initializing socket with:", { 
      user: user.username, 
      deviceId: finalDeviceId,
      url: this.socketServerUrl 
    });
    
    if (this.socketInstance) {
      this.socketInstance.disconnect();
    }

    this.socketInstance = io(this.socketServerUrl, {
      path: '/socket.io/',
      auth: {
        user: user,
        deviceId: finalDeviceId,
        token: token
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    // Add connection event logging
    this.socketInstance.on('connect_error', (err: any) => {
      console.error('❌ Socket connection error:', err);
    });

    this.socketInstance.on('connect', () => {
      console.log('✅ Socket connected successfully to:', this.socketServerUrl);
    });

    this.setupSocketListeners();
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
      // Use new user-level workspace joining
      this.socketInstance.emit('user_join_workspace', workspaceId);
    } else {
      console.warn('Socket not connected, cannot join workspace');
    }
  }

  leaveWorkspace(workspaceId: string): void {
    if (this.socketInstance && this.socketInstance.connected) {
      this.socketInstance.emit('user_leave_workspace', workspaceId);
    } else {
      console.warn('Socket not connected, cannot leave workspace');
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

  onWorkspaceJoined(callback: (data: { workspaceId: string, userId: string }) => void): void {
    this.workspaceJoinedCallback = callback;
  }

  onWorkspaceLeft(callback: (data: { workspaceId: string, userId: string }) => void): void {
    this.workspaceLeftCallback = callback;
  }

  // Private helper methods
  private setupSocketListeners(): void {
    if (!this.socketInstance) return;

    this.socketInstance.on('connect', () => {
      console.log('Socket connected successfully');
      if (this.connectCallback) this.connectCallback();
    });

    this.socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      this.currentSocketId = null;
      if (this.disconnectCallback) this.disconnectCallback();
    });

    // Add new workspace event listeners
    this.socketInstance.on('workspace_joined', (data: { workspaceId: string, userId: string }) => {
      console.log(`✅ Workspace joined: ${data.workspaceId}`);
      if (this.workspaceJoinedCallback) {
        this.workspaceJoinedCallback(data);
      }
    });

    this.socketInstance.on('workspace_left', (data: { workspaceId: string, userId: string }) => {
      console.log(`❌ Workspace left: ${data.workspaceId}`);
      if (this.workspaceLeftCallback) {
        this.workspaceLeftCallback(data);
      }
    });

    this.setupMessageListener();
    this.setupMessageDeletedListener();
    this.setupPongListener();
    this.setupConnectionEstablishedListener();
    this.setupFileProgressListeners();
  }

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