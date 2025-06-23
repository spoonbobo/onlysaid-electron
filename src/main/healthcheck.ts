import { ipcMain } from 'electron';
import { healthCheck } from './api/v2/service';

let healthCheckInterval: NodeJS.Timeout | null = null;
let currentToken: string | null = null;
const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const setupHealthCheckHandlers = () => {
  // Start periodic health check
  ipcMain.handle('health:start-periodic-check', async (event, token: string) => {
    if (!token) {
      return { success: false, error: 'No token provided' };
    }

    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }

    currentToken = token;
    
    healthCheckInterval = setInterval(async () => {
      try {
        const isHealthy = await healthCheck(currentToken!);
        
        if (!isHealthy) {
          event.sender.send('health:check-failed');
        }
      } catch (error) {
        event.sender.send('health:check-failed');
      }
    }, HEALTH_CHECK_INTERVAL);

    // Perform initial health check immediately
    try {
      const initialCheck = await healthCheck(token);
      if (!initialCheck) {
        event.sender.send('health:check-failed');
      }
    } catch (error) {
      event.sender.send('health:check-failed');
    }

    return { success: true };
  });

  // Check if health check is running
  ipcMain.handle('health:is-running', async () => {
    return {
      isRunning: healthCheckInterval !== null,
      hasToken: currentToken !== null,
      interval: HEALTH_CHECK_INTERVAL
    };
  });

  // Stop periodic health check
  ipcMain.handle('health:stop-periodic-check', async () => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
      currentToken = null;
    }
    return { success: true };
  });

  // Manual health check
  ipcMain.handle('health:check', async (event, token: string) => {
    try {
      const isHealthy = await healthCheck(token);
      return { healthy: isHealthy };
    } catch (error) {
      return { healthy: false };
    }
  });
};

// Clean up on app quit
export const cleanupHealthCheck = () => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    currentToken = null;
  }
}; 