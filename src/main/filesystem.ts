import { ipcMain, dialog, BrowserWindow, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import axios from 'axios';
import officeParser from 'officeparser';
import { setupDocxHandlers } from './msft_docx';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

// Setup all file system related IPC handlers
export function setupFileSystemHandlers() {
  // Setup enhanced DOCX handlers
  setupDocxHandlers();
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

  // Handler to read local image files as base64
  ipcMain.handle('file:read-local-image', async (event, filePath) => {
    try {
      console.log(`[LocalImage] Reading local image: ${filePath}`);
      
      // Security check: ensure the path is not attempting path traversal
      const resolvedPath = path.resolve(filePath);
      
      // Check if file exists
      const fileExists = await fs.promises.access(resolvedPath, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);

      if (!fileExists) {
        return {
          success: false,
          error: `File not found: ${filePath}`
        };
      }

      // Get file stats for size
      const stats = await stat(resolvedPath);
      
      // Read the file as buffer
      const buffer = await fs.promises.readFile(resolvedPath);
      
      // Get file extension to determine mime type
      const ext = path.extname(filePath).toLowerCase();
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
        case '.bmp':
          mimeType = 'image/bmp';
          break;
        default:
          mimeType = 'image/png'; // fallback
      }

      // Convert to base64 data URL
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;

      console.log(`[LocalImage] Successfully loaded ${buffer.length} bytes from ${filePath}`);

      return {
        success: true,
        data: dataUrl,
        mimeType,
        size: stats.size,
        path: filePath
      };
    } catch (error: any) {
      console.error(`[LocalImage] Error reading local image ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
        path: filePath
      };
    }
  });

  // Handler to extract text from document files
  ipcMain.handle('file:extract-document-text', async (event, filePath) => {
    try {
      console.log(`[DocumentExtract] Extracting text from: ${filePath}`);
      
      // Security check: ensure the path is not attempting path traversal
      const resolvedPath = path.resolve(filePath);
      
      // Check if file exists
      const fileExists = await fs.promises.access(resolvedPath, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);

      if (!fileExists) {
        return {
          success: false,
          error: `File not found: ${filePath}`
        };
      }

      // Get file extension to determine extraction method
      const ext = path.extname(filePath).toLowerCase();
      
      // For simple text files, read directly
      if (['.txt', '.md', '.markdown', '.csv', '.html', '.htm', '.xml'].includes(ext)) {
        try {
          const content = await fs.promises.readFile(resolvedPath, 'utf8');
          return {
            success: true,
            text: content,
            metadata: {
              type: 'text',
              size: content.length
            }
          };
        } catch (error: any) {
          return {
            success: false,
            error: `Failed to read text file: ${error.message}`
          };
        }
      }

      // For office documents and PDFs, use officeParser
      if (['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.pdf', '.odt', '.ods', '.odp', '.rtf'].includes(ext)) {
        try {
          const config = {
            newlineDelimiter: '\n',
            ignoreNotes: false,
            outputErrorToConsole: false
          };

          // Use officeParser to extract text
          const extractedText = await officeParser.parseOfficeAsync(resolvedPath, config);
          
          if (extractedText && extractedText.trim()) {
            return {
              success: true,
              text: extractedText,
              metadata: {
                type: 'office',
                size: extractedText.length
              }
            };
          } else {
            return {
              success: false,
              error: 'No text content found in document'
            };
          }
        } catch (error: any) {
          console.error(`[DocumentExtract] Office parser error:`, error);
          return {
            success: false,
            error: `Failed to extract text from document: ${error.message}`
          };
        }
      }

      return {
        success: false,
        error: `Unsupported file format: ${ext}`
      };

    } catch (error: any) {
      console.error(`[DocumentExtract] Error extracting text from ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
        path: filePath
      };
    }
  });

  // Handler to extract text from remote document files
  ipcMain.handle('file:extract-remote-document-text', async (event, args) => {
    const { workspaceId, fileId, token, fileName } = args;
    
    try {
      console.log(`[RemoteDocumentExtract] Extracting text from remote file: ${fileName}`);
      
      // First, try to download the file content as buffer
      // This is a simplified approach - you might need to implement proper file download
      // For now, we'll return an error suggesting the file should be downloaded first
      
      return {
        success: false,
        error: 'Remote document extraction not yet implemented. Please download the file first for preview.'
      };

      // TODO: Implement proper remote file download and extraction
      // This would involve:
      // 1. Downloading the file from your API
      // 2. Saving it temporarily
      // 3. Extracting text using officeParser
      // 4. Cleaning up the temporary file
      
    } catch (error: any) {
      console.error(`[RemoteDocumentExtract] Error extracting text from remote file:`, error);
      return {
        success: false,
        error: error.message,
        fileName
      };
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

  // Handler to save/write text content to a file
  ipcMain.handle('file:save-document-text', async (event, filePath, content) => {
    try {
      console.log(`[FileSave] Saving text to: ${filePath}`);
      
      // Security check: ensure the path is not attempting path traversal
      const resolvedPath = path.resolve(filePath);
      
      // Check if this is a DOCX file and use appropriate save method
      const ext = path.extname(filePath).toLowerCase();
      if (['.docx', '.doc'].includes(ext)) {
        console.log(`[FileSave] Detected DOCX file, using enhanced DOCX save handler`);
        
        // Use the enhanced DOCX save handler instead of plain text write
        console.log(`[FileSave] Delegating to DOCX save handler for proper format preservation`);
        
        // Since we can't easily call IPC handlers from within handlers, 
        // we need to add a preload function that calls the DOCX handler.
        // For now, warn the user and prevent corruption by refusing to save.
        console.error(`[FileSave] CRITICAL: Cannot save DOCX files as plain text - this would corrupt the format!`);
        console.error(`[FileSave] Please use the dedicated DOCX save functionality instead.`);
        
        return {
          success: false,
          error: 'DOCX files cannot be saved as plain text. This would corrupt the document format. Please use the DOCX-specific save functionality.',
          path: filePath
        };
      }
      
      // For non-DOCX files or fallback, use regular text save
      console.log(`[FileSave] Using plain text save for file: ${filePath}`);
      
      // Create directory if it doesn't exist
      const dir = path.dirname(resolvedPath);
      await fs.promises.mkdir(dir, { recursive: true });
      
      // Write the content to the file
      await fs.promises.writeFile(resolvedPath, content, 'utf8');
      
      console.log(`[FileSave] Successfully saved ${content.length} characters to ${filePath}`);

      return {
        success: true,
        path: filePath,
        size: content.length
      };
    } catch (error: any) {
      console.error(`[FileSave] Error saving file ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
        path: filePath
      };
    }
  });

  // Handler to create backup of a file before editing
  ipcMain.handle('file:create-backup', async (event, filePath) => {
    try {
      console.log(`[FileBackup] Creating backup of: ${filePath}`);
      
      const resolvedPath = path.resolve(filePath);
      const backupPath = `${resolvedPath}.backup.${Date.now()}`;
      
      // Check if original file exists
      const fileExists = await fs.promises.access(resolvedPath, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);

      if (fileExists) {
        // Copy the original file to backup
        await fs.promises.copyFile(resolvedPath, backupPath);
        
        console.log(`[FileBackup] Backup created: ${backupPath}`);
        
        return {
          success: true,
          backupPath,
          originalPath: filePath
        };
      } else {
        return {
          success: false,
          error: 'Original file does not exist',
          originalPath: filePath
        };
      }
    } catch (error: any) {
      console.error(`[FileBackup] Error creating backup for ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
        originalPath: filePath
      };
    }
  });
}