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
  toolExecutionResult?: {
    success: boolean;
    result?: any;
    error?: string;
    toolName: string;
    mcpServer?: string;
  };
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

// Renderer-safe Command interface (for compatibility)
export interface Command {
  resume?: any;
  update?: any;
}

// ✅ Renderer-safe Command constructor
export function createCommand(options: { resume?: any; update?: any }): Command {
  return {
    resume: options.resume,
    update: options.update
  };
}

// Renderer-only human-in-the-loop manager (communicates with main process)
export class HumanInTheLoopManager {
  private static instance: HumanInTheLoopManager;
  private pendingInteractions: Map<string, HumanInteractionRequest> = new Map();
  private responseCallbacks: Map<string, (response: HumanInteractionResponse) => void> = new Map();

  private constructor() {
    // Setup IPC listeners for responses from main process
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.ipcRenderer.on('agent:human_interaction_request', (...args) => {
        const payload = args[1] as { interactionId: string; request: HumanInteractionRequest };
        console.log('[RendererHumanInTheLoop] Received interaction request:', payload);
        
        // Store the interaction for UI display
        this.pendingInteractions.set(payload.interactionId, payload.request);
      });

      window.electron.ipcRenderer.on('agent:human_interaction_response', (...args) => {
        const payload = args[1] as { interactionId: string; response: HumanInteractionResponse };
        console.log('[RendererHumanInTheLoop] Received interaction response:', payload);
        
        // Handle the response
        this.handleResponse(payload.interactionId, payload.response);
      });
    }
  }

  public static getInstance(): HumanInTheLoopManager {
    if (!HumanInTheLoopManager.instance) {
      HumanInTheLoopManager.instance = new HumanInTheLoopManager();
    }
    return HumanInTheLoopManager.instance;
  }

  // Send response to main process
  public async sendResponse(interactionId: string, response: HumanInteractionResponse): Promise<void> {
    if (typeof window !== 'undefined' && window.electron) {
      try {
        await window.electron.ipcRenderer.invoke('agent:human_interaction_response', {
          interactionId,
          response
        });
        console.log('[RendererHumanInTheLoop] Response sent to main process:', { interactionId, response });
      } catch (error) {
        console.error('[RendererHumanInTheLoop] Error sending response to main process:', error);
      }
    }
  }

  // Handle response (for internal callback management)
  private handleResponse(interactionId: string, response: HumanInteractionResponse): void {
    const callback = this.responseCallbacks.get(interactionId);
    if (callback) {
      callback(response);
      this.responseCallbacks.delete(interactionId);
    }
    this.pendingInteractions.delete(interactionId);
  }

  // These methods are mainly for compatibility - actual execution happens in main process
  public async requestToolApproval(
    toolName: string,
    toolArgs: any,
    description: string,
    risk: 'low' | 'medium' | 'high' = 'medium',
    threadId: string
  ): Promise<boolean> {
    console.warn('[RendererHumanInTheLoop] requestToolApproval called in renderer - this should be called from main process');
    return false;
  }

  public async requestStateEdit<T>(
    currentState: T,
    editableFields: (keyof T)[],
    instructions: string,
    threadId: string
  ): Promise<T> {
    console.warn('[RendererHumanInTheLoop] requestStateEdit called in renderer - this should be called from main process');
    return currentState;
  }

  public async requestHumanInput(
    prompt: string,
    context: any,
    threadId: string
  ): Promise<string> {
    console.warn('[RendererHumanInTheLoop] requestHumanInput called in renderer - this should be called from main process');
    return '';
  }

  public async requestApproval(
    title: string,
    description: string,
    data: any,
    threadId: string
  ): Promise<boolean> {
    console.warn('[RendererHumanInTheLoop] requestApproval called in renderer - this should be called from main process');
    return false;
  }

  // Create a Command to resume execution with human response
  public createResumeCommand(interactionId: string, response: HumanInteractionResponse): Command {
    console.log('[RendererHumanInTheLoop] Creating resume command:', { interactionId, response });
    
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

    // Also clear on main process
    if (typeof window !== 'undefined' && window.electron) {
      window.electron.ipcRenderer.invoke('agent:clear_interactions', { threadId });
    }
  }
}

// Helper functions for easy access (renderer-side)
export const getHumanInTheLoopManager = (): HumanInTheLoopManager => 
  HumanInTheLoopManager.getInstance();

// These are mainly for compatibility - actual execution should happen in main process
export const requestToolApproval = (
  toolName: string,
  toolArgs: any,
  description: string,
  risk: 'low' | 'medium' | 'high' = 'medium',
  threadId: string
): Promise<boolean> => {
  console.warn('[RendererHumanInTheLoop] requestToolApproval should be called from main process');
  return Promise.resolve(false);
};

export const requestStateEdit = <T>(
  currentState: T,
  editableFields: (keyof T)[],
  instructions: string,
  threadId: string
): Promise<T> => {
  console.warn('[RendererHumanInTheLoop] requestStateEdit should be called from main process');
  return Promise.resolve(currentState);
};

export const requestHumanInput = (
  prompt: string,
  context: any,
  threadId: string
): Promise<string> => {
  console.warn('[RendererHumanInTheLoop] requestHumanInput should be called from main process');
  return Promise.resolve('');
};

export const requestApproval = (
  title: string,
  description: string,
  data: any,
  threadId: string
): Promise<boolean> => {
  console.warn('[RendererHumanInTheLoop] requestApproval should be called from main process');
  return Promise.resolve(false);
};

// Deprecated functions from old abort controller - marked for removal
/**
 * @deprecated Use HumanInTheLoopManager instead
 */
export const getGlobalAbortController = (): AbortController => {
  console.warn('[DEPRECATED] getGlobalAbortController is deprecated. Use HumanInTheLoopManager instead.');
  return new AbortController();
};

/**
 * @deprecated Use HumanInTheLoopManager.requestApproval instead
 */
export const abortCurrentExecution = (reason?: string): void => {
  console.warn('[DEPRECATED] abortCurrentExecution is deprecated. Use HumanInTheLoopManager.requestApproval for user confirmation instead.');
};

/**
 * @deprecated Use HumanInTheLoopManager instead
 */
export const resetGlobalAbortController = (): void => {
  console.warn('[DEPRECATED] resetGlobalAbortController is deprecated. Use HumanInTheLoopManager instead.');
};

/**
 * @deprecated Use HumanInTheLoopManager instead
 */
export const isExecutionAborted = (): boolean => {
  console.warn('[DEPRECATED] isExecutionAborted is deprecated. Use HumanInTheLoopManager instead.');
  return false;
};

/**
 * @deprecated Use HumanInTheLoopManager instead
 */
export const shouldAbortNewOperations = (): boolean => {
  console.warn('[DEPRECATED] shouldAbortNewOperations is deprecated. Use HumanInTheLoopManager instead.');
  return false;
};
