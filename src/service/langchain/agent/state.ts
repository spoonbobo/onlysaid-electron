import { BaseMessage } from "@langchain/core/messages";
import { AgentCard } from '@/../../types/Agent/AgentCard';

// ✅ NEW: WebContents wrapper for safe IPC communication
export interface SafeWebContents {
  send: (channel: string, ...args: any[]) => boolean;
  isDestroyed: () => boolean;
  isValid: () => boolean;
}

export interface LangGraphOSSwarmState {
  // Core task data
  originalTask: string;
  messages: BaseMessage[];
  taskDecomposition: SubTask[];
  currentPhase: 'initialization' | 'decomposition' | 'agent_selection' | 'execution' | 'synthesis' | 'validation';
  
  // Agent Cards integration (using existing types)
  availableAgentCards: AgentCard[];
  activeAgentCards: { [role: string]: AgentCard };
  agentResults: { [role: string]: AgentExecutionResult };
  
  // Execution context
  executionId: string;
  chatId?: string;
  workspaceId?: string;
  iterationCount: number;
  threadId: string;
  
  // ✅ ENHANCED: Communication layer with safe webContents
  webContents?: SafeWebContents;
  streamCallback?: (update: string) => void;
  ipcSend?: (channel: string, ...args: any[]) => void;
  
  // ✅ CRITICAL FIX: Enhanced human oversight with proper state tracking
  pendingApprovals: ToolApprovalRequest[];
  approvalHistory: ApprovalRecord[];
  waitingForHumanResponse: boolean;
  
  // Knowledge base integration
  kbContext?: {
    enabled: boolean;
    workspaceId: string;
    selectedKbIds: string[];
    retrievedKnowledge: KnowledgeChunk[];
  };
  
  // Error handling
  errors: string[];
  recoveryAttempts: number;
  
  // Final output
  synthesizedResult?: string;
  confidence: number;
}

export interface AgentExecutionResult {
  agentCard: AgentCard;
  result: string;
  toolExecutions: ToolExecution[];
  status: 'idle' | 'busy' | 'completed' | 'failed' | 'awaiting_approval';
  startTime: number;
  endTime?: number;
}

// ✅ CRITICAL FIX: Enhanced ToolApprovalRequest with proper state tracking
export interface ToolApprovalRequest {
  id: string;
  agentCard: AgentCard;
  toolCall: any;
  context: string;
  timestamp: number;
  risk: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'denied' | 'executed' | 'failed';
  mcpServer: string;
  result?: any;
  error?: string;
  processed?: boolean;
}

export interface ToolExecution {
  id: string;
  toolName: string;
  approved: boolean;
  result?: any;
  error?: string;
  timestamp: number;
}

export interface SubTask {
  id: string;
  description: string;
  assignedRole?: string;
  priority: number;
}

export interface ApprovalRecord {
  id: string;
  approved: boolean;
  timestamp: number;
  agentCard: AgentCard;
}

export interface KnowledgeChunk {
  id: string;
  content: string;
  source: string;
  relevance: number;
}

// ✅ NEW: Factory function to create safe webContents wrapper
export function createSafeWebContents(webContents: any): SafeWebContents {
  return {
    send: (channel: string, ...args: any[]): boolean => {
      try {
        if (webContents && !webContents.isDestroyed()) {
          webContents.send(channel, ...args);
          return true;
        }
        return false;
      } catch (error: any) {
        console.warn(`[SafeWebContents] Failed to send IPC message to channel '${channel}':`, error.message);
        return false;
      }
    },
    
    isDestroyed: (): boolean => {
      try {
        return !webContents || webContents.isDestroyed();
      } catch (error) {
        return true;
      }
    },
    
    isValid: (): boolean => {
      try {
        return webContents && !webContents.isDestroyed() && webContents.mainFrame;
      } catch (error) {
        return false;
      }
    }
  };
}
