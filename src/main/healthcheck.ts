import { ipcMain } from 'electron';
import { healthCheck } from './api/v2/service';

let healthCheckInterval: NodeJS.Timeout | null = null;
let currentToken: string | null = null;
const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const setupHealthCheckHandlers = () => {
  // Start periodic health check
  ipcMain.handle('health:start-periodic-check', async (event, token: string) => {
    if (!token) {
      console.warn('[HealthCheck] No token provided, cannot start health check');
      return { success: false, error: 'No token provided' };
    }

    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }

    currentToken = token;
    console.log('[HealthCheck] Starting periodic health check for logged-in user');
    console.log('[HealthCheck] Token preview:', token.substring(0, 10) + '...');
    
    healthCheckInterval = setInterval(async () => {
      console.log('[HealthCheck] Running periodic health check...');
      try {
        const isHealthy = await healthCheck(currentToken!);
        
        if (!isHealthy) {
          console.warn('[HealthCheck] Health check failed, notifying renderer');
          event.sender.send('health:check-failed');
        } else {
          console.log('[HealthCheck] Health check passed ✅');
        }
      } catch (error) {
        console.error('[HealthCheck] Error during health check:', error);
        event.sender.send('health:check-failed');
      }
    }, HEALTH_CHECK_INTERVAL);

    // Perform initial health check immediately
    console.log('[HealthCheck] Performing initial health check...');
    try {
      const initialCheck = await healthCheck(token);
      if (!initialCheck) {
        console.warn('[HealthCheck] Initial health check failed');
        event.sender.send('health:check-failed');
      } else {
        console.log('[HealthCheck] Initial health check passed ✅');
      }
    } catch (error) {
      console.error('[HealthCheck] Initial health check error:', error);
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
      console.log('[HealthCheck] Stopped periodic health check');
    }
    return { success: true };
  });

  // Manual health check
  ipcMain.handle('health:check', async (event, token: string) => {
    console.log('[HealthCheck] Manual health check requested');
    try {
      const isHealthy = await healthCheck(token);
      console.log('[HealthCheck] Manual health check result:', isHealthy);
      return { healthy: isHealthy };
    } catch (error) {
      console.error('[HealthCheck] Manual health check error:', error);
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