// Main process human-in-the-loop implementation with LangGraph support
import { Command, interrupt } from "@langchain/langgraph";
import { ipcMain, BrowserWindow } from 'electron';

// Human-in-the-loop interaction types
export interface HumanInteractionRequest {
  type: 'approval' | 'edit' | 'input' | 'tool_approval';
  id: string;
  title: string;
  description: string;
  data: any;
  timestamp: number;
  threadId: string;
}

export interface HumanInteractionResponse {
  id: string;
  approved: boolean;
  editedData?: any;
  userInput?: string;
  timestamp: number;
}

export interface ToolApprovalRequest {
  toolName: string;
  toolArgs: any;
  description: string;
  risk: 'low' | 'medium' | 'high';
}

export interface StateEditRequest {
  currentState: any;
  editableFields: string[];
  instructions: string;
}

// ✅ Proper Command constructor following LangGraph pattern
export function createCommand(options: { resume?: any; update?: any }): Command {
  return new Command(options);
}

// Main process human-in-the-loop manager for LangGraph workflows
export class MainHumanInTheLoopManager {
  private static instance: MainHumanInTheLoopManager;
  private pendingInteractions: Map<string, HumanInteractionRequest> = new Map();
  private responseCallbacks: Map<string, (response: HumanInteractionResponse) => void> = new Map();
  private mainWindow: BrowserWindow | null = null;

  private constructor() {}

  public static getInstance(): MainHumanInTheLoopManager {
    if (!MainHumanInTheLoopManager.instance) {
      MainHumanInTheLoopManager.instance = new MainHumanInTheLoopManager();
    }
    return MainHumanInTheLoopManager.instance;
  }

  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  // Request human approval for tool execution with LangGraph interrupt
  public async requestToolApproval(
    toolName: string,
    toolArgs: any,
    description: string,
    risk: 'low' | 'medium' | 'high' = 'medium',
    threadId: string
  ): Promise<boolean> {
    const interactionId = `tool_approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const request: HumanInteractionRequest = {
      type: 'tool_approval',
      id: interactionId,
      title: `Approve Tool Execution: ${toolName}`,
      description,
      data: {
        toolName,
        toolArgs,
        risk
      },
      timestamp: Date.now(),
      threadId
    };

    console.log('[MainHumanInTheLoop] Requesting tool approval:', request);

    // Store the pending interaction
    this.pendingInteractions.set(interactionId, request);

    // Send to renderer for UI display
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('agent:human_interaction_request', {
        interactionId,
        request
      });
    }

    // ✅ Use proper LangGraph interrupt pattern
    try {
      const response = interrupt({
        type: 'tool_approval',
        toolCall: {
          name: toolName,
          arguments: toolArgs,
          description,
          risk
        },
        message: `Please approve the execution of ${toolName}`,
        threadId
      });
      
      // This line won't be reached during interrupt - execution pauses here
      return response?.approved ?? false;
      
    } catch (interruptError: any) {
      if (interruptError.name === 'GraphInterrupt') {
        // This is expected - re-throw to properly pause the graph
        throw interruptError;
      }
      console.error('[MainHumanInTheLoop] Error in tool approval:', interruptError);
      return false;
    }
  }

  // Request human to edit state with LangGraph interrupt
  public async requestStateEdit<T>(
    currentState: T,
    editableFields: (keyof T)[],
    instructions: string,
    threadId: string
  ): Promise<T> {
    const interactionId = `state_edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const request: HumanInteractionRequest = {
      type: 'edit',
      id: interactionId,
      title: 'Edit State',
      description: instructions,
      data: {
        currentState,
        editableFields,
        instructions
      },
      timestamp: Date.now(),
      threadId
    };

    console.log('[MainHumanInTheLoop] Requesting state edit:', request);

    // Store the pending interaction
    this.pendingInteractions.set(interactionId, request);

    // Send to renderer for UI display
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('agent:human_interaction_request', {
        interactionId,
        request
      });
    }

    // Use LangGraph interrupt to pause execution
    const response = interrupt({
      type: 'state_edit',
      request,
      message: instructions
    });

