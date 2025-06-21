import { LangChainAgentService, LangChainAgentOptions } from '../agent';
import { LangChainServiceFactory } from '../factory';
import type OpenAI from 'openai';
import { DBTABLES } from '@/../../constants/db';
import { useAgentTaskStore } from '@/renderer/stores/Agent/AgentTaskStore';
import { v4 as uuidv4 } from 'uuid';
import { executeQuery, executeTransaction } from '../../db';
import { OnylsaidKBService } from '@/service/knowledge_base/onlysaid_kb';

export interface OSSwarmLimits {
  maxConversationLength: number;    // e.g., 100 messages
  maxParallelAgents: number;        // e.g., 10 agents
  maxSwarmSize: number;             // e.g., 5 agents per swarm
  maxActiveSwarms: number;          // e.g., 3 concurrent swarms
  maxIterations: number;            // e.g., 20 iterations total
  conversationTTL: number;          // Auto-cleanup after X hours
}

export interface SwarmAgent {
  id: string;
  role: string;
  expertise: string[];
  status: 'idle' | 'busy' | 'completed' | 'failed';
  currentTask?: string;
  agentService: LangChainAgentService;
}

export interface SwarmTask {
  id: string;
  description: string;
  priority: number;
  assignedAgents: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  iterations: number;
  maxIterations: number;
}

export interface OSSwarmConfig {
  limits: OSSwarmLimits;
  agentOptions: LangChainAgentOptions;
  masterPrompt?: string;
  swarmPrompts: Record<string, string>;
  humanInTheLoop?: boolean;
}

export interface HumanApprovalRequest {
  id: string;
  agentId: string;
  agentRole: string;
  toolCall: {
    name: string;
    description: string;
    arguments: any;
  };
  context: string;
  timestamp: number;
  originalMCPServer?: string;
}

export class OSSwarmCore {
  private agents: Map<string, SwarmAgent> = new Map();
  private tasks: Map<string, SwarmTask> = new Map();
  private activeSwarms: Set<string> = new Set();
  private masterAgent: LangChainAgentService | null = null;
  private iterationCount: number = 0;
  private pendingApprovals: Map<string, HumanApprovalRequest> = new Map();
  private approvalCallbacks: Map<string, (approved: boolean) => void> = new Map();
  private executionStartTimes: Map<string, number> = new Map();
  private currentExecutionId: string | null = null;
  private agentTaskStore: any = null;
  private dbAgentIds: Map<string, string> = new Map();
  private isAborted: boolean = false;
  private kbService: OnylsaidKBService;

  constructor(private config: OSSwarmConfig) {
    // ✅ ADD DEBUG LOGGING IN CONSTRUCTOR
    console.log('[OSSwarm Core] Constructor called with config:', {
      toolsCount: this.config.agentOptions.tools?.length || 0,
      toolsList: this.config.agentOptions.tools?.map((t: any) => ({
        name: t.function?.name,
        mcpServer: t.mcpServer
      })) || [],
      humanInTheLoop: this.config.humanInTheLoop,
      hasKnowledgeBases: !!this.config.agentOptions.knowledgeBases?.enabled
    });

    this.initializeMasterAgent();
    const KB_BASE_URL = process.env.KB_BASE_URL || 'http://onlysaid-dev.com/api/kb/';
    this.kbService = new OnylsaidKBService(KB_BASE_URL);
  }

  private async initializeMasterAgent(): Promise<void> {
    const masterOptions = {
      ...this.config.agentOptions,
      systemPrompt: this.config.masterPrompt || this.getDefaultMasterPrompt(),
    };

    this.masterAgent = LangChainServiceFactory.createAgent(masterOptions);
    console.log('[OSSwarm] Master agent initialized');
  }

  private getDefaultMasterPrompt(): string {
    return `You are the Master Agent of OSSwarm, a distributed AI agent system with human oversight.

Your responsibilities:
1. Decompose complex tasks into subtasks
2. Assign subtasks to specialized agents
3. Coordinate agent collaboration with human approval for tool usage
4. Synthesize results into final deliverables
5. Monitor progress and handle failures

Available agent types: Research, Analysis, Creative, Technical, Communication, Validation

When processing requests:
1. Break down the task into logical subtasks
2. Determine which agents and tools are needed
3. Request human approval for tool usage
4. Coordinate agent work after approval
5. Provide regular status updates
6. Synthesize final results

All tool usage requires human approval.`;
  }

