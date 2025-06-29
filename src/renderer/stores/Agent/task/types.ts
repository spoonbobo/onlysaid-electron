// Shared types for OSSwarm task management
export interface OSSwarmExecution {
  id: string;
  task_description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  result?: string;
  error?: string;
  user_id?: string;
  chat_id?: string;
  workspace_id?: string;
  config_snapshot?: string;
  total_agents: number;
  total_tasks: number;
  total_tool_executions: number;
}

export interface OSSwarmAgent {
  id: string;
  execution_id: string;
  agent_id: string;
  role: string;
  expertise?: string; // JSON array
  status: 'idle' | 'busy' | 'completed' | 'failed';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  current_task?: string;
  last_updated?: string;
}

export interface OSSwarmTask {
  id: string;
  execution_id: string;
  agent_id: string;
  task_description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  result?: string;
  error?: string;
  iterations: number;
  max_iterations: number;
  
  // New decomposition fields
  subtask_id?: string;
  parent_task_id?: string;
  required_skills?: string; // JSON array
  suggested_agent_types?: string; // JSON array
  estimated_complexity?: 'low' | 'medium' | 'high';
  coordination_notes?: string;
  is_decomposed_task?: boolean;
  task_breakdown_reasoning?: string;
  assignment_reason?: string;
}

export interface OSSwarmToolExecution {
  id: string;
  execution_id: string;
  agent_id: string;
  task_id?: string;
  tool_name: string;
  tool_arguments?: string; // JSON
  approval_id?: string;
  status: 'pending' | 'approved' | 'denied' | 'executing' | 'completed' | 'failed';
  created_at: string;
  approved_at?: string;
  started_at?: string;
  completed_at?: string;
  execution_time?: number;
  result?: string;
  error?: string;
  mcp_server?: string;
  human_approved: boolean;
}

export interface OSSwarmLog {
  id: string;
  execution_id: string;
  agent_id?: string;
  task_id?: string;
  tool_execution_id?: string;
  log_type: 'info' | 'warning' | 'error' | 'status_update' | 'tool_request' | 'tool_result';
  message: string;
  metadata?: string; // JSON
  created_at: string;
  
  // Optional fields from JOIN queries
  agent_role?: string;
  task_description?: string;
  tool_name?: string;
}

export interface ExecutionGraph {
  execution: OSSwarmExecution;
  agents: OSSwarmAgent[];
  tasks: OSSwarmTask[];
  toolExecutions: OSSwarmToolExecution[];
  logs: OSSwarmLog[];
}

export interface FormattedLog extends OSSwarmLog {
  formattedMessage: string;
  timestamp: string;
  displayText: string;
}

// Real-time update types
export interface ExecutionUpdateData {
  executionId: string;
  status: string;
  result?: string;
  error?: string;
}

export interface AgentUpdateData {
  agentId: string;
  status: string;
  currentTask?: string;
  executionId: string;
}

export interface TaskUpdateData {
  taskId: string;
  status: string;
  result?: string;
  error?: string;
  executionId: string;
}

export interface ToolExecutionUpdateData {
  toolExecutionId: string;
  status: string;
  result?: string;
  error?: string;
  executionTime?: number;
  executionId: string;
}

export interface ExecutionStats {
  total: number;
  completed: number;
  failed: number;
  running: number;
  byDate: { date: string; count: number }[];
}

// Type for decomposed subtasks from TaskDecomposer
export interface DecomposedSubtask {
  id: string;
  description: string;
  requiredSkills: string[];
  suggestedAgentTypes: string[];
  priority: number;
  estimatedComplexity: 'low' | 'medium' | 'high';
  coordinationNotes?: string;
  taskBreakdownReasoning?: string;
}

// Enhanced task creation params
export interface CreateTaskParams {
  executionId: string;
  agentId: string;
  taskDescription: string;
  priority?: number;
  subtaskId?: string;
  parentTaskId?: string;
  requiredSkills?: string[];
  suggestedAgentTypes?: string[];
  estimatedComplexity?: 'low' | 'medium' | 'high';
  coordinationNotes?: string;
  isDecomposedTask?: boolean;
  taskBreakdownReasoning?: string;
  assignmentReason?: string;
} 