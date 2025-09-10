import { BaseWorkflowNode } from './base';
import { WorkflowState, WorkflowNodeResult } from './types';
import { AgentCard } from '@/../../types/Agent/AgentCard';
import { ToolApprovalRequest } from '../agent/state';
import { AgentRegistry } from '../agent/registry';
import { LangChainServiceFactory } from '../factory/factory';
import { LangChainAgentOptions } from '../agent';
import { SubTask } from './taskDecomposer';

export class SwarmExecutorNode extends BaseWorkflowNode {
  async execute(state: WorkflowState): WorkflowNodeResult {
    console.log('[LangGraph] Swarm executor coordinating agents...');
    
    const selectedRoles = Object.keys(state.activeAgentCards);
    console.log('[LangGraph] Active agent roles:', selectedRoles);
    
    // Use decomposed subtasks if available, otherwise fall back to original task
    const tasksToProcess = state.decomposedSubtasks || [{
      id: 'original_task',
      description: state.originalTask,
      requiredSkills: ['general'],
      suggestedAgentTypes: [],
      priority: 1,
      estimatedComplexity: 'medium' as const
    }];
    
    console.log('[LangGraph] Processing', tasksToProcess.length, 'tasks with', selectedRoles.length, 'agents');
    
    // Check if this is a swarm execution (multiple agents)
    if (selectedRoles.length <= 1) {
      console.log('[LangGraph] Single agent detected, using individual execution');
      return this.executeSingleAgent(state, tasksToProcess);
    }
    
    // Execute swarm coordination with decomposed tasks
    return this.executeSwarmCoordination(state, tasksToProcess);
  }

  private async executeSingleAgent(state: WorkflowState, tasks: SubTask[]): WorkflowNodeResult {
    const selectedRoles = Object.keys(state.activeAgentCards);
    const nextRole = selectedRoles.find(role => 
      state.activeAgentCards[role].status === 'idle'
    );
    
    if (!nextRole) {
      // Check if any agents have been executed before going to synthesis
      const hasExecutedAgents = Object.keys(state.agentResults || {}).length > 0;
      
      if (!hasExecutedAgents) {
        console.log('[LangGraph] ERROR: No idle agents found and no agents have been executed. This should not happen!');
        // Force execution of first available agent
        const firstAgent = selectedRoles[0];
        if (firstAgent) {
          console.log(`[LangGraph] Forcing execution of first agent: ${firstAgent}`);
          return this.executeIndividualAgent(state, firstAgent, tasks);
        }
      }
      
      return {
        currentPhase: 'synthesis',
        waitingForHumanResponse: false,
        awaitingToolResults: false
      };
    }
    
    return this.executeIndividualAgent(state, nextRole, tasks);
  }

  private async executeSwarmCoordination(state: WorkflowState, tasks: SubTask[]): WorkflowNodeResult {
    console.log('[LangGraph] Executing swarm coordination with task decomposition...');
    
    const selectedRoles = Object.keys(state.activeAgentCards);
    
    // Check for any agents awaiting tool results
    const awaitingAgents = selectedRoles.filter(role => 
      state.activeAgentCards[role].status === 'awaiting_approval'
    );
    
    if (awaitingAgents.length > 0) {
      console.log('[LangGraph] Some agents awaiting approval, pausing swarm execution');
      return { awaitingToolResults: true };
    }
    
    // Find the next agent to execute in the swarm
    const nextRole = this.selectNextSwarmAgent(state, selectedRoles, tasks);
    
    if (!nextRole) {
      console.log('[LangGraph] All swarm agents completed, moving to synthesis');
      return {
        currentPhase: 'synthesis',
        waitingForHumanResponse: false,
        awaitingToolResults: false
      };
    }
    
    console.log(`[LangGraph] Executing ${nextRole} in swarm context...`);
    
    // Execute the selected agent with swarm context and assigned tasks
    return this.executeSwarmAgent(state, nextRole, selectedRoles, tasks);
  }

