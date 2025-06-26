import { ipcMain, dialog, BrowserWindow, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import FormData from 'form-data';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

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

  // Add handler to get local app assets
  ipcMain.handle('assets:get-local-asset', async (event, assetPath) => {
    try {
      // Use the same logic as main.ts for finding assets
      const RESOURCES_PATH = app.isPackaged
        ? path.join(process.resourcesPath, 'assets')
        : path.join(__dirname, '../../assets');
      
      console.log(`[Assets] Loading asset: ${assetPath}`);
      console.log(`[Assets] App packaged: ${app.isPackaged}`);
      console.log(`[Assets] Resources path: ${RESOURCES_PATH}`);
      
      // Resolve the asset path relative to the correct assets directory
      const absolutePath = path.join(RESOURCES_PATH, assetPath);
      console.log(`[Assets] Absolute path: ${absolutePath}`);
      
      // Security check: ensure the path is within the assets directory
      if (!absolutePath.startsWith(RESOURCES_PATH)) {
        throw new Error('Invalid asset path - outside assets directory');
      }

      // Check if file exists
      const fileExists = await fs.promises.access(absolutePath, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);

      if (!fileExists) {
        throw new Error(`Asset not found: ${assetPath}`);
      }

      // Read the file as buffer
      const buffer = await fs.promises.readFile(absolutePath);
      
      // Get file extension to determine mime type
      const ext = path.extname(assetPath).toLowerCase();
      let mimeType = 'application/octet-stream';
      
      switch (ext) {
        case '.png':
          mimeType = 'image/png';
          break;
        case '.jpg':
        case '.jpeg':
          mimeType = 'image/jpeg';
          break;
        case '.gif':
          mimeType = 'image/gif';
          break;
        case '.svg':
          mimeType = 'image/svg+xml';
          break;
        case '.ico':
          mimeType = 'image/x-icon';
          break;
        case '.webp':
          mimeType = 'image/webp';
          break;
      }

      // Convert to base64 data URL
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;

      return {
        data: dataUrl,
        mimeType,
        size: buffer.length,
        path: assetPath
      };
    } catch (error) {
      console.error(`Error loading local asset ${assetPath}:`, error);
      throw error;
    }
  });
}

export function setupContentHandlers() {
  // Handler to read file content
  ipcMain.handle('get-file-content', async (event, filePath) => {
    try {
      // Resolve the path relative to the app's root directory
      const absolutePath = path.resolve(process.cwd(), filePath);

      // Read the file
      const content = await readFile(absolutePath, 'utf8');
      return content;
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      throw error;
    }
  });

  // NEW: Handler to download and read submission content from Moodle
  ipcMain.handle('submission:download-and-read', async (event, args) => {
    const { fileUrl, fileName, apiToken } = args;
    
    try {
      console.log(`[Submission] Downloading submission from: ${fileUrl}`);
      console.log(`[Submission] File name: ${fileName}`);
      
      // Add token to URL if not already present
      const separator = fileUrl.includes('?') ? '&' : '?';
      const downloadUrl = `${fileUrl}${separator}token=${apiToken}`;
      
      // Download the file content
      const response = await axios.get(downloadUrl, {
        responseType: 'text', // For now, assume text content
        timeout: 30000 // 30 second timeout
      });
      
      const content = response.data;
      
      console.log(`[Submission] Successfully downloaded ${content.length} characters from ${fileName}`);
      console.log(`[Submission] Content preview:`, content.substring(0, 500));
      console.log(`[Submission] Full content:`, content);
      
      return {
        success: true,
        content,
        fileName,
        fileUrl,
        size: content.length,
        type: response.headers['content-type'] || 'text/plain'
      };
    } catch (error: any) {
      console.error(`[Submission] Error downloading submission file ${fileName}:`, error);
      return {
        success: false,
        error: error.message,
        fileName,
        fileUrl
      };
    }
  });
}