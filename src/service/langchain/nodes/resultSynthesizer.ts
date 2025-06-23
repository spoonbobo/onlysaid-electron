import { AIMessage } from "@langchain/core/messages";
import { BaseWorkflowNode } from './base';
import { WorkflowState, WorkflowNodeResult } from './types';
import { AgentRegistry } from '../agent/registry';
import { LangChainServiceFactory } from '../factory/factory';

export class ResultSynthesizerNode extends BaseWorkflowNode {
  async execute(state: WorkflowState): WorkflowNodeResult {
    console.log('[LangGraph] Result synthesizer combining agent outputs...');
    
    const webContents = (global as any).osswarmWebContents;
    if (webContents && state.executionId) {
      webContents.send('agent:update_execution_status', {
        executionId: state.executionId,
        status: 'running'
      });
      
      webContents.send('agent:add_log_to_db', {
        executionId: state.executionId,
        logType: 'status_update',
        message: 'Starting result synthesis...'
      });
    }
    
    const masterConfig = AgentRegistry.getAgentConfig('master');
    const masterAgent = LangChainServiceFactory.createAgent({
        ...this.agentOptions,
        systemPrompt: masterConfig?.systemPrompt || 'You are a master coordinator.',
      });
    
    const agentResults = Object.values(state.agentResults);
    const resultsText = agentResults.map(result => 
      `${result.agentCard.name} (${result.agentCard.role}): ${result.result}`
    ).join('\n\n');
    
    const synthesisPrompt = `
    Synthesize these agent results into a comprehensive final response for: ${state.originalTask}
    
    Agent Results:
    ${resultsText}
    
    Provide a well-structured, comprehensive response.
    `;
    
    const response = await masterAgent.getCompletion([{
      role: 'user',
      content: synthesisPrompt
    }]);
    
    const synthesizedResult = response.choices[0]?.message?.content || '';
    
    if (webContents && state.executionId) {
      webContents.send('agent:update_execution_status', {
        executionId: state.executionId,
        status: 'running'
      });
      
      webContents.send('agent:add_log_to_db', {
        executionId: state.executionId,
        logType: 'synthesis',
        message: `Result synthesis completed with ${agentResults.length} agent contributions`
      });
    }
    
    await this.sendRendererUpdate(state, {
      type: 'result_synthesis',
      data: {
        result: synthesizedResult,
        agentContributions: agentResults.length
      }
    });
    
    return {
      synthesizedResult,
      currentPhase: 'validation',
      messages: [...state.messages, new AIMessage(synthesizedResult)]
    };
  }
} 