  private selectNextSwarmAgent(state: WorkflowState, roles: string[], tasks: SubTask[]): string | null {
    // Enhanced smart scheduling considering task requirements and agent completion status
    
    // Don't check for task completion if no agents have executed yet
    const hasExecutedAgents = Object.keys(state.agentResults || {}).length > 0;
    
    // Only check if all critical subtasks are completed if we've actually executed some agents
    if (hasExecutedAgents && this.areAllCriticalTasksCompleted(state, tasks)) {
      console.log('[LangGraph] All critical subtasks completed - no more agents needed');
      return null;
    }
    
    // Check if we've reached iteration limits (if available)
    const iterationCount = this.getIterationCount(state);
    const maxIterations = this.getSwarmLimits(state).maxIterations;
    
    if (iterationCount >= maxIterations) {
      console.log(`[LangGraph] Reached maximum iterations (${maxIterations}) - stopping swarm execution`);
      return null;
    }
    
    // First, try to find agents that match specific task requirements
    for (const task of tasks.filter(t => !this.isTaskCompleted(state, t))) {
      for (const suggestedRole of task.suggestedAgentTypes) {
        if (roles.includes(suggestedRole) && state.activeAgentCards[suggestedRole].status === 'idle') {
          console.log(`[LangGraph] Selected ${suggestedRole} for task: ${task.description}`);
          return suggestedRole;
        }
      }
    }
    
    // Fallback to priority-based scheduling
    const priorities = ['research', 'analysis', 'creative', 'communication', 'technical', 'validation'];
    
    for (const priority of priorities) {
      const role = roles.find(r => r === priority && state.activeAgentCards[r].status === 'idle');
      if (role) return role;
    }
    
    // Ultimate fallback to any idle agent
    return roles.find(role => state.activeAgentCards[role].status === 'idle') || null;
  }

  private areAllCriticalTasksCompleted(state: WorkflowState, tasks: SubTask[]): boolean {
    // Determine if the swarm has sufficiently addressed the core requirements
    
    // Check if we have completed agents that have produced meaningful results
    const completedAgents = Object.values(state.agentResults || {});
    
    if (completedAgents.length === 0) {
      return false; // No completed work yet
    }
    
    // Check if high-priority tasks are addressed
    const highPriorityTasks = tasks.filter(task => task.priority <= 2);
    const addressedHighPriorityTasks = highPriorityTasks.filter(task => 
      this.isTaskCompleted(state, task) || this.isTaskPartiallyAddressed(state, task)
    );
    
    // Require at least 75% of high-priority tasks to be addressed
    const highPriorityCompletionRate = addressedHighPriorityTasks.length / Math.max(highPriorityTasks.length, 1);
    
    if (highPriorityCompletionRate < 0.75) {
      console.log(`[LangGraph] High-priority task completion rate: ${(highPriorityCompletionRate * 100).toFixed(1)}% (need 75%)`);
      return false;
    }
    
    // Check if we have sufficient coverage across different skill areas
    const requiredSkills = [...new Set(tasks.flatMap(task => task.requiredSkills))];
    const addressedSkills = requiredSkills.filter(skill => 
      this.isSkillAddressedByCompletedAgents(state, skill)
    );
    
    const skillCoverageRate = addressedSkills.length / Math.max(requiredSkills.length, 1);
    
    if (skillCoverageRate < 0.8) {
      console.log(`[LangGraph] Skill coverage rate: ${(skillCoverageRate * 100).toFixed(1)}% (need 80%)`);
      return false;
    }
    
    // Check quality criteria - do we have substantial results?
    const totalOutputLength = completedAgents.reduce((sum, agent) => 
      sum + (agent.result?.length || 0), 0
    );
    
    if (totalOutputLength < 500) { // Minimum substantial output
      console.log(`[LangGraph] Total output length: ${totalOutputLength} (need 500+)`);
      return false;
    }
    
    console.log(`[LangGraph] ✅ Task completion criteria met:`, {
      highPriorityCompletion: `${(highPriorityCompletionRate * 100).toFixed(1)}%`,
      skillCoverage: `${(skillCoverageRate * 100).toFixed(1)}%`,
      totalOutput: totalOutputLength,
      completedAgents: completedAgents.length
    });
    
    return true;
  }

