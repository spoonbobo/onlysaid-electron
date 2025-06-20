import { LangChainAgentService, LangChainAgentOptions } from '../agent';
import { LangChainServiceFactory } from '../factory';
import type OpenAI from 'openai';

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

  constructor(private config: OSSwarmConfig) {
    this.initializeMasterAgent();
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

  private async requestHumanApproval(
    agentId: string,
    agentRole: string,
    toolCall: any,
    context: string,
    streamCallback?: (update: string) => void
  ): Promise<boolean> {
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
    
    // ✅ Use stored webContents instead of BrowserWindow.getAllWindows()
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
        resolve(approved);
      });
      
      // Add timeout to prevent infinite waiting
      setTimeout(() => {
        if (this.approvalCallbacks.has(approvalId)) {
          console.log(`[OSSwarm] Tool approval timeout for ${approvalId}, denying by default`);
          const callback = this.approvalCallbacks.get(approvalId);
          if (callback) {
            callback(false);
          }
        }
      }, 30000);
    });
  }

  public handleApprovalResponse(approvalId: string, approved: boolean): void {
    console.log(`[OSSwarm Core] 🔧 handleApprovalResponse called at ${Date.now()}:`, {
      approvalId,
      approved,
      hasPendingApproval: this.pendingApprovals.has(approvalId),
      hasCallback: this.approvalCallbacks.has(approvalId),
      totalPendingApprovals: this.pendingApprovals.size,
      totalCallbacks: this.approvalCallbacks.size
    });
    
    const callback = this.approvalCallbacks.get(approvalId);
    if (callback) {
      console.log(`[OSSwarm Core] 🔧 Found callback for ${approvalId}, executing...`);
      try {
        callback(approved);
        console.log(`[OSSwarm Core] 🔧 Callback executed successfully for ${approvalId}`);
      } catch (error: any) {
        console.error(`[OSSwarm Core] 🔧 Error executing callback for ${approvalId}:`, error);
      }
    } else {
      console.error(`[OSSwarm Core] 🔧 No callback found for approval ${approvalId}`, {
        availableCallbacks: Array.from(this.approvalCallbacks.keys()),
        timestamp: Date.now()
      });
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
    
    const agentOptions = {
      ...this.config.agentOptions,
      systemPrompt: this.config.swarmPrompts[role] || this.getDefaultAgentPrompt(role),
    };

    const agentService = LangChainServiceFactory.createAgent(agentOptions);

    const agent: SwarmAgent = {
      id: agentId,
      role,
      expertise: this.getAgentExpertise(role),
      status: 'idle',
      agentService,
    };

    this.agents.set(agentId, agent);
    console.log(`[OSSwarm] Created agent ${agentId} with role ${role}`);

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
    };

    return prompts[role.toLowerCase()] || "You are a specialized AI agent with human oversight. All tool usage requires human approval. Follow instructions carefully and provide helpful responses.";
  }

  async processTask(
    taskDescription: string,
    streamCallback?: (update: string) => void
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    console.log('[OSSwarm Core] Starting processTask with:', {
      taskLength: taskDescription.length,
      iterationCount: this.iterationCount,
      maxIterations: this.config.limits.maxIterations,
      hasMasterAgent: !!this.masterAgent,
      hasTools: this.config.agentOptions.tools?.length || 0,
      humanInTheLoop: this.config.humanInTheLoop
    });

    if (this.iterationCount >= this.config.limits.maxIterations) {
      const error = `Maximum iterations (${this.config.limits.maxIterations}) reached`;
      console.error('[OSSwarm Core]', error);
      return { success: false, error };
    }

    if (!this.masterAgent) {
      const error = 'Master agent not initialized';
      console.error('[OSSwarm Core]', error);
      return { success: false, error };
    }

    try {
      this.iterationCount++;
      console.log(`[OSSwarm Core] Iteration ${this.iterationCount}/${this.config.limits.maxIterations} started`);
      
      streamCallback?.(`[OSSwarm] Master Agent analyzing task... (Iteration ${this.iterationCount}/${this.config.limits.maxIterations})`);

      const decompositionResult = await this.masterAgent.getCompletion([
        {
          role: 'user',
          content: `Decompose this task into subtasks and determine which agent types are needed: ${taskDescription}`
        }
      ]);

      const decomposition = decompositionResult.choices[0]?.message?.content || '';
      streamCallback?.(`[OSSwarm] Task decomposition complete`);

      const swarmAgents = await this.createSwarm('research', 2);
      streamCallback?.(`[OSSwarm] Created research swarm with ${swarmAgents.length} agents`);

      const results: string[] = [];
      for (const agentId of swarmAgents) {
        const agent = this.agents.get(agentId);
        if (agent) {
          streamCallback?.(`[OSSwarm] Agent ${agent.role} processing subtask...`);
          
          agent.status = 'busy';

          if (this.config.humanInTheLoop && this.config.agentOptions.tools && this.config.agentOptions.tools.length > 0) {
            const availableTools = this.config.agentOptions.tools;
            console.log(`[OSSwarm] Agent ${agent.role} has ${availableTools.length} tools available:`, availableTools.map(t => t.function?.name));
            
            const selectedTool = availableTools.find(tool => 
              tool.function?.name?.toLowerCase().includes('search') || 
              tool.function?.name?.toLowerCase().includes('research') ||
              tool.function?.name?.toLowerCase().includes('tavily')
            ) || availableTools[0];
            
            if (selectedTool && selectedTool.function) {
              console.log(`[OSSwarm] Agent ${agent.role} selected tool: ${selectedTool.function.name}`);
              
              // ✅ Get the original MCP server from the tool metadata
              const originalMCPServer = (selectedTool as any).mcpServer || 'unknown';
              console.log(`[OSSwarm] Tool ${selectedTool.function.name} originates from MCP server: ${originalMCPServer}`);
              
              let toolArguments = {};
              if (selectedTool.function.parameters && selectedTool.function.parameters.properties) {
                const props = selectedTool.function.parameters.properties as Record<string, any>;
                
                if (props.query) {
                  toolArguments = { query: taskDescription };
                } else if (props.q) {
                  toolArguments = { q: taskDescription };
                } else if (props.search_query) {
                  toolArguments = { search_query: taskDescription };
                } else {
                  const firstParam = Object.keys(props)[0];
                  if (firstParam) {
                    toolArguments = { [firstParam]: taskDescription };
                  }
                }
              }
              
              const toolCall = {
                function: {
                  name: selectedTool.function.name,
                  description: selectedTool.function.description || 'Tool for research and information gathering',
                  arguments: toolArguments
                },
                originalMCPServer // ✅ Include the MCP server info
              };

              console.log(`[OSSwarm] Agent ${agent.role} requesting approval for tool:`, toolCall);

              const approved = await this.requestHumanApproval(
                agentId,
                agent.role,
                toolCall,
                `Agent ${agent.role} wants to use ${selectedTool.function.name} for: ${taskDescription}`,
                streamCallback
              );

              if (!approved) {
                streamCallback?.(`[OSSwarm] Agent ${agent.role} tool usage denied by human`);
                agent.status = 'failed';
                continue;
              }

              streamCallback?.(`[OSSwarm] Agent ${agent.role} tool usage approved by human`);
              
              // ✅ Use stored webContents
              const webContents = (global as any).osswarmWebContents;
              console.log('[OSSwarm] 🔧 WebContents available:', {
                hasWebContents: !!webContents,
                isDestroyed: webContents?.isDestroyed?.()
              });
              
              // ✅ Generate execution ID for tracking
              const executionId = `execution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              console.log('[OSSwarm] 🔧 Generated execution ID:', executionId);

              try {
                console.log(`[OSSwarm] 🔧 Agent ${agent.role} executing tool: ${selectedTool.function.name}`);
                
                // ✅ Send tool execution start notification
                if (webContents && !webContents.isDestroyed()) {
                  console.log('[OSSwarm] 🔧 Sending tool execution start notification');
                  webContents.send('osswarm:tool_execution_start', {
                    executionId,
                    toolName: selectedTool.function.name,
                    agentId,
                    agentRole: agent.role
                  });
                }
                
                // ✅ Execute the actual MCP tool instead of just LLM completion
                const mcpServer = (selectedTool as any).mcpServer || 'unknown';
                console.log(`[OSSwarm] 🔧 Executing MCP tool on server:`, {
                  toolName: selectedTool.function.name,
                  mcpServer,
                  arguments: toolArguments,
                  executionId
                });
                
                // Use IPC to execute the tool on the renderer process
                const toolResult = await new Promise((resolve, reject) => {
                  // Create a unique response channel for this execution
                  const responseChannel = `osswarm:tool_result:${executionId}`;
                  console.log('[OSSwarm] 🔧 Setting up response channel:', responseChannel);
                  
                  // Set up a one-time listener for the result
                  const { ipcMain } = require('electron');
                  
                  const resultHandler = (event: any, result: any) => {
                    console.log('[OSSwarm] 🔧 Received tool result via IPC:', {
                      executionId,
                      resultType: typeof result,
                      hasSuccess: 'success' in result,
                      success: result?.success,
                      hasData: !!result?.data,
                      hasError: !!result?.error,
                      fullResult: result
                    });
                    
                    ipcMain.removeListener(responseChannel, resultHandler);
                    resolve(result);
                  };
                  
                  ipcMain.once(responseChannel, resultHandler);
                  
                  // Send tool execution request to renderer
                  if (webContents && !webContents.isDestroyed()) {
                    console.log('[OSSwarm] 🔧 Sending MCP tool execution request to renderer:', {
                      executionId,
                      serverName: mcpServer,
                      toolName: selectedTool.function.name,
                      arguments: toolArguments,
                      responseChannel
                    });
                    
                    webContents.send('osswarm:execute_mcp_tool', {
                      executionId,
                      serverName: mcpServer,
                      toolName: selectedTool.function.name,
                      arguments: toolArguments,
                      responseChannel
                    });
                  } else {
                    console.error('[OSSwarm] 🔧 No valid webContents for tool execution');
                    reject(new Error('No valid webContents for tool execution'));
                  }
                  
                  // Timeout after 30 seconds
                  setTimeout(() => {
                    console.log('[OSSwarm] 🔧 Tool execution timeout for:', executionId);
                    ipcMain.removeListener(responseChannel, resultHandler);
                    reject(new Error('Tool execution timeout'));
                  }, 30000);
                });

                console.log(`[OSSwarm] 🔧 Tool ${selectedTool.function.name} execution completed:`, {
                  executionId,
                  resultType: typeof toolResult,
                  toolResult
                });

                // ✅ Now get agent response incorporating the tool results
                const agentPrompt = `As a ${agent.role} agent, help with this task: ${taskDescription}. 

Tool execution results:
Tool: ${selectedTool.function.name}
Result: ${JSON.stringify(toolResult, null, 2)}

Based on these tool results, provide a comprehensive response.`;

                console.log('[OSSwarm] 🔧 Sending prompt to agent:', {
                  agentRole: agent.role,
                  promptLength: agentPrompt.length,
                  hasToolResult: !!toolResult
                });

                const agentResult = await agent.agentService.getCompletion([
                  {
                    role: 'user',
                    content: agentPrompt
                  }
                ]);

                const agentResponse = agentResult.choices[0]?.message?.content || '';
                console.log('[OSSwarm] 🔧 Agent response received:', {
                  responseLength: agentResponse.length,
                  hasResponse: !!agentResponse
                });
                
                // ✅ Send tool execution completion notification with real results
                if (webContents && !webContents.isDestroyed()) {
                  console.log('[OSSwarm] 🔧 Sending tool execution completion notification');
                  webContents.send('osswarm:tool_execution_complete', {
                    executionId,
                    toolName: selectedTool.function.name,
                    agentId,
                    agentRole: agent.role,
                    result: JSON.stringify(toolResult),
                    agentResponse,
                    success: true,
                    executionTime: Date.now() - Date.now() // Calculate actual time
                  });
                }

                results.push(`${agent.role}: ${agentResponse}`);
                agent.status = 'completed';
                
                streamCallback?.(`[OSSwarm] Agent ${agent.role} completed subtask with tool execution`);
              } catch (toolError: any) {
                console.error(`[OSSwarm] 🔧 Agent ${agent.role} tool execution failed:`, {
                  message: toolError.message,
                  stack: toolError.stack,
                  executionId,
                  toolName: selectedTool.function.name
                });
                
                // ✅ Send tool execution error notification
                if (webContents && !webContents.isDestroyed()) {
                  webContents.send('osswarm:tool_execution_complete', {
                    executionId,
                    toolName: selectedTool.function.name,
                    agentId,
                    agentRole: agent.role,
                    error: toolError.message,
                    success: false
                  });
                }
                
                streamCallback?.(`[OSSwarm] Agent ${agent.role} tool execution failed: ${toolError.message}`);
                agent.status = 'failed';
              }
            } else {
              console.warn(`[OSSwarm] Agent ${agent.role} has no suitable tools available`);
              const agentResult = await agent.agentService.getCompletion([
                {
                  role: 'user',
                  content: `As a ${agent.role} agent, help with this task: ${taskDescription}`
                }
              ]);

              const agentResponse = agentResult.choices[0]?.message?.content || '';
              results.push(`${agent.role}: ${agentResponse}`);
              agent.status = 'completed';
              
              streamCallback?.(`[OSSwarm] Agent ${agent.role} completed subtask without tools`);
            }
          } else {
            const agentResult = await agent.agentService.getCompletion([
              {
                role: 'user',
                content: `As a ${agent.role} agent, help with this task: ${taskDescription}`
              }
            ]);

            const agentResponse = agentResult.choices[0]?.message?.content || '';
            results.push(`${agent.role}: ${agentResponse}`);
            agent.status = 'completed';
            
            streamCallback?.(`[OSSwarm] Agent ${agent.role} completed subtask`);
          }
        }
      }

      streamCallback?.(`[OSSwarm] Master Agent synthesizing results...`);
      
      const synthesisResult = await this.masterAgent.getCompletion([
        {
          role: 'user',
          content: `Synthesize these agent results into a final response for: ${taskDescription}\n\nAgent Results:\n${results.join('\n\n')}`
        }
      ]);

      const finalResult = synthesisResult.choices[0]?.message?.content || '';
      streamCallback?.(`[OSSwarm] Task completed successfully`);

      this.cleanup();

      return { success: true, result: finalResult };

    } catch (error: any) {
      console.error('[OSSwarm Core] Error in processTask:', {
        message: error.message,
        stack: error.stack,
        iteration: this.iterationCount
      });
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
    console.log('[OSSwarm] Cleanup completed');
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
} 