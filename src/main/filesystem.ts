import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Setup all file system related IPC handlers
export function setupFileSystemHandlers() {
  // Dialog to open folder
  ipcMain.handle('folder:open-dialog', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      throw new Error('Window not found');
    }

    return dialog.showOpenDialog(window, {
      properties: ['openDirectory']
    });
  });

  // Get contents of a folder
  ipcMain.handle('folder:get-contents', async (event, folderPath) => {
    try {
      const files = await readdir(folderPath);
      const fileNodes = await Promise.all(
        files.map(async (name) => {
          try {
            const filePath = path.join(folderPath, name);
            const fileStat = await stat(filePath);

            // Skip hidden files and folders (starting with .)
            if (name.startsWith('.')) {
              return null;
            }

            if (fileStat.isDirectory()) {
              return {
                id: `dir-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                name,
                path: filePath,
                type: 'directory' as const,
                children: [], // Empty array, will be loaded on demand
                isExpanded: false
              };
            } else {
              return {
                id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                name,
                path: filePath,
                type: 'file' as const
              };
            }
          } catch (err) {
            console.error(`Error processing file ${name}:`, err);
            return null;
          }
        })
      );

      // Filter out null values (from hidden files or errors)
      return fileNodes.filter(Boolean);
    } catch (err) {
      console.error(`Error reading directory ${folderPath}:`, err);
      throw err;
    }
  });
}