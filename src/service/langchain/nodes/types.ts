// Types and interfaces for workflow nodes
import { BaseMessage } from "@langchain/core/messages";
import { AgentCard } from '@/../../types/Agent/AgentCard';
import { 
  AgentExecutionResult, 
  ToolApprovalRequest, 
  ToolExecution 
} from '../agent/state';
import { 
  HumanInteractionRequest, 
  HumanInteractionResponse 
} from '../human_in_the_loop/renderer/human_in_the_loop';

// Enhanced HumanInteractionResponse type to include execution timing
export interface EnhancedHumanInteractionResponse extends HumanInteractionResponse {
  toolExecutionResult?: {
    success: boolean;
    result?: any;
    error?: string;
    toolName: string;
    mcpServer?: string;
    executionDuration?: number;
    startTime?: number;
    endTime?: number;
  };
}

// Enhanced ToolApprovalRequest to include timing information
export interface TimedToolApprovalRequest extends ToolApprovalRequest {
  approvalStartTime?: number;
  executionStartTime?: number;
  executionEndTime?: number;
  totalDuration?: number;
}

// State type for workflow nodes
export type WorkflowState = {
  originalTask: string;
  messages: BaseMessage[];
  currentPhase: string;
  availableAgentCards: AgentCard[];
  activeAgentCards: { [role: string]: AgentCard };
  agentResults: { [role: string]: AgentExecutionResult };
  errors: string[];
  mcpExecutionResults: { [toolId: string]: any };
  toolTimings: { [toolId: string]: {
    approvalStartTime: number;
    executionStartTime?: number;
    executionEndTime?: number;
    totalDuration?: number;
    approvalDuration?: number;
    executionDuration?: number;
  } };
  pendingApprovals: ToolApprovalRequest[];
  waitingForHumanResponse: boolean;
  synthesizedResult?: string;
  executionId: string;
  streamCallback?: (update: string) => void;
  threadId: string;
  awaitingToolResults: boolean;
};

// Return type for workflow nodes
export type WorkflowNodeResult = Promise<Partial<WorkflowState>>; 