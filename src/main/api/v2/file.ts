import { ipcMain } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import onlysaidServiceInstance from './service';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import os from 'os';

// Queue for managing file operations
class FileOperationQueue {
  protected queue: Array<{
    id: string;
    operation: () => Promise<any>;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    error?: Error;
    result?: any;
  }> = [];
  private processing = false;
  protected webSocketClient: any;
  protected progressListeners: Map<string, (progress: number) => void> = new Map();

  setWebSocketClient(client: any) {
    this.webSocketClient = client;
  }

  addOperation(operation: () => Promise<any>): string {
    const id = uuidv4();
    this.queue.push({
      id,
      operation,
      status: 'pending',
      progress: 0
    });

    this.processQueue();
    return id;
  }

  onProgress(id: string, listener: (progress: number) => void) {
    this.progressListeners.set(id, listener);
  }

  updateProgress(id: string, progress: number) {
    const operation = this.queue.find(op => op.id === id);
    if (operation) {
      operation.progress = progress;

      // Call progress listener if exists
      const listener = this.progressListeners.get(id);
      if (listener) listener(progress);

      if (this.webSocketClient) {
        this.webSocketClient.emit('file:progress', { id, progress });
      }
    }
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const current = this.queue.find(op => op.status === 'pending');

    if (!current) {
      this.processing = false;
      return;
    }

    current.status = 'processing';

    try {
      const result = await current.operation();
      current.status = 'completed';
      current.progress = 100;
      current.result = result;

      if (this.webSocketClient) {
        this.webSocketClient.emit('file:completed', { id: current.id });
      }
    } catch (error) {
      current.status = 'failed';
      current.error = error as Error;

      if (this.webSocketClient) {
        this.webSocketClient.emit('file:error', {
          id: current.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.processing = false;
    this.processQueue();
  }

  getStatus(id: string) {
    const operation = this.queue.find(op => op.id === id);
    return operation ? {
      id: operation.id,
      status: operation.status,
      progress: operation.progress,
      error: operation.error?.message,
      result: operation.result
    } : null;
  }
}

const fileQueue = new FileOperationQueue();

// Initialize socket connection when setting up file handlers
export function setupFileHandlers(): void {
  // Upload file to workspace
  ipcMain.handle('file:upload', async (event, args: {
    workspaceId: string,
    filePath: string,
    token: string,
    metadata?: Record<string, any>
  }) => {
    const { workspaceId, filePath, token, metadata = {} } = args;

    const opId = fileQueue.addOperation(async () => {
      const stats = await fs.stat(filePath);
      const filename = path.basename(filePath);
      const fileSize = stats.size;

      // Create form data
      const FormData = require('form-data');
      const form = new FormData();
      const fileStream = createReadStream(filePath);

      // Add file to form data
      form.append('file', fileStream, { filename });
      form.append('metadata', JSON.stringify(metadata));

      const response = await onlysaidServiceInstance.post(
        `workspace/${workspaceId}/file`,
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / fileSize);
            fileQueue.updateProgress(opId, progress);
          }
        }
      );

      return response.data;
    });

    // Return operationId to renderer
    const { operationId } = { operationId: opId };

    // Set up progress event listener for this operation
    const progressListener = (progress: number) => {
      event.sender.send('file:progress-update', { operationId, progress });
    };

    // Add to operation listeners
    fileQueue.onProgress(opId, progressListener);

    return { operationId: opId };
  });

  // Download file from workspace
  ipcMain.handle('file:download', async (event, args: {
    workspaceId: string,
    fileId: string,
    destinationPath: string,
    token: string
  }) => {
    const { workspaceId, fileId, destinationPath, token } = args;

    const opId = fileQueue.addOperation(async () => {
      const response = await onlysaidServiceInstance.get(
        `workspace/${workspaceId}/file?fileId=${fileId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          responseType: 'stream',
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              fileQueue.updateProgress(opId, progress);
            }
          }
        }
      );

      const writer = createWriteStream(destinationPath);
      await pipeline(response.data, writer);

      return { path: destinationPath };
    });

    return { operationId: opId };
  });

  // Get operation status
  ipcMain.handle('file:status', (event, { operationId }) => {
    return fileQueue.getStatus(operationId);
  });

  // Cancel operation (if possible)
  ipcMain.handle('file:cancel', (event, { operationId }) => {
    // Implementation would depend on how cancelable your operations are
    return { canceled: false, message: 'Operation cancellation not implemented' };
  });

  // Add this to setupFileHandlers function
  ipcMain.handle('upload-file', async (event, args) => {
    const { workspaceId, fileData, fileName, token, metadata = {} } = args;

    try {
      // Convert base64 data to buffer
      const base64Data = fileData.split(';base64,').pop();
      if (!base64Data) {
        throw new Error('Invalid file data format');
      }

      const buffer = Buffer.from(base64Data, 'base64');

      // Create temp file
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, fileName);
      await fs.writeFile(tempFilePath, buffer);

      // Use the actual buffer size for more accurate progress tracking
      const actualFileSize = buffer.length;

      console.log(`📊 File size - Original: ${fileName}, Buffer: ${actualFileSize} bytes`);

      // Now use the existing file:upload handler
      const { operationId } = await uploadFileToWorkspace(
        event,
        {
          workspaceId,
          filePath: tempFilePath,
          token,
          metadata: {
            ...metadata,
            originalSize: actualFileSize // Store actual size for reference
          }
        }
      );

      return { operationId };
    } catch (error) {
      console.error('Error processing file upload:', error);
      throw error;
    }
  });

  // Handler to get metadata for a single file
  ipcMain.handle('file:get-metadata', async (event, args: { workspaceId: string; fileId: string; token: string }) => {
    const { workspaceId, fileId, token } = args;
    if (!workspaceId || !fileId || !token) {
      // Consider throwing an error or returning a structured error response
      console.error('Missing workspaceId, fileId, or token for file:get-metadata');
      throw new Error('Missing workspaceId, fileId, or token for file:get-metadata');
    }
    try {
      const response = await onlysaidServiceInstance.get(
        // The service instance likely prepends the base URL
        `workspace/${workspaceId}/file/metadata?fileId=${fileId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      return response.data; // Assuming response.data contains { message: string, data: IFile }
    } catch (error: any) {
      console.error(`Error fetching metadata for file ${fileId} in workspace ${workspaceId}:`, error.response?.data || error.message);
      throw error.response?.data || new Error('Failed to get file metadata');
    }
  });

  // Handler to get metadata for multiple files
  ipcMain.handle('file:get-multiple-metadata', async (event, args: { workspaceId: string; fileIds: string[]; token: string }) => {
    const { workspaceId, fileIds, token } = args;
    if (!workspaceId || !fileIds || !Array.isArray(fileIds) || !token) {
      console.error('Missing or invalid workspaceId, fileIds, or token for file:get-multiple-metadata');
      throw new Error('Missing or invalid workspaceId, fileIds, or token for file:get-multiple-metadata');
    }
    try {
      const response = await onlysaidServiceInstance.post(
        // The service instance likely prepends the base URL
        `workspace/${workspaceId}/file/metadata`,
        { fileIds }, // body
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data; // Assuming response.data contains { message: string, data: IFile[] }
    } catch (error: any) {
      console.error(`Error fetching metadata for multiple files in workspace ${workspaceId}:`, error.response?.data || error.message);
      throw error.response?.data || new Error('Failed to get multiple files metadata');
    }
  });
}

// Enhanced upload function with multi-stage progress tracking
async function uploadFileToWorkspace(event: any, args: any) {
  const { workspaceId, filePath, token, metadata = {} } = args;

  const opId = fileQueue.addOperation(async () => {
    try {
      const stats = await fs.stat(filePath);
      const filename = path.basename(filePath);
      const actualFileSize = stats.size;

      console.log(`📊 Starting upload for ${filename}, size: ${actualFileSize} bytes`);

      // Create form data
      const FormData = require('form-data');
      const form = new FormData();
      const fileStream = createReadStream(filePath);

      // Add file to form data
      form.append('file', fileStream, { filename });
      form.append('metadata', JSON.stringify(metadata));

      const response = await onlysaidServiceInstance.post(
        `workspace/${workspaceId}/file`,
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 5 * 60 * 1000,
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / actualFileSize);
            console.log(`📡 Real network progress: ${progress}%`);

            // ✅ Only send to IPC - no fake socket progress
            event.sender.send('file:progress-update', {
              operationId: opId,
              progress,
              timestamp: Date.now()
            });
          }
        }
      );

      console.log(`✅ Upload completed for ${filename}`);
      return response.data;
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(filePath);
        console.log(`🗑️ Cleaned up temp file: ${filePath}`);
      } catch (error) {
        console.error('Error cleaning up temp file:', error);
      }
    }
  });

  return { operationId: opId };
}

// Enhanced file queue with stage tracking
class EnhancedFileOperationQueue extends FileOperationQueue {
  updateProgressWithStage(id: string, progress: number, stage?: string, details?: any) {
    const operation = this.queue.find(op => op.id === id);
    if (operation) {
      operation.progress = progress;
      (operation as any).stage = stage;
      (operation as any).details = details;

      const listener = this.progressListeners.get(id);
      if (listener) listener(progress);

      if (this.webSocketClient) {
        this.webSocketClient.emit('file:progress', {
          id,
          progress,
          stage,
          details
        });
      }
    }
  }
}
