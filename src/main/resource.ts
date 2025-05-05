import { ipcMain } from 'electron';
import { promisify } from 'util';
import childProcess from 'child_process';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

// Setup all system resource related IPC handlers
export function setupResourceHandlers() {
  // Get CPU usage of the Electron app
  ipcMain.handle('system:get-cpu-usage', async () => {
    try {
      // Get initial CPU usage for the current process
      const startUsage = process.cpuUsage();

      // Wait a bit to measure delta
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get CPU usage after the delay and calculate the difference
      const endUsage = process.cpuUsage(startUsage);

      // Convert from microseconds to milliseconds and calculate percentage
      const totalUsage = endUsage.user + endUsage.system;

      // Convert to percentage of CPU used during the measured time period
      const cpuPercent = (totalUsage / 5000) * 100;

      // Cap at 100% for single core representation
      return Math.min(cpuPercent, 100);
    } catch (error) {
      console.error('Error getting Electron app CPU usage:', error);
      return 0;
    }
  });

  // Get memory usage of the Electron app
  ipcMain.handle('system:get-memory-usage', async () => {
    try {
      // Get memory usage for the current process
      const memoryUsage = process.memoryUsage();

      // Return RSS (Resident Set Size) and heapTotal (total allocated heap)
      return {
        total: memoryUsage.heapTotal,  // Total heap allocated
        used: memoryUsage.heapUsed,    // Heap actually used
        rss: memoryUsage.rss           // Resident Set Size - total memory allocated
      };
    } catch (error) {
      console.error('Error getting Electron app memory usage:', error);
      return { total: 0, used: 0, rss: 0 };
    }
  });

  const exec = promisify(childProcess.exec);

  // Directory size calculation helper
  const getDirSize = async (dirPath: string): Promise<number> => {
    try {
      const files = await fs.promises.readdir(dirPath);
      const stats = await Promise.all(
        files.map(async (file: string) => {
          const filePath = path.join(dirPath, file);
          const stat = await fs.promises.stat(filePath);

          if (stat.isDirectory()) {
            return getDirSize(filePath);
          }
          return stat.size;
        })
      );

      return stats.reduce((acc: number, size: number) => acc + size, 0);
    } catch (e) {
      console.error(`Error calculating dir size for ${dirPath}:`, e);
      return 0;
    }
  };

  // Add this handler
  ipcMain.handle('system:get-storage-usage', async () => {
    try {
      const userDataPath = app.getPath('userData');

      // Get app storage size (recursively)
      const appStorageUsed = await getDirSize(userDataPath);

      // Get disk space info
      let free = 0;
      let total = 0;

      // Platform-specific disk space check
      if (process.platform === 'win32') {
        // Windows
        const drive = path.parse(userDataPath).root;
        const { stdout } = await exec(`wmic logicaldisk where "DeviceID='${drive.charAt(0)}:'" get FreeSpace,Size /format:csv`);
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(',');
          if (parts.length >= 3) {
            free = parseInt(parts[1], 10) || 0;
            total = parseInt(parts[2], 10) || 0;
          }
        }
      } else {
        // Linux/macOS
        const { stdout } = await exec(`df -k "${userDataPath}"`);
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          if (parts.length >= 4) {
            // df returns sizes in 1K blocks, convert to bytes
            total = parseInt(parts[1], 10) * 1024 || 0;
            free = parseInt(parts[3], 10) * 1024 || 0;
          }
        }
      }

      return {
        appStorage: appStorageUsed,
        free,
        total
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return { appStorage: 0, free: 0, total: 0 };
    }
  });
}
