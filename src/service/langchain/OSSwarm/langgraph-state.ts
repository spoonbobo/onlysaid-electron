import { BaseMessage } from "@langchain/core/messages";
import { AgentCard } from '@/../../types/Agent/AgentCard';

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
  
  // ✅ CRITICAL FIX: Enhanced human oversight with proper state tracking
  pendingApprovals: ToolApprovalRequest[];
  approvalHistory: ApprovalRecord[];
  waitingForHumanResponse: boolean; // New field to track if workflow is paused
  
  // Knowledge base integration
  kbContext?: {
    enabled: boolean;
    workspaceId: string;
    selectedKbIds: string[];
    retrievedKnowledge: KnowledgeChunk[];
  };
  
  // Communication
  streamCallback?: (update: string) => void;
  
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
  status: 'idle' | 'busy' | 'completed' | 'failed';
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