  private async sendToRenderer(event: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const webContents = (global as any).osswarmWebContents;
      if (!webContents || webContents.isDestroyed()) {
        reject(new Error('No webContents available'));
        return;
      }

      const responseId = uuidv4();
      const responseChannel = `${event}_response_${responseId}`;
      
      const { ipcMain } = require('electron');
      
      const responseHandler = (event: any, result: any) => {
        ipcMain.removeListener(responseChannel, responseHandler);
        if (result.success) {
          resolve(result.data || result);
        } else {
          reject(new Error(result.error || 'Unknown error'));
        }
      };
      
      ipcMain.once(responseChannel, responseHandler);
      
      webContents.send(event, { ...data, responseChannel });
      
      setTimeout(() => {
        ipcMain.removeListener(responseChannel, responseHandler);
        reject(new Error(`Timeout for ${event}`));
      }, 10000);
    });
  }

  private async createExecutionInStore(taskDescription: string, chatId?: string, workspaceId?: string): Promise<string> {
    const result = await this.sendToRenderer('osswarm:create_execution', {
      taskDescription,
      chatId,
      workspaceId
    });
    return result.executionId;
  }

  private async createAgentInStore(executionId: string, agentId: string, role: string, expertise: string[]): Promise<string> {
    const result = await this.sendToRenderer('osswarm:create_agent', {
      executionId,
      agentId,
      role,
      expertise
    });
    return result.dbAgentId;
  }

  private async createTaskInStore(executionId: string, agentId: string, taskDescription: string, priority: number = 0): Promise<string> {
    const result = await this.sendToRenderer('osswarm:create_task', {
      executionId,
      agentId,
      taskDescription,
      priority
    });
    return result.taskId;
  }

  private async createToolExecutionInStore(executionId: string, agentId: string, toolName: string, toolArguments: any, approvalId: string, mcpServer: string, taskId?: string): Promise<string> {
    const result = await this.sendToRenderer('osswarm:create_tool_execution', {
      executionId,
      agentId,
      toolName,
      toolArguments,
      approvalId,
      mcpServer,
      taskId
    });
    return result.toolExecutionId;
  }

  private async updateExecutionStatus(status: string, result?: string, error?: string): Promise<void> {
    if (!this.currentExecutionId) return;
    
    console.log(`[OSSwarm Core] Updating execution ${this.currentExecutionId} status to: ${status}`);
    
    try {
      await this.sendToRenderer('osswarm:update_execution_status', {
        executionId: this.currentExecutionId,
        status,
        result,
        error
      });
      
      console.log(`[OSSwarm Core] Execution status update sent successfully: ${status}`);
      
      // ✅ Also send a direct notification to refresh the UI
      const webContents = (global as any).osswarmWebContents;
      if (webContents && !webContents.isDestroyed()) {
        webContents.send('osswarm:execution_updated', {
          executionId: this.currentExecutionId,
          status,
          result,
          error
        });
        console.log(`[OSSwarm Core] Direct execution update notification sent`);
      }
    } catch (error) {
      console.error(`[OSSwarm Core] Failed to update execution status:`, error);
    }
  }

  private async updateAgentStatus(agentId: string, status: string, currentTask?: string): Promise<void> {
    const dbAgentId = this.dbAgentIds.get(agentId);
    if (!dbAgentId) return;
    
    await this.sendToRenderer('osswarm:update_agent_status', {
      agentId: dbAgentId,
      status,
      currentTask
    });

    // ✅ ADD: Send update notification to refresh UI
    const webContents = (global as any).osswarmWebContents;
    if (webContents && !webContents.isDestroyed()) {
      webContents.send('osswarm:agent_updated', {
        agentId: dbAgentId,
        status,
        currentTask,
        executionId: this.currentExecutionId
      });
    }
  }

  private async updateTaskStatus(taskId: string, status: string, result?: string, error?: string): Promise<void> {
    await this.sendToRenderer('osswarm:update_task_status', {
      taskId,
      status,
      result,
      error
    });

    // ✅ ADD: Send update notification to refresh UI
    const webContents = (global as any).osswarmWebContents;
    if (webContents && !webContents.isDestroyed()) {
      webContents.send('osswarm:task_updated', {
        taskId,
        status,
        result,
        error,
        executionId: this.currentExecutionId
      });
    }
  }

  private async updateToolExecutionStatus(toolExecutionId: string, status: string, result?: string, error?: string, executionTime?: number): Promise<void> {
    await this.sendToRenderer('osswarm:update_tool_execution_status', {
      toolExecutionId,
      status,
      result,
      error,
      executionTime
    });

    // ✅ ADD: Send update notification to refresh UI
    const webContents = (global as any).osswarmWebContents;
    if (webContents && !webContents.isDestroyed()) {
      webContents.send('osswarm:tool_execution_updated', {
        toolExecutionId,
        status,
        result,
        error,
        executionTime,
        executionId: this.currentExecutionId
      });
    }
  }

  private async requestHumanApproval(
    agentId: string,
    agentRole: string,
    toolCall: any,
    context: string,
    streamCallback?: (update: string) => void
  ): Promise<string | false> {
    if (this.isAborted) {
      console.log('[OSSwarm] Approval request cancelled - execution aborted');
      return false;
    }

    const approvalId = `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const approvalRequest: HumanApprovalRequest = {
      id: approvalId,
      agentId,
      agentRole,
      toolCall: {
        name: toolCall.function?.name || 'unknown',
        description: toolCall.function?.description || 'No description available',
        arguments: toolCall.function?.arguments || {}
      },
      context,
      timestamp: Date.now(),
      originalMCPServer: toolCall.originalMCPServer || 'osswarm'
    };

    this.pendingApprovals.set(approvalId, approvalRequest);
    
    streamCallback?.(`[OSSwarm] Agent ${agentRole} requesting approval for tool: ${approvalRequest.toolCall.name}`);
    
    try {
      const webContents = (global as any).osswarmWebContents;
      
      if (webContents && !webContents.isDestroyed()) {
        webContents.send('osswarm:tool_approval_request', {
          approvalId,
          request: approvalRequest
        });
        console.log('[OSSwarm] Tool approval request sent to renderer:', approvalId);
      } else {
        console.error('[OSSwarm] No valid webContents found for tool approval request');
        return false;
      }
    } catch (error) {
      console.error('[OSSwarm] Error sending tool approval request:', error);
      return false;
    }

    return new Promise((resolve) => {
      this.approvalCallbacks.set(approvalId, (approved: boolean) => {
        this.pendingApprovals.delete(approvalId);
        this.approvalCallbacks.delete(approvalId);
        console.log(`[OSSwarm] Tool approval response received: ${approvalId} = ${approved}`);
        resolve(approved ? approvalId : false);
      });
      
      const abortCheckInterval = setInterval(() => {
        if (this.isAborted) {
          console.log(`[OSSwarm] Approval ${approvalId} cancelled due to abort`);
          clearInterval(abortCheckInterval);
          clearTimeout(timeoutId);
          
          this.pendingApprovals.delete(approvalId);
          this.approvalCallbacks.delete(approvalId);
          
          resolve(false);
        }
      }, 500);
      
      const timeoutId = setTimeout(() => {
        if (this.approvalCallbacks.has(approvalId)) {
          console.log(`[OSSwarm] Tool approval timeout for ${approvalId}, denying by default`);
          clearInterval(abortCheckInterval);
          
          const callback = this.approvalCallbacks.get(approvalId);
          if (callback) {
            callback(false);
          }
        }
      }, 30000);
    });
  }

  public handleApprovalResponse(approvalId: string, approved: boolean): void {
    console.log(`[OSSwarm Core] handleApprovalResponse called:`, { approvalId, approved });
    
    const callback = this.approvalCallbacks.get(approvalId);
    if (callback) {
      try {
        callback(approved);
        console.log(`[OSSwarm Core] Callback executed successfully for ${approvalId}`);
      } catch (error: any) {
        console.error(`[OSSwarm Core] Error executing callback for ${approvalId}:`, error);
      }
    } else {
      console.error(`[OSSwarm Core] No callback found for approval ${approvalId}`);
    }
  }

  async createSwarm(swarmType: string, size: number): Promise<string[]> {
    if (this.activeSwarms.size >= this.config.limits.maxActiveSwarms) {
      throw new Error(`Maximum active swarms (${this.config.limits.maxActiveSwarms}) reached`);
    }

    if (size > this.config.limits.maxSwarmSize) {
      throw new Error(`Swarm size (${size}) exceeds maximum (${this.config.limits.maxSwarmSize})`);
    }

    const swarmId = `swarm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const agentIds: string[] = [];

    for (let i = 0; i < size; i++) {
      const agentId = await this.createAgent(swarmType, swarmId);
      agentIds.push(agentId);
    }

    this.activeSwarms.add(swarmId);
    console.log(`[OSSwarm] Created swarm ${swarmId} with ${size} agents`);

    return agentIds;
  }

  private async createAgent(role: string, swarmId: string): Promise<string> {
    if (this.agents.size >= this.config.limits.maxParallelAgents) {
      throw new Error(`Maximum parallel agents (${this.config.limits.maxParallelAgents}) reached`);
    }

    const agentId = `agent-${role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // ✅ Add debug logging for tool configuration
    console.log(`[OSSwarm Core] Creating agent ${agentId} (${role}) with configuration:`, {
      toolsCount: this.config.agentOptions.tools?.length || 0,
      toolsList: this.config.agentOptions.tools?.map(t => ({
        name: t.function?.name,
        mcpServer: (t as any).mcpServer
      })) || [],
      hasKnowledgeBases: !!this.config.agentOptions.knowledgeBases?.enabled,
      kbCount: this.config.agentOptions.knowledgeBases?.selectedKbIds?.length || 0
    });
    
    const agentOptions = {
      ...this.config.agentOptions,
      systemPrompt: this.config.swarmPrompts[role] || this.getDefaultAgentPrompt(role),
    };

    console.log(`[OSSwarm Core] Final agent options for ${agentId}:`, {
      provider: agentOptions.provider,
      model: agentOptions.model,
      toolsCount: agentOptions.tools?.length || 0,
      hasSystemPrompt: !!agentOptions.systemPrompt,
      temperature: agentOptions.temperature
    });

    const agentService = LangChainServiceFactory.createAgent(agentOptions);
    
    // ✅ Verify the agent service has the correct tools
    const agentConfig = agentService.getConfig();
    console.log(`[OSSwarm Core] Agent ${agentId} service created with tools:`, {
      configToolsCount: agentConfig.tools?.length || 0,
      configToolsList: agentConfig.tools?.map(t => ({
        name: t.function?.name,
        mcpServer: (t as any).mcpServer
      })) || []
    });
    
    const expertise = this.getAgentExpertise(role);

    const agent: SwarmAgent = {
      id: agentId,
      role,
      expertise,
      status: 'idle',
      agentService,
    };

    this.agents.set(agentId, agent);
    
    if (this.currentExecutionId) {
      try {
        const dbAgentId = await this.createAgentInStore(this.currentExecutionId, agentId, role, expertise);
        this.dbAgentIds.set(agentId, dbAgentId);
        console.log(`[OSSwarm] Created agent in store: ${agentId} -> ${dbAgentId}`);
      } catch (error) {
        console.error(`[OSSwarm] Failed to create agent in store:`, error);
      }
    }
    
    console.log(`[OSSwarm] Created agent ${agentId} with role ${role} and ${agentConfig.tools?.length || 0} tools`);
    return agentId;
  }

  private getAgentExpertise(role: string): string[] {
    const expertiseMap: Record<string, string[]> = {
      research: ['information_gathering', 'fact_checking', 'data_analysis'],
      analysis: ['logical_reasoning', 'problem_decomposition', 'critical_thinking'],
      creative: ['brainstorming', 'design_thinking', 'innovation'],
      technical: ['programming', 'system_design', 'implementation'],
      communication: ['writing', 'presentation', 'synthesis'],
      validation: ['testing', 'quality_assurance', 'verification'],
      rag: ['knowledge_retrieval', 'contextual_search', 'information_synthesis', 'document_analysis'],
    };

    return expertiseMap[role.toLowerCase()] || ['general'];
  }

  private getDefaultAgentPrompt(role: string): string {
    const prompts: Record<string, string> = {
      research: "You are a Research Agent specializing in information gathering, fact-checking, and data analysis. All tool usage requires human approval. Provide accurate, well-sourced information.",
      analysis: "You are an Analysis Agent specializing in logical reasoning and problem decomposition. All tool usage requires human approval. Break down complex problems systematically.",
      creative: "You are a Creative Agent specializing in innovative solutions and design thinking. All tool usage requires human approval. Generate creative, practical ideas.",
      technical: "You are a Technical Agent specializing in implementation and system design. All tool usage requires human approval. Provide technical solutions and code.",
      communication: "You are a Communication Agent specializing in clear writing and synthesis. All tool usage requires human approval. Create well-structured, understandable content.",
      validation: "You are a Validation Agent specializing in quality assurance and testing. All tool usage requires human approval. Verify accuracy and completeness.",
      rag: "You are a RAG (Retrieval-Augmented Generation) Agent specializing in knowledge retrieval and contextual responses. You have access to knowledge bases and can retrieve relevant information to enhance your responses. All tool usage requires human approval. Provide accurate, well-sourced answers based on retrieved knowledge.",
    };

    return prompts[role.toLowerCase()] || "You are a specialized AI agent with human oversight. All tool usage requires human approval. Follow instructions carefully and provide helpful responses.";
  }

  async processTask(
    taskDescription: string,
    streamCallback?: (update: string) => void,
    chatId?: string,
    workspaceId?: string
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    this.iterationCount = 0;
    this.isAborted = false;
    
    // Check if KB configuration is available
    const hasKnowledgeBases = this.config.agentOptions.knowledgeBases?.enabled && 
                              this.config.agentOptions.knowledgeBases?.selectedKbIds?.length > 0;
    
    try {
      this.currentExecutionId = await this.createExecutionInStore(taskDescription, chatId, workspaceId);
      console.log('[OSSwarm Core] Created execution via store:', this.currentExecutionId);
      
      await this.updateExecutionStatus('running');
      
    } catch (error) {
      console.error('[OSSwarm Core] Error creating execution:', error);
      return { success: false, error: 'Failed to create execution record' };
    }

    if (!this.masterAgent) {
      const error = 'Master agent not initialized';
      console.error('[OSSwarm Core]', error);
      await this.updateExecutionStatus('failed', undefined, error);
      return { success: false, error };
    }

    try {
      this.iterationCount++;
      console.log(`[OSSwarm Core] Iteration ${this.iterationCount}/${this.config.limits.maxIterations} started`);
      
      streamCallback?.(`[OSSwarm] Master Agent analyzing task... (Iteration ${this.iterationCount}/${this.config.limits.maxIterations})`);

      if (this.iterationCount > this.config.limits.maxIterations) {
        const error = `Maximum iterations (${this.config.limits.maxIterations}) reached`;
        console.error('[OSSwarm Core]', error);
        await this.updateExecutionStatus('failed', undefined, error);
        return { success: false, error };
      }

      const decompositionResult = await this.masterAgent.getCompletion([
        {
          role: 'user',
          content: `Decompose this task into subtasks and determine which agent types are needed: ${taskDescription}`
        }
      ]);

      const decomposition = decompositionResult.choices[0]?.message?.content || '';
      streamCallback?.(`[OSSwarm] Task decomposition complete`);

      // ✅ Create swarm with RAG agent if KB is available
      let swarmAgents: string[] = [];
      
      if (hasKnowledgeBases && workspaceId) {
        // Create a mixed swarm with RAG agent
        const ragAgentId = await this.createRAGAgent(
          'knowledge-swarm', 
          workspaceId, 
          this.config.agentOptions.knowledgeBases?.selectedKbIds
        );
        const researchAgents = await this.createSwarm('research', 1);
        
        swarmAgents = [ragAgentId, ...researchAgents];
        streamCallback?.(`[OSSwarm] Created knowledge-enhanced swarm with RAG agent and ${researchAgents.length} research agents`);
      } else {
        // Fallback to regular research swarm
        swarmAgents = await this.createSwarm('research', 2);
        streamCallback?.(`[OSSwarm] Created research swarm with ${swarmAgents.length} agents`);
      }

      const results: string[] = [];
      for (const agentId of swarmAgents) {
        if (this.isAborted) {
          streamCallback?.(`[OSSwarm] Execution aborted by user`);
          await this.updateExecutionStatus('failed', undefined, 'Execution aborted by user');
          return { success: false, error: 'Execution aborted by user' };
        }

        const agent = this.agents.get(agentId);
        if (agent) {
          streamCallback?.(`[OSSwarm] Agent ${agent.role} processing subtask...`);
          
          const dbAgentId = this.dbAgentIds.get(agentId);
          if (dbAgentId && this.currentExecutionId) {
            try {
              const taskId = await this.createTaskInStore(this.currentExecutionId, dbAgentId, taskDescription, 1);
              await this.updateTaskStatus(taskId, 'running');
            } catch (error) {
              console.error('[OSSwarm] Failed to create task in store:', error);
            }
          }
          
          agent.status = 'busy';
          await this.updateAgentStatus(agentId, 'busy', taskDescription);

          // ✅ Special handling for RAG agent
          if (agent.role === 'rag') {
            const ragWorkspaceId = (agent as any).workspaceId;
            const ragKbIds = (agent as any).kbIds;
            
            if (ragWorkspaceId && ragKbIds) {
              streamCallback?.(`[OSSwarm] RAG Agent retrieving knowledge from ${ragKbIds.length} knowledge bases...`);
              
              const ragResult = await this.performRAGQuery(agentId, taskDescription, ragWorkspaceId, ragKbIds);
              
              if (ragResult.success && ragResult.result) {
                // Use the RAG result to generate a more informed response
                const ragEnhancedPrompt = `As a RAG agent, I have retrieved the following relevant information from the knowledge bases:

Retrieved Knowledge:
${ragResult.result}

Based on this retrieved knowledge and the original task: "${taskDescription}"

Please provide a comprehensive, well-informed response that incorporates the retrieved information.`;

                const agentResult = await agent.agentService.getCompletion([
                  {
                    role: 'user',
                    content: ragEnhancedPrompt
                  }
                ]);

                const agentResponse = agentResult.choices[0]?.message?.content || '';
                results.push(`${agent.role} (with knowledge retrieval): ${agentResponse}`);
                agent.status = 'completed';
                await this.updateAgentStatus(agentId, 'completed');
                
                streamCallback?.(`[OSSwarm] RAG Agent completed subtask with knowledge base integration`);
              } else {
                streamCallback?.(`[OSSwarm] RAG Agent knowledge retrieval failed: ${ragResult.error}`);
                // Fallback to regular agent processing
                const agentResult = await agent.agentService.getCompletion([
                  {
                    role: 'user',
                    content: `As a ${agent.role} agent, help with this task: ${taskDescription}`
                  }
                ]);

                const agentResponse = agentResult.choices[0]?.message?.content || '';
                results.push(`${agent.role} (fallback): ${agentResponse}`);
                agent.status = 'completed';
                await this.updateAgentStatus(agentId, 'completed');
              }
            } else {
              // No KB context available, process normally
              const agentResult = await agent.agentService.getCompletion([
                {
                  role: 'user',
                  content: `As a ${agent.role} agent, help with this task: ${taskDescription}`
                }
              ]);

              const agentResponse = agentResult.choices[0]?.message?.content || '';
              results.push(`${agent.role}: ${agentResponse}`);
              agent.status = 'completed';
              await this.updateAgentStatus(agentId, 'completed');
            }
          } else {
            // Regular agent processing with proper tool execution
            if (this.config.humanInTheLoop && this.config.agentOptions.tools && this.config.agentOptions.tools.length > 0) {
              console.log(`[OSSwarm Core] Agent ${agent.role} processing with ${this.config.agentOptions.tools.length} available tools`);
              
              // Let the LangChain agent decide which tools to use
              const agentResult = await agent.agentService.getCompletion([
                {
                  role: 'user',
                  content: `As a ${agent.role} agent, help with this task: ${taskDescription}

Available tools: ${this.config.agentOptions.tools?.map(t => 
  `- ${t.function?.name}: ${t.function?.description || 'No description'}`
).join('\n') || 'None'}

Choose the most appropriate tool(s) for this task, or respond directly if no tools are needed.`
                }
              ]);

              // Check if the agent made tool calls
              const toolCalls = agentResult.choices[0]?.message?.tool_calls;
              
              if (toolCalls && toolCalls.length > 0) {
                console.log(`[OSSwarm Core] Agent ${agent.role} intelligently selected ${toolCalls.length} tools:`, 
                  toolCalls.map(tc => tc.function?.name));
                
                // Process each tool call the agent requested
                for (const toolCall of toolCalls) {
                  // Find the corresponding tool definition
                  const selectedTool = this.config.agentOptions.tools?.find(tool => 
                    tool.function?.name === toolCall.function?.name
                  );
                  
                  if (selectedTool) {
                    console.log(`[OSSwarm Core] Processing intelligent tool selection:`, {
                      selectedTool: toolCall.function?.name,
                      mcpServer: (selectedTool as any).mcpServer,
                      arguments: toolCall.function?.arguments
                    });
                    
                    const originalMCPServer = (selectedTool as any).mcpServer || 'mcp-server';
                    
                    const enhancedToolCall = {
                      function: {
                        name: toolCall.function?.name,
                        description: selectedTool.function?.description || `Tool from ${originalMCPServer}`,
                        arguments: toolCall.function?.arguments
                      },
                      originalMCPServer
                    };

                    // Request human approval for this specific tool
                    const approvalResult = await this.requestHumanApproval(
                      agentId,
                      agent.role,
                      enhancedToolCall,
                      `Agent ${agent.role} intelligently selected ${toolCall.function?.name} from ${originalMCPServer} for: ${taskDescription}`,
                      streamCallback
                    );

                    if (!approvalResult) {
                      streamCallback?.(`[OSSwarm] Agent ${agent.role} tool usage denied by human`);
                      continue; // Skip this tool, try next one or continue without tools
                    }

                    const approvalId = approvalResult;

                    // ✅ CREATE TOOL EXECUTION RECORD
                    const dbAgentId = this.dbAgentIds.get(agentId);
                    if (dbAgentId && this.currentExecutionId) {
                      try {
                        const toolExecutionId = await this.createToolExecutionInStore(
                          this.currentExecutionId,
                          dbAgentId,
                          toolCall.function?.name || 'unknown',
                          toolCall.function?.arguments,
                          approvalId,
                          originalMCPServer
                        );
                        
                        await this.updateToolExecutionStatus(toolExecutionId, 'approved');
                      } catch (error) {
                        console.error('[OSSwarm] Failed to create tool execution in store:', error);
                      }
                    }

                    streamCallback?.(`[OSSwarm] Agent ${agent.role} tool usage approved by human`);

                    // ✅ EXECUTE THE TOOL
                    try {
                      const webContents = (global as any).osswarmWebContents;
                      const executionId = `execution-${approvalId.split('-').slice(1).join('-')}`;
                      const executionStartTime = Date.now();
                      this.executionStartTimes.set(approvalId, executionStartTime);

                      if (webContents && !webContents.isDestroyed()) {
                        webContents.send('osswarm:tool_execution_start', {
                          executionId,
                          toolName: toolCall.function?.name,
                          agentId,
                          agentRole: agent.role
                        });
                      }
                      
                      // ✅ EXECUTE THE TOOL VIA MCP
                      const toolResult = await new Promise((resolve, reject) => {
                        const responseChannel = `osswarm:tool_result:${executionId}`;
                        
                        const { ipcMain } = require('electron');
                        
                        const resultHandler = (event: any, result: any) => {
                          ipcMain.removeListener(responseChannel, resultHandler);
                          resolve(result);
                        };
                        
                        ipcMain.once(responseChannel, resultHandler);
                        
                        if (webContents && !webContents.isDestroyed()) {
                          // ✅ FIX: Ensure arguments are properly parsed as object
                          let parsedArguments = {};
                          
                          try {
                            // If arguments is a string, try to parse it as JSON
                            if (typeof toolCall.function?.arguments === 'string') {
                              parsedArguments = JSON.parse(toolCall.function.arguments);
                            } else if (typeof toolCall.function?.arguments === 'object' && toolCall.function.arguments !== null) {
                              parsedArguments = toolCall.function.arguments;
                            } else {
                              // Fallback: create a basic query object
                              parsedArguments = { query: taskDescription };
                            }
                          } catch (parseError) {
                            console.warn(`[OSSwarm] Failed to parse tool arguments, using fallback:`, parseError);
                            parsedArguments = { query: taskDescription };
                          }
                          
                          console.log(`[OSSwarm Core] Sending tool execution with parsed arguments:`, {
                            executionId,
                            serverName: originalMCPServer,
                            toolName: toolCall.function?.name,
                            originalArguments: toolCall.function?.arguments,
                            parsedArguments,
                            argumentsType: typeof parsedArguments
                          });
                          
                          webContents.send('osswarm:execute_mcp_tool', {
                            executionId,
                            serverName: originalMCPServer,
                            toolName: toolCall.function?.name,
                            arguments: parsedArguments, // ✅ Now guaranteed to be an object
                            responseChannel
                          });
                        } else {
                          reject(new Error('No valid webContents for tool execution'));
                        }
                        
                        setTimeout(() => {
                          ipcMain.removeListener(responseChannel, resultHandler);
                          reject(new Error('Tool execution timeout'));
                        }, 30000);
                      });

                      // ✅ USE TOOL RESULTS TO ENHANCE AGENT RESPONSE
                      const agentPrompt = `As a ${agent.role} agent, help with this task: ${taskDescription}. 

Tool execution results:
Tool: ${toolCall.function?.name}
Result: ${JSON.stringify(toolResult, null, 2)}

Based on these tool results, provide a comprehensive response.`;

                      const enhancedAgentResult = await agent.agentService.getCompletion([
                        {
                          role: 'user',
                          content: agentPrompt
                        }
                      ]);

                      const agentResponse = enhancedAgentResult.choices[0]?.message?.content || '';
                      
                      const startTime = this.executionStartTimes.get(approvalId) || Date.now();
                      const actualExecutionTime = Math.floor((Date.now() - startTime) / 1000);
                      
                      this.executionStartTimes.delete(approvalId);

                      // ✅ UPDATE TOOL EXECUTION STATUS
                      try {
                        await this.sendToRenderer('osswarm:update_tool_execution_by_approval', {
                          approvalId,
                          status: 'completed',
                          result: JSON.stringify(toolResult),
                          executionTime: actualExecutionTime
                        });
                      } catch (error) {
                        console.error('[OSSwarm] Failed to update tool execution status:', error);
                      }

                      // ✅ NOTIFY UI OF COMPLETION
                      if (webContents && !webContents.isDestroyed()) {
                        webContents.send('osswarm:tool_execution_complete', {
                          executionId,
                          toolName: toolCall.function?.name,
                          agentId,
                          agentRole: agent.role,
                          result: JSON.stringify(toolResult),
                          agentResponse,
                          success: true,
                          executionTime: actualExecutionTime,
                          approvalId: approvalId
                        });
                      }

                      results.push(`${agent.role}: ${agentResponse}`);
                      agent.status = 'completed';
                      await this.updateAgentStatus(agentId, 'completed');
                      
                      streamCallback?.(`[OSSwarm] Agent ${agent.role} completed subtask with tool execution`);
                      
                      // ✅ BREAK AFTER FIRST SUCCESSFUL TOOL EXECUTION
                      break;
                      
                    } catch (toolError: any) {
                      console.error(`[OSSwarm] Agent ${agent.role} tool execution failed:`, toolError);
                      
                      try {
                        await this.sendToRenderer('osswarm:update_tool_execution_by_approval', {
                          approvalId,
                          status: 'failed',
                          error: toolError.message
                        });
                      } catch (error) {
                        console.error('[OSSwarm] Failed to update failed tool execution status:', error);
                      }
                      
                      streamCallback?.(`[OSSwarm] Agent ${agent.role} tool execution failed: ${toolError.message}`);
                      // Continue to next tool or fallback to no-tool response
                    }
                  } else {
                    console.error(`[OSSwarm Core] Tool ${toolCall.function?.name} not found in available tools`);
                  }
                }
                
                // ✅ IF NO TOOLS WERE SUCCESSFULLY EXECUTED, USE ORIGINAL RESPONSE
                if (agent.status !== 'completed') {
                  const agentResponse = agentResult.choices[0]?.message?.content || '';
                  results.push(`${agent.role}: ${agentResponse}`);
                  agent.status = 'completed';
                  await this.updateAgentStatus(agentId, 'completed');
                  
                  streamCallback?.(`[OSSwarm] Agent ${agent.role} completed subtask without successful tool execution`);
                }
              } else {
                // Agent chose not to use tools, just use the response
                const agentResponse = agentResult.choices[0]?.message?.content || '';
                results.push(`${agent.role}: ${agentResponse}`);
                agent.status = 'completed';
                await this.updateAgentStatus(agentId, 'completed');
                
                streamCallback?.(`[OSSwarm] Agent ${agent.role} completed subtask without using tools`);
              }
            } else {
              // ✅ FALLBACK: NO TOOLS AVAILABLE OR HUMAN-IN-THE-LOOP DISABLED
              const agentResult = await agent.agentService.getCompletion([
                {
                  role: 'user',
                  content: `As a ${agent.role} agent, help with this task: ${taskDescription}`
                }
              ]);

              const agentResponse = agentResult.choices[0]?.message?.content || '';
              results.push(`${agent.role}: ${agentResponse}`);
              agent.status = 'completed';
              await this.updateAgentStatus(agentId, 'completed');
              
              streamCallback?.(`[OSSwarm] Agent ${agent.role} completed subtask without tools (no tools available)`);
            }
          }
        }
      }

      if (this.isAborted) {
        streamCallback?.(`[OSSwarm] Execution aborted by user`);
        await this.updateExecutionStatus('failed', undefined, 'Execution aborted by user');
        return { success: false, error: 'Execution aborted by user' };
      }

      streamCallback?.(`[OSSwarm] Master Agent synthesizing results...`);
      
      const synthesisResult = await this.masterAgent.getCompletion([
        {
          role: 'user',
          content: `Synthesize these agent results into a final response for: ${taskDescription}\n\nAgent Results:\n${results.join('\n\n')}`
        }
      ]);

      const finalResult = synthesisResult.choices[0]?.message?.content || '';
      streamCallback?.(`[OSSwarm] Task completed successfully with ${hasKnowledgeBases ? 'knowledge base integration' : 'standard processing'}`);

      console.log('[OSSwarm Core] Updating execution status to completed...');
      await this.updateExecutionStatus('completed', finalResult);
      console.log('[OSSwarm Core] Execution status updated successfully');
      
      this.cleanup();

      return { success: true, result: finalResult };

    } catch (error: any) {
      console.error('[OSSwarm Core] Error in processTask:', error);
      
      await this.updateExecutionStatus('failed', undefined, error.message);
      
      streamCallback?.(`[OSSwarm] Error: ${error.message}`);
      this.cleanup();
      return { success: false, error: error.message || 'Unknown error in processTask' };
    }
  }

  private cleanup(): void {
    this.agents.clear();
    this.activeSwarms.clear();
    this.pendingApprovals.clear();
    this.approvalCallbacks.clear();
    this.executionStartTimes.clear();
    this.currentExecutionId = null;
    this.dbAgentIds.clear();
    this.isAborted = false;
    console.log('[OSSwarm] Cleanup completed');
  }

  public abortExecution(): { success: boolean; message: string } {
    console.log('[OSSwarm Core] Aborting execution...');
    
    this.isAborted = true;
    
    for (const [approvalId, callback] of this.approvalCallbacks.entries()) {
      try {
        callback(false);
      } catch (error) {
        console.error(`[OSSwarm Core] Error cancelling approval ${approvalId}:`, error);
      }
    }
    
    for (const [agentId, agent] of this.agents.entries()) {
      if (agent.status === 'busy') {
        agent.status = 'failed';
      }
    }
    
    if (this.currentExecutionId) {
      this.updateExecutionStatus('failed', undefined, 'Execution aborted by user').catch((error: any) => {
        console.error('[OSSwarm Core] Error updating execution status on abort:', error);
      });
    }
    
    this.cleanup();
    
    return { success: true, message: 'OSSwarm execution aborted successfully' };
  }

  getStatus(): {
    activeAgents: number;
    activeSwarms: number;
    iterations: number;
    limits: OSSwarmLimits;
    pendingApprovals: number;
  } {
    return {
      activeAgents: this.agents.size,
      activeSwarms: this.activeSwarms.size,
      iterations: this.iterationCount,
      limits: this.config.limits,
      pendingApprovals: this.pendingApprovals.size,
    };
  }

  private async createRAGAgent(swarmId: string, workspaceId?: string, kbIds?: string[]): Promise<string> {
    const agentId = await this.createAgent('rag', swarmId);
    
    // Store KB context for this RAG agent
    const agent = this.agents.get(agentId);
    if (agent && workspaceId && kbIds) {
      (agent as any).workspaceId = workspaceId;
      (agent as any).kbIds = kbIds;
      console.log(`[OSSwarm] RAG Agent ${agentId} configured with workspace ${workspaceId} and KBs:`, kbIds);
    }
    
    return agentId;
  }

  private async performRAGQuery(
    agentId: string, 
    query: string, 
    workspaceId?: string, 
    kbIds?: string[]
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    if (!workspaceId || !kbIds || kbIds.length === 0) {
      return { success: false, error: 'No workspace or knowledge bases available for RAG query' };
    }

    try {
      console.log(`[OSSwarm] RAG Agent ${agentId} performing knowledge base query:`, {
        workspaceId,
        kbIds,
        queryLength: query.length
      });

      const ragResult = await this.kbService.queryKnowledgeBaseNonStreaming({
        workspaceId,
        queryText: query,
        kbIds,
        topK: 5,
        preferredLanguage: 'en'
      });

      if (ragResult.status === 'success' && ragResult.results) {
        console.log(`[OSSwarm] RAG Agent ${agentId} retrieved knowledge successfully`);
        return { success: true, result: ragResult.results };
      } else {
        return { success: false, error: 'No results from knowledge base' };
      }
    } catch (error: any) {
      console.error(`[OSSwarm] RAG Agent ${agentId} query failed:`, error);
      return { success: false, error: error.message || 'RAG query failed' };
    }
  }
} 