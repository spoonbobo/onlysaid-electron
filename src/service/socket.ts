import io from 'socket.io-client';
import { IUser } from '@/../../types/User/User';
import { IChatMessage } from '@/../../types/Chat/Message';

export class SocketClient {
  private socketInstance: any = null;
  private socketServerUrl: string | null = null;
  private currentUser: IUser | null = null;

  // Message tracking to prevent duplicates/loops
  private deletedMessageTracker: Set<string> = new Set();

  // Callbacks storage
  private messageCallback: ((message: IChatMessage) => void) | null = null;
  private messageDeletedCallback: ((data: { roomId: string, messageId: string }) => void) | null = null;
  private roomUpdateCallback: ((room: any) => void) | null = null;
  private connectCallback: (() => void) | null = null;
  private disconnectCallback: (() => void) | null = null;

  constructor() { }

  initialize(user: IUser): void {
    console.log("Socket URL", process.env.SOCKET_SERVER_URL);
    this.socketServerUrl = process.env.SOCKET_SERVER_URL || 'https://onlysaid-dev.com';
    console.log("Connecting to socket server:", this.socketServerUrl);
    this.currentUser = user;

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
        if (this.disconnectCallback) this.disconnectCallback();
      });

      this.setupMessageListener();
      this.setupMessageDeletedListener();
      this.setupRoomUpdateListener();
    }
  }

  close(): void {
    if (this.socketInstance) {
      this.socketInstance.disconnect();
      this.socketInstance = null;
    }
    this.currentUser = null;
  }

  sendMessage(message: IChatMessage): void {
    if (this.socketInstance && this.socketInstance.connected) {
      this.socketInstance.emit('send_message', message);
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


  // Private helper methods
  private setupMessageListener(): void {
    if (!this.socketInstance) return;

    this.socketInstance.on('new_message', (message: IChatMessage) => {
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

  private setupRoomUpdateListener(): void {
    if (!this.socketInstance) return;

    this.socketInstance.on('room_update', (room: any) => {
      if (this.roomUpdateCallback) {
        this.roomUpdateCallback(room);
      }
    });
  }
}