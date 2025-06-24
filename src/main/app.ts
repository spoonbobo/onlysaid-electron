import { ipcMain, app, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createHash } from 'crypto';

// Setup all app-related IPC handlers
export function setupAppHandlers() {
  // Get app name
  ipcMain.handle('app:get-name', () => {
    // Check environment variable first, then fall back to package.json
    return process.env.APP_NAME || process.env.ELECTRON_APP_NAME || app.getName();
  });

  // Get product name
  ipcMain.handle('app:get-product-name', () => {
    // For product name, we can use a different env var or the same logic
    return process.env.PRODUCT_NAME || process.env.APP_PRODUCT_NAME || app.getName();
  });

  // Get app version
  ipcMain.handle('app:get-version', async () => {
    try {
      return app.getVersion();
    } catch (error) {
      console.error('Error getting app version:', error);
      return 'Unknown';
    }
  });

  // Get build time
  ipcMain.handle('app:get-build-time', async () => {
    try {
      // Use package.json modification time
      const packagePath = app.isPackaged
        ? path.join(process.resourcesPath, 'app', 'package.json')
        : path.join(__dirname, '../../package.json');

      const stats = fs.statSync(packagePath);
      return stats.mtime.toISOString();
    } catch (error) {
      console.error('Error getting build time:', error);
      return new Date().toISOString();
    }
  });

  // Get device ID
  ipcMain.handle('app:get-device-id', async () => {
    try {
      // Try to get or create a persistent device ID
      const deviceIdPath = path.join(app.getPath('userData'), 'device-id');

      // Check if device ID already exists
      if (fs.existsSync(deviceIdPath)) {
        const existingId = fs.readFileSync(deviceIdPath, 'utf8').trim();
        if (existingId && existingId.length === 16) {
          return existingId.toUpperCase();
        }
      }

      // Generate new device ID based on more stable system info
      const machineInfo = [
        os.platform(),
        os.arch(),
        os.cpus()[0]?.model || 'unknown-cpu',
        os.totalmem().toString(),
        // Add MAC address if available (more stable than hostname)
        Object.values(os.networkInterfaces())
          .flat()
          .find(iface => iface && !iface.internal && iface.mac !== '00:00:00:00:00:00')?.mac || 'no-mac'
      ].join('-');

      const deviceId = createHash('sha256')
        .update(machineInfo)
        .digest('hex')
        .substring(0, 16);

      // Store the device ID for persistence
      try {
        fs.writeFileSync(deviceIdPath, deviceId.toUpperCase(), 'utf8');
      } catch (writeError) {
        console.warn('Could not persist device ID:', writeError);
      }

      return deviceId.toUpperCase();
    } catch (error) {
      console.error('Error getting device ID:', error);

      // Fallback to timestamp-based ID
      const fallbackId = createHash('sha256')
        .update(`fallback-${Date.now()}-${Math.random()}`)
        .digest('hex')
        .substring(0, 16);

      return fallbackId.toUpperCase();
    }
  });

  // Get device info
  ipcMain.handle('app:get-device-info', async () => {
    try {
      return {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        osVersion: os.release(),
        totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)), // GB
        cpuCount: os.cpus().length,
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
      };
    } catch (error) {
      console.error('Error getting device info:', error);
      return {
        platform: 'Unknown',
        arch: 'Unknown',
        hostname: 'Unknown',
        osVersion: 'Unknown',
        totalMemory: 0,
        cpuCount: 0,
        nodeVersion: 'Unknown',
        electronVersion: 'Unknown',
      };
    }
  });

  // Open account management page
  ipcMain.handle('app:open-account-management', async () => {
    try {
      const domain = process.env.ONLYSAID_DOMAIN || 'https://onlysaid.com';
      const url = `${domain}/zh-HK/signin`;
      await shell.openExternal(url);
      return { success: true };
    } catch (error: any) {
      console.error('Error opening account management:', error);
      return { success: false, error: error.message };
    }
  });
}