    // Return edited state or original if no edits
    return response?.editedData ?? currentState;
  }

  // Request human input with LangGraph interrupt
  public async requestHumanInput(
    prompt: string,
    context: any,
    threadId: string
  ): Promise<string> {
    const interactionId = `human_input_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const request: HumanInteractionRequest = {
      type: 'input',
      id: interactionId,
      title: 'Human Input Required',
      description: prompt,
      data: {
        prompt,
        context
      },
      timestamp: Date.now(),
      threadId
    };

    console.log('[MainHumanInTheLoop] Requesting human input:', request);

    // Store the pending interaction
    this.pendingInteractions.set(interactionId, request);

    // Send to renderer for UI display
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('agent:human_interaction_request', {
        interactionId,
        request
      });
    }

    // Use LangGraph interrupt to pause execution
    const response = interrupt({
      type: 'human_input',
      request,
      message: prompt
    });

    return response?.userInput ?? '';
  }

  // Request general approval with LangGraph interrupt
  public async requestApproval(
    title: string,
    description: string,
    data: any,
    threadId: string
  ): Promise<boolean> {
    const interactionId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const request: HumanInteractionRequest = {
      type: 'approval',
      id: interactionId,
      title,
      description,
      data,
      timestamp: Date.now(),
      threadId
    };

    console.log('[MainHumanInTheLoop] Requesting approval:', request);

    // Store the pending interaction
    this.pendingInteractions.set(interactionId, request);

    // Send to renderer for UI display
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('agent:human_interaction_request', {
        interactionId,
        request
      });
    }

    // Use LangGraph interrupt to pause execution
    const response = interrupt({
      type: 'approval',
      request,
      message: description
    });

    return response?.approved ?? false;
  }

  // Handle response from renderer process
  public handleResponse(interactionId: string, response: HumanInteractionResponse): void {
    console.log('[MainHumanInTheLoop] Handling response:', { interactionId, response });
    
    const callback = this.responseCallbacks.get(interactionId);
    if (callback) {
      callback(response);
      this.responseCallbacks.delete(interactionId);
    }
    this.pendingInteractions.delete(interactionId);

    // Send response back to renderer to update UI state
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('agent:human_interaction_response', {
        interactionId,
        response
      });
    }
  }

  // Create a Command to resume execution with human response
  public createResumeCommand(interactionId: string, response: HumanInteractionResponse): Command {
    console.log('[MainHumanInTheLoop] Creating resume command:', { interactionId, response });
    
    return createCommand({
      resume: response
    });
  }

  // Helper to create approval response
  public createApprovalResponse(
    interactionId: string,
    approved: boolean,
    editedData?: any,
    userInput?: string
  ): HumanInteractionResponse {
    return {
      id: interactionId,
      approved,
      editedData,
      userInput,
      timestamp: Date.now()
    };
  }

  // Get pending interactions for a thread
  public getPendingInteractions(threadId?: string): HumanInteractionRequest[] {
    const interactions = Array.from(this.pendingInteractions.values());
    return threadId 
      ? interactions.filter(req => req.threadId === threadId)
      : interactions;
  }

  // Clear interactions for a thread
  public clearInteractions(threadId: string): void {
    const toDelete = Array.from(this.pendingInteractions.entries())
      .filter(([_, req]) => req.threadId === threadId)
      .map(([id, _]) => id);
    
    toDelete.forEach(id => {
      this.pendingInteractions.delete(id);
      this.responseCallbacks.delete(id);
    });
  }
}

// Setup IPC handlers for human-in-the-loop
export function setupHumanInTheLoopHandlers(mainWindow: BrowserWindow) {
  const manager = MainHumanInTheLoopManager.getInstance();
  manager.setMainWindow(mainWindow);

  // Handle human interaction responses from renderer
  ipcMain.handle('agent:human_interaction_response', async (event, { interactionId, response }) => {
    console.log('[MainHumanInTheLoop] Received response from renderer:', { interactionId, response });
    manager.handleResponse(interactionId, response);
    return { success: true };
  });

  // Handle requests to get pending interactions
  ipcMain.handle('agent:get_pending_interactions', async (event, { threadId }) => {
    return manager.getPendingInteractions(threadId);
  });

  // Handle requests to clear interactions
  ipcMain.handle('agent:clear_interactions', async (event, { threadId }) => {
    manager.clearInteractions(threadId);
    return { success: true };
  });

  console.log('[MainHumanInTheLoop] IPC handlers setup complete');
}

// Helper functions for easy access in main process
export const getMainHumanInTheLoopManager = (): MainHumanInTheLoopManager => 
  MainHumanInTheLoopManager.getInstance();

export const requestToolApproval = (
  toolName: string,
  toolArgs: any,
  description: string,
  risk: 'low' | 'medium' | 'high' = 'medium',
  threadId: string
): Promise<boolean> => 
  MainHumanInTheLoopManager.getInstance().requestToolApproval(toolName, toolArgs, description, risk, threadId);

export const requestStateEdit = <T>(
  currentState: T,
  editableFields: (keyof T)[],
  instructions: string,
  threadId: string
): Promise<T> => 
  MainHumanInTheLoopManager.getInstance().requestStateEdit(currentState, editableFields, instructions, threadId);

export const requestHumanInput = (
  prompt: string,
  context: any,
  threadId: string
): Promise<string> => 
  MainHumanInTheLoopManager.getInstance().requestHumanInput(prompt, context, threadId);

export const requestApproval = (
  title: string,
  description: string,
  data: any,
  threadId: string
): Promise<boolean> => 
  MainHumanInTheLoopManager.getInstance().requestApproval(title, description, data, threadId); 