  private isTaskPartiallyAddressed(state: WorkflowState, task: SubTask): boolean {
    // Check if any agent result mentions or relates to this task
    const taskKeywords = task.description.toLowerCase().split(' ').filter(word => word.length > 3);
    
    return Object.values(state.agentResults || {}).some(result => {
      const resultText = result.result?.toLowerCase() || '';
      return taskKeywords.some(keyword => resultText.includes(keyword));
    });
  }

  private isSkillAddressedByCompletedAgents(state: WorkflowState, skill: string): boolean {
    return Object.values(state.agentResults || {}).some(result => {
      const agentRole = result.agentCard.role || '';
      return this.agentHasSkill(agentRole, skill) && result.result && result.result.length > 100;
    });
  }

  private getIterationCount(state: WorkflowState): number {
    // Count the number of completed agents as iteration count
    return Object.values(state.agentResults || {}).length;
  }

  private getSwarmLimits(state: WorkflowState) {
    // Get swarm limits from state or use defaults
    return (state as any).swarmLimits || {
      maxIterations: 15,
      maxParallelAgents: 8,
      maxSwarmSize: 4,
      maxActiveSwarms: 2,
      maxConversationLength: 50
    };
  }

  private isTaskCompleted(state: WorkflowState, task: SubTask): boolean {
    // Check if any agent has already addressed this specific task
    return Object.values(state.agentResults || {}).some(result => 
      result.result && result.result.toLowerCase().includes(task.id.toLowerCase())
    );
  }

  private async executeSwarmAgent(
    state: WorkflowState, 
    role: string, 
    allSwarmRoles: string[],
    tasks: SubTask[]
  ): WorkflowNodeResult {
    const agentCard = state.activeAgentCards[role];
    
    const updatedAgentCard: AgentCard = {
      ...agentCard,
      status: 'busy',
      currentTask: `Swarm execution: ${state.originalTask}`
    };
    
    await this.sendRendererUpdate(state, {
      type: 'agent_status',
      data: {
        agentCard: updatedAgentCard,
        status: 'busy',
        currentTask: `Coordinating with swarm on: ${state.originalTask}`
      }
    });
    
    // Mark matching decomposed tasks as running when this swarm agent starts
    const webContents = (state as any).webContents || (global as any).osswarmWebContents;
    if (webContents && !webContents.isDestroyed() && state.executionId && state.decomposedSubtasks && Array.isArray(state.decomposedSubtasks)) {
      const runningRelevant = (state.decomposedSubtasks as any[]).filter(st => 
        Array.isArray(st?.suggestedAgentTypes) && st.suggestedAgentTypes.includes(role)
      );
      for (const st of runningRelevant) {
        webContents.send('agent:update_task_status', {
          executionId: state.executionId,
          subtaskId: st.id,
          taskDescription: st.description,
          status: 'running',
          agentId: updatedAgentCard.runtimeId || role
        });
      }
    }
    
    try {
      // Gather context from other completed agents in the swarm
      const swarmContext = this.buildSwarmContext(state, role, allSwarmRoles, tasks);
      
      const result = await this.executeAgentWithSwarmContext(
        updatedAgentCard,
        state,
        role,
        swarmContext,
        tasks
      );
      
      if (result.pendingApprovals && result.pendingApprovals.length > 0) {
        console.log(`[LangGraph] Swarm agent ${role} generated ${result.pendingApprovals.length} pending approvals`);
        
        const awaitingAgentCard = { ...updatedAgentCard, status: 'awaiting_approval' as const };
        await this.sendRendererUpdate(state, {
          type: 'agent_status',
          data: {
            agentCard: awaitingAgentCard,
            status: 'awaiting_approval',
            currentTask: `Waiting for approval of ${result.pendingApprovals.length} tools in swarm context`
          }
        });
        
        return {
          activeAgentCards: {
            ...state.activeAgentCards,
            [role]: awaitingAgentCard
          },
          pendingApprovals: [...(state.pendingApprovals || []), ...result.pendingApprovals],
          waitingForHumanResponse: false,
          awaitingToolResults: false
        };
      }
      
      const finalAgentCard: AgentCard = {
        ...updatedAgentCard,
        status: result.success ? 'completed' : 'failed'
      };
      
      // Update matching decomposed tasks to completed/failed for this swarm agent
      if (webContents && !webContents.isDestroyed() && state.executionId && state.decomposedSubtasks && Array.isArray(state.decomposedSubtasks)) {
        const relevantDone = (state.decomposedSubtasks as any[]).filter(st => 
          Array.isArray(st?.suggestedAgentTypes) && st.suggestedAgentTypes.includes(role)
        );
        for (const st of relevantDone) {
          webContents.send('agent:update_task_status', {
            executionId: state.executionId,
            subtaskId: st.id,
            taskDescription: st.description,
            status: finalAgentCard.status,
            result: result.output,
            agentId: updatedAgentCard.runtimeId || role
          });
        }
      }

      await this.sendRendererUpdate(state, {
        type: 'agent_status',
        data: {
          agentCard: finalAgentCard,
          status: finalAgentCard.status,
          result: result.output
        }
      });
      
      return {
        activeAgentCards: {
          ...state.activeAgentCards,
          [role]: finalAgentCard
        },
        agentResults: {
          ...state.agentResults,
          [role]: {
            agentCard: finalAgentCard,
            result: result.output,
            toolExecutions: result.toolExecutions || [],
            status: finalAgentCard.status || 'failed',
            startTime: result.startTime || Date.now(),
            endTime: Date.now()
          }
        },
        waitingForHumanResponse: false,
        awaitingToolResults: false
      };
      
    } catch (error: any) {
      if (error.name === 'GraphInterrupt') {
        console.log(`[LangGraph] GraphInterrupt in swarmExecutorNode - re-throwing to pause entire workflow`);
        throw error;
      }
      
      console.error(`[LangGraph] Swarm agent ${role} error:`, error);
      
      const failedAgentCard: AgentCard = {
        ...updatedAgentCard,
        status: 'failed'
      };
      
      await this.sendRendererUpdate(state, {
        type: 'agent_status',
        data: {
          agentCard: failedAgentCard,
          status: 'failed',
          error: error.message
        }
      });
      
      return {
        activeAgentCards: {
          ...state.activeAgentCards,
          [role]: failedAgentCard
        },
        errors: [...state.errors, `Swarm agent ${role} failed: ${error.message}`],
        waitingForHumanResponse: false,
        awaitingToolResults: false
      };
    }
  }

  private buildSwarmContext(
    state: WorkflowState, 
    currentRole: string, 
    allRoles: string[],
    tasks: SubTask[]
  ): string {
    const completedResults = allRoles
      .filter(role => role !== currentRole && state.agentResults[role])
      .map(role => {
        const result = state.agentResults[role];
        return `${role} agent result: ${result.result}`;
      });
    
    // Find tasks most relevant to current agent
    const relevantTasks = tasks.filter(task => 
      task.suggestedAgentTypes.includes(currentRole) || 
      task.requiredSkills.some(skill => this.agentHasSkill(currentRole, skill))
    );
    
    let contextBuilder = '';
    
    if (completedResults.length === 0) {
      contextBuilder = `You are the first agent in this swarm. Focus on your primary expertise as a ${currentRole} agent.`;
    } else {
      contextBuilder = `You are working as part of a swarm. Previous results from other agents:

${completedResults.join('\n\n')}

Build upon these results with your expertise as a ${currentRole} agent.`;
    }
    
    // Add specific task assignments
    if (relevantTasks.length > 0) {
      contextBuilder += `\n\nSpecific tasks assigned to you based on your expertise:
${relevantTasks.map((task, idx) => 
  `${idx + 1}. ${task.description}
   Priority: ${task.priority}, Complexity: ${task.estimatedComplexity}`
).join('\n\n')}`;
    }
    
    // Add overall context about remaining work
    const incompleteTasks = tasks.filter(task => !this.isTaskCompleted(state, task));
    if (incompleteTasks.length > 0) {
      contextBuilder += `\n\nRemaining tasks for the swarm:
${incompleteTasks.map(task => `- ${task.description}`).join('\n')}`;
    }
    
    return contextBuilder;
  }

  private agentHasSkill(role: string, skill: string): boolean {
    // Map common skills to agent types
    const skillMapping: { [key: string]: string[] } = {
      'research': ['research', 'data_analysis', 'investigation'],
      'analysis': ['analysis', 'critical_thinking', 'evaluation'],
      'creative': ['creativity', 'design', 'marketing', 'content'],
      'communication': ['writing', 'presentation', 'documentation'],
      'technical': ['programming', 'development', 'engineering'],
      'validation': ['testing', 'quality_assurance', 'verification']
    };
    
    const agentSkills = skillMapping[role] || [role];
    return agentSkills.some(agentSkill => 
      skill.toLowerCase().includes(agentSkill.toLowerCase()) ||
      agentSkill.toLowerCase().includes(skill.toLowerCase())
    );
  }

  private async executeAgentWithSwarmContext(
    agentCard: AgentCard,
    state: WorkflowState,
    role: string,
    swarmContext: string,
    tasks: SubTask[]
  ): Promise<{ 
    success: boolean; 
    output: string; 
    toolExecutions?: any[]; 
    startTime?: number; 
    pendingApprovals?: ToolApprovalRequest[] 
  }> {
    const startTime = Date.now();
    
    try {
      console.log(`[LangGraph] executeAgentWithSwarmContext starting for ${role} agent`);
      
      const config = AgentRegistry.getAgentConfig(role);
      if (!config) {
        throw new Error(`Configuration not found for role: ${role}`);
      }
      
      // Enhanced prompt with task context
      const swarmPrompt = `${config.systemPrompt}

SWARM CONTEXT:
${swarmContext}

DECOMPOSED TASK INFORMATION:
${state.taskAnalysis ? `Task Analysis: ${state.taskAnalysis}` : ''}

Your goal is to contribute your expertise while building upon the work of other agents in your swarm.
Focus on the tasks most relevant to your skills and coordinate effectively with the overall objective.`;
      
      const agentOptions: LangChainAgentOptions = {
        ...this.agentOptions,
        systemPrompt: swarmPrompt,
        tools: this.agentOptions.tools || [],
      };
      
      const agentService = LangChainServiceFactory.createAgent(agentOptions);
      
      await this.sendRendererUpdate(state, {
        type: 'agent_status',
        data: {
          agentCard: { ...agentCard, status: 'executing' },
          status: 'executing',
          currentTask: `Swarm coordination: ${state.originalTask}`
        }
      });
      
      console.log(`[LangGraph] Calling swarm agent service with enhanced prompt...`);
      
      // Construct a more detailed request for the agent
      const relevantTasks = tasks.filter(task => 
        task.suggestedAgentTypes.includes(role) || 
        task.requiredSkills.some(skill => this.agentHasSkill(role, skill))
      );
      
      let agentRequest = `As a ${role} agent in a coordinated swarm, help with this task: ${state.originalTask}`;
      
      if (relevantTasks.length > 0) {
        agentRequest += `\n\nFocus particularly on these subtasks that match your expertise:
${relevantTasks.map(task => `- ${task.description}`).join('\n')}`;
      }
      
      if (swarmContext && !swarmContext.includes('first agent')) {
        agentRequest += `\n\nContext from other agents: ${swarmContext}`;
      }
      
      const response = await agentService.getCompletion([{
        role: 'user',
        content: agentRequest
      }]);
      
      const output = response.choices[0]?.message?.content || '';
      
      // Handle tool calls
      if (response.choices[0]?.message?.tool_calls && response.choices[0].message.tool_calls.length > 0) {
        return this.handleSwarmToolCalls(response, agentCard, state, role, startTime);
      }
      
      return {
        success: true,
        output,
        startTime
      };
      
    } catch (error: any) {
      if (error.name === 'GraphInterrupt') {
        throw error;
      }
      
      console.error(`[LangGraph] Swarm agent execution failed:`, error);
      return {
        success: false,
        output: `Swarm agent execution failed: ${error.message}`,
        startTime
      };
    }
  }

  private async handleSwarmToolCalls(
    response: any,
    agentCard: AgentCard,
    state: WorkflowState,
    role: string,
    startTime: number
  ): Promise<{ 
    success: boolean; 
    output: string; 
    startTime: number; 
    pendingApprovals: ToolApprovalRequest[] 
  }> {
    const output = response.choices[0]?.message?.content || '';
    const pendingApprovals: ToolApprovalRequest[] = [];
    const currentTime = Date.now();
    
    for (const toolCall of response.choices[0].message.tool_calls) {
      const toolName = toolCall.function?.name || 'unknown';
      const originalTool = this.agentOptions.tools?.find(t => t.function?.name === toolName);
      const mcpServer = (originalTool as any)?.mcpServer || 'unknown';
      const risk = this.assessToolRisk(toolName, mcpServer);
      
      const toolId = `swarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const approvalRequest: ToolApprovalRequest = {
        id: toolId,
        agentCard: agentCard,
        toolCall: {
          ...toolCall,
          mcpServer: mcpServer
        },
        context: `${role} agent in swarm wants to use ${toolName} for: ${state.originalTask}`,
        timestamp: currentTime,
        risk: risk,
        status: 'pending',
        mcpServer: mcpServer
      };
      
      pendingApprovals.push(approvalRequest);
    }
    
    return {
      success: false,
      output: `${output}\n\n**Swarm agent waiting for approval of ${pendingApprovals.length} tools...**`,
      startTime,
      pendingApprovals
    };
  }

  // Fallback to individual agent execution
  private async executeIndividualAgent(state: WorkflowState, role: string, tasks: SubTask[]): WorkflowNodeResult {
    console.log(`[LangGraph] Executing individual agent ${role}...`);
    
    const agentCard = state.activeAgentCards[role];
    
    const updatedAgentCard: AgentCard = {
      ...agentCard,
      status: 'busy',
      currentTask: state.originalTask
    };
    
    // Send status update that agent is starting
    await this.sendRendererUpdate(state, {
      type: 'agent_status',
      data: {
        agentCard: updatedAgentCard,
        status: 'busy',
        currentTask: state.originalTask
      }
    });
    
    // Find matching decomposed subtask for this role and mark as running
    const webContents = (state as any).webContents || (global as any).osswarmWebContents;
    if (webContents && !webContents.isDestroyed() && state.executionId && state.decomposedSubtasks && Array.isArray(state.decomposedSubtasks)) {
      const matchingSubtask = (state.decomposedSubtasks as any[]).find(st => {
        const suggestMatch = Array.isArray(st?.suggestedAgentTypes) && st.suggestedAgentTypes.includes(role);
        const skillMatch = Array.isArray(st?.requiredSkills) && st.requiredSkills.some((skill: string) => this.agentHasSkill(role, skill));
        return suggestMatch || skillMatch;
      });
      
      if (matchingSubtask) {
        console.log(`[LangGraph] Marking decomposed task ${matchingSubtask.id} as running for ${role} agent`);
        webContents.send('agent:update_task_status', {
          executionId: state.executionId,
          subtaskId: matchingSubtask.id,
          taskDescription: matchingSubtask.description,
          status: 'running',
          agentId: updatedAgentCard.runtimeId || role
        });
      }
    }
    
    try {
      const result = await this.executeAgentWithApproval(
        updatedAgentCard,
        state,
        role,
        tasks
      );
      
      if (result.pendingApprovals && result.pendingApprovals.length > 0) {
        const awaitingAgentCard = { ...updatedAgentCard, status: 'awaiting_approval' as const };
        return {
          activeAgentCards: {
            ...state.activeAgentCards,
            [role]: awaitingAgentCard
          },
          pendingApprovals: [...(state.pendingApprovals || []), ...result.pendingApprovals],
          waitingForHumanResponse: false,
          awaitingToolResults: false
        };
      }
      
      const finalAgentCard: AgentCard = {
        ...updatedAgentCard,
        status: result.success ? 'completed' : 'failed'
      };
      
      // Update matching decomposed tasks to completed/failed
      if (webContents && !webContents.isDestroyed() && state.executionId && state.decomposedSubtasks && Array.isArray(state.decomposedSubtasks)) {
        const relevantSubtasks = (state.decomposedSubtasks as any[]).filter(st => {
          const suggestMatch = Array.isArray(st?.suggestedAgentTypes) && st.suggestedAgentTypes.includes(role);
          const skillMatch = Array.isArray(st?.requiredSkills) && st.requiredSkills.some((skill: string) => this.agentHasSkill(role, skill));
          return suggestMatch || skillMatch;
        });
        
        for (const st of relevantSubtasks) {
          console.log(`[LangGraph] Marking decomposed task ${st.id} as ${finalAgentCard.status} for ${role} agent`);
          webContents.send('agent:update_task_status', {
            executionId: state.executionId,
            subtaskId: st.id,
            taskDescription: st.description,
            status: finalAgentCard.status,
            result: result.output,
            agentId: updatedAgentCard.runtimeId || role
          });
        }
      }
      
      return {
        activeAgentCards: {
          ...state.activeAgentCards,
          [role]: finalAgentCard
        },
        agentResults: {
          ...state.agentResults,
          [role]: {
            agentCard: finalAgentCard,
            result: result.output,
            toolExecutions: result.toolExecutions || [],
            status: finalAgentCard.status || 'failed',
            startTime: result.startTime || Date.now(),
            endTime: Date.now()
          }
        },
        waitingForHumanResponse: false,
        awaitingToolResults: false
      };
      
    } catch (error: any) {
      if (error.name === 'GraphInterrupt') {
        throw error;
      }
      
      const failedAgentCard: AgentCard = {
        ...updatedAgentCard,
        status: 'failed'
      };
      
      return {
        activeAgentCards: {
          ...state.activeAgentCards,
          [role]: failedAgentCard
        },
        errors: [...state.errors, `Individual agent ${role} failed: ${error.message}`],
        waitingForHumanResponse: false,
        awaitingToolResults: false
      };
    }
  }

  private async executeAgentWithApproval(
    agentCard: AgentCard,
    state: WorkflowState,
    role: string,
    tasks: SubTask[]
  ): Promise<{ 
    success: boolean; 
    output: string; 
    toolExecutions?: any[]; 
    startTime?: number; 
    pendingApprovals?: ToolApprovalRequest[] 
  }> {
    const startTime = Date.now();
    
    try {
      const config = AgentRegistry.getAgentConfig(role);
      if (!config) {
        throw new Error(`Configuration not found for role: ${role}`);
      }
      
      // Find tasks relevant to this agent
      const relevantTasks = tasks.filter(task => 
        task.suggestedAgentTypes.includes(role) || 
        task.requiredSkills.some(skill => this.agentHasSkill(role, skill))
      );
      
      let enhancedPrompt = config.systemPrompt;
      if (relevantTasks.length > 0) {
        enhancedPrompt += `\n\nYou are specifically assigned to work on these subtasks:
${relevantTasks.map((task, idx) => 
  `${idx + 1}. ${task.description} (Priority: ${task.priority}, Complexity: ${task.estimatedComplexity})`
).join('\n')}`;
      }
      
      const agentOptions: LangChainAgentOptions = {
        ...this.agentOptions,
        systemPrompt: enhancedPrompt,
        tools: this.agentOptions.tools || [],
      };
      
      const agentService = LangChainServiceFactory.createAgent(agentOptions);
      
      let userContent = `As a ${role} agent, help with this task: ${state.originalTask}`;
      
      if (relevantTasks.length > 0) {
        userContent += `\n\nFocus on these specific subtasks that match your expertise:
${relevantTasks.map(task => `- ${task.description}`).join('\n')}`;
      }
      
      const response = await agentService.getCompletion([{
        role: 'user',
        content: userContent
      }]);
      
      const output = response.choices[0]?.message?.content || '';
      
      if (response.choices[0]?.message?.tool_calls && response.choices[0].message.tool_calls.length > 0) {
        return this.handleSwarmToolCalls(response, agentCard, state, role, startTime);
      }
      
      return {
        success: true,
        output,
        startTime
      };
      
    } catch (error: any) {
      if (error.name === 'GraphInterrupt') {
        throw error;
      }
      
      return {
        success: false,
        output: `Agent execution failed: ${error.message}`,
        startTime
      };
    }
  }
} 