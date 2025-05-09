import { createClient } from 'redis';
import { app, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import RedisServer, { RedisServerOptions } from 'redis-server';

let redisClient: ReturnType<typeof createClient> | null = null;
let redisServerInstance: any = null;
const DEFAULT_PORT = 6379;
const DEFAULT_DATA_DIR = path.join(app.getPath('userData'), 'redis-data');

if (!fs.existsSync(DEFAULT_DATA_DIR)) {
    fs.mkdirSync(DEFAULT_DATA_DIR, { recursive: true });
}

const DEFAULT_CONFIG = {
    url: 'redis://localhost:6379',
    username: '',
    password: '',
    database: 0,
    socket: {
        reconnectStrategy: (retries: number) => Math.min(retries * 50, 3000),
    }
};

type RedisChannels = 'redis:connect' | 'redis:disconnect' | 'redis:get' | 'redis:set' |
    'redis:del' | 'redis:publish' | 'redis:subscribe' | 'redis:unsubscribe' |
    'redis:start-server' | 'redis:stop-server';

export const initializeRedisClient = async (config = DEFAULT_CONFIG) => {
    if (!redisClient) {
        try {
            console.log('Initializing Redis client with config:', JSON.stringify({
                ...config,
                password: config.password ? '******' : undefined
            }));

            redisClient = createClient(config);

            redisClient.on('error', (err) => console.error('Redis Client Error:', err));
            redisClient.on('connect', () => console.log('Redis Client Connected'));
            redisClient.on('reconnecting', () => console.log('Redis Client Reconnecting'));

            await redisClient.connect();
        } catch (error) {
            console.error('Failed to initialize Redis client:', error);
            throw error;
        }
    }

    return redisClient;
};

export const disconnectRedisClient = async () => {
    if (redisClient) {
        try {
            await redisClient.disconnect();
            redisClient = null;
            console.log('Redis client disconnected');
        } catch (error) {
            console.error('Error disconnecting Redis client:', error);
            throw error;
        }
    }
};

export const startRedisServer = async (port = DEFAULT_PORT): Promise<void> => {
    if (redisServerInstance) {
        console.log('Redis server already running');
        return;
    }

    try {
        const serverConfig = {
            port,
            bin: 'redis-server',
            conf: {
                dir: DEFAULT_DATA_DIR,
                'save': '60 1',
                'appendonly': 'yes',
                'appendfsync': 'everysec',
                'bind': '127.0.0.1',
                'protected-mode': 'yes'
            }
        };

        redisServerInstance = new RedisServer(serverConfig as unknown as RedisServerOptions);
        await redisServerInstance.open();
        console.log(`Redis server started on port ${port}`);
    } catch (error) {
        console.error('Failed to start Redis server:', error);
        throw error;
    }
};

export const stopRedisServer = async (): Promise<void> => {
    if (!redisServerInstance) {
        console.log('No Redis server running');
        return;
    }

    try {
        await redisServerInstance.close();
        redisServerInstance = null;
        console.log('Redis server stopped');
    } catch (error) {
        console.error('Error stopping Redis server:', error);
        throw error;
    }
};

export const setupRedisHandlers = () => {
    ipcMain.handle('redis:connect', async (_, config) => {
        try {
            const client = await initializeRedisClient(config || DEFAULT_CONFIG);
            return { success: true };
        } catch (error: any) {
            console.error('Redis connect error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('redis:disconnect', async () => {
        try {
            await disconnectRedisClient();
            return { success: true };
        } catch (error: any) {
            console.error('Redis disconnect error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('redis:get', async (_, key) => {
        try {
            if (!redisClient) {
                throw new Error('Redis client not initialized');
            }
            const value = await redisClient.get(key);
            return { success: true, data: value };
        } catch (error: any) {
            console.error(`Redis get error for key "${key}":`, error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('redis:set', async (_, key, value, options) => {
        try {
            if (!redisClient) {
                throw new Error('Redis client not initialized');
            }
            await redisClient.set(key, value, options);
            return { success: true };
        } catch (error: any) {
            console.error(`Redis set error for key "${key}":`, error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('redis:del', async (_, key) => {
        try {
            if (!redisClient) {
                throw new Error('Redis client not initialized');
            }
            const result = await redisClient.del(key);
            return { success: true, data: result };
        } catch (error: any) {
            console.error(`Redis del error for key "${key}":`, error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('redis:publish', async (_, channel, message) => {
        try {
            if (!redisClient) {
                throw new Error('Redis client not initialized');
            }
            const subscribers = await redisClient.publish(channel, message);
            return { success: true, data: subscribers };
        } catch (error: any) {
            console.error(`Redis publish error to channel "${channel}":`, error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('redis:start-server', async (_, port) => {
        try {
            await startRedisServer(port);
            return { success: true };
        } catch (error: any) {
            console.error('Redis server start error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('redis:stop-server', async () => {
        try {
            await stopRedisServer();
            return { success: true };
        } catch (error: any) {
            console.error('Redis server stop error:', error);
            return { success: false, error: error.message };
        }
    });
};

app.on('will-quit', async () => {
    await Promise.all([
        disconnectRedisClient(),
        stopRedisServer()
    ]);
});