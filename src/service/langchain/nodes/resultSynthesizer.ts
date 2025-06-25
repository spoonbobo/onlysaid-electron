import { AIMessage } from "@langchain/core/messages";
import { BaseWorkflowNode } from './base';
import { WorkflowState, WorkflowNodeResult } from './types';
import { AgentRegistry } from '../agent/registry';
import { LangChainServiceFactory } from '../factory/factory';

export class ResultSynthesizerNode extends BaseWorkflowNode {
  async execute(state: WorkflowState): WorkflowNodeResult {
    console.log('[LangGraph] Result synthesizer combining agent outputs...');
    
    const webContents = state.webContents;
    const ipcSend = webContents?.isValid() ? 
      (channel: string, ...args: any[]) => webContents.send(channel, ...args) : 
      null;

    if (ipcSend && state.executionId) {
      ipcSend('agent:update_execution_status', {
        executionId: state.executionId,
        status: 'running'
      });
      
      ipcSend('agent:add_log_to_db', {
        executionId: state.executionId,
        logType: 'status_update',
        message: 'Starting result synthesis...'
      });
    }
    
    const masterConfig = AgentRegistry.getAgentConfig('master');
    const masterAgent = LangChainServiceFactory.createAgent({
        ...this.agentOptions,
        tools: [], // Explicitly disable tools for the synthesizer agent
        systemPrompt: masterConfig?.systemPrompt || 'You are a master coordinator.',
      });
    
    const agentResults = Object.values(state.agentResults);
    const resultsText = agentResults.map(result => 
      `${result.agentCard.name} (${result.agentCard.role}): ${result.result}`
    ).join('\n\n');
    
    // Enhanced synthesis prompt that considers decomposed tasks
    let synthesisPrompt = `
Synthesize these agent results into a comprehensive final response for: ${state.originalTask}

Agent Results:
${resultsText}`;

    // Add task decomposition context if available
    if (state.decomposedSubtasks && state.decomposedSubtasks.length > 0) {
      synthesisPrompt += `

Task Decomposition Context:
${state.taskAnalysis || 'Task was broken down into specific subtasks'}

Subtasks Addressed:
${state.decomposedSubtasks.map((task, idx) => 
  `${idx + 1}. ${task.description} (Priority: ${task.priority}, Complexity: ${task.estimatedComplexity})`
).join('\n')}

Consider how each agent's work addressed the specific subtasks and ensure all aspects of the original task are covered in your synthesis.`;
    }

    synthesisPrompt += `

Instructions for Synthesis:
1. Provide a well-structured, comprehensive response
2. Ensure all aspects of the original task are addressed
3. Highlight key insights and findings from each agent
4. Create a cohesive narrative that builds upon all agent contributions
5. Include any actionable recommendations or next steps if appropriate

Final synthesized response:`;
    
    const response = await masterAgent.getCompletion([{
      role: 'user',
      content: synthesisPrompt
    }]);
    
    const synthesizedResult = response.choices[0]?.message?.content || '';
    
    // Log detailed synthesis information
    if (ipcSend && state.executionId) {
      ipcSend('agent:update_execution_status', {
        executionId: state.executionId,
        status: 'running'
      });
      
      ipcSend('agent:add_log_to_db', {
        executionId: state.executionId,
        logType: 'synthesis',
        message: `Result synthesis completed with ${agentResults.length} agent contributions${state.decomposedSubtasks ? ` across ${state.decomposedSubtasks.length} subtasks` : ''}`
      });
    }
    
    await this.sendRendererUpdate(state, {
      type: 'result_synthesis',
      data: {
        result: synthesizedResult,
        agentContributions: agentResults.length,
        subtasksAddressed: state.decomposedSubtasks?.length || 0,
        taskAnalysis: state.taskAnalysis,
        agentBreakdown: agentResults.map(result => ({
          role: result.agentCard.role,
          name: result.agentCard.name,
          status: result.status,
          hasResult: !!result.result
        }))
      }
    });
    
    if (ipcSend && state.executionId) {
      ipcSend('agent:clear_task_state', {
        taskId: 'current',
        executionId: state.executionId
      });
      
      ipcSend('agent:update_execution_status', {
        executionId: state.executionId,
        status: 'completed',
        result: synthesizedResult
      });
      
      ipcSend('agent:add_log_to_db', {
        executionId: state.executionId,
        logType: 'info',
        message: 'Task completed - clearing agent states'
      });
    }
    
    return {
      synthesizedResult,
      currentPhase: 'completed',
      messages: [...state.messages, new AIMessage(synthesizedResult)]
    };
  }
} 