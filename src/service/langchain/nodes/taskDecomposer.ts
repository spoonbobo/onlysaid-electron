import { AIMessage } from "@langchain/core/messages";
import { BaseWorkflowNode } from './base';
import { WorkflowState, WorkflowNodeResult } from './types';
import { AgentRegistry } from '../agent/registry';
import { LangChainServiceFactory } from '../factory/factory';
import { LangChainAgentOptions } from '../agent';

export interface SubTask {
  id: string;
  description: string;
  requiredSkills: string[];
  suggestedAgentTypes: string[];
  priority: number;
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export class TaskDecomposerNode extends BaseWorkflowNode {
  async execute(state: WorkflowState): WorkflowNodeResult {
    console.log('[LangGraph] Task decomposer analyzing and decomposing task...');
    
    const masterConfig = AgentRegistry.getAgentConfig('master');
    if (!masterConfig) {
      throw new Error('Master agent configuration not found in registry');
    }
    
    const masterOptions: LangChainAgentOptions = {
      ...this.agentOptions,
      systemPrompt: masterConfig.systemPrompt,
    };
    
    const masterAgent = LangChainServiceFactory.createAgent(masterOptions);
    
    const availableAgentTypes = state.availableAgentCards.map(card => ({
      role: card.role,
      name: card.name,
      description: card.description,
      expertise: card.expertise
    }));
    
    const decompositionPrompt = `
You are a master task coordinator. Analyze this task and break it down into specific subtasks that can be optimally executed by available agents.

ORIGINAL TASK: ${state.originalTask}

AVAILABLE AGENT TYPES:
${availableAgentTypes.map(agent => 
  `- ${agent.role}: ${agent.description} (Expertise: ${agent.expertise?.join(', ') || 'general'})`
).join('\n')}

Your job is to:
1. Analyze the complexity and requirements of the original task
2. Break it down into 1-4 specific subtasks that can be executed by the available agents
3. For each subtask, identify what skills are needed and which agent types would be best
4. Prioritize tasks based on dependencies and importance
5. Estimate complexity to help with resource allocation

Consider these factors:
- Task dependencies (some tasks may need to be completed before others)
- Agent specializations and expertise
- Resource requirements and complexity
- Time estimation and prioritization

Respond in this EXACT JSON format:
{
  "analysis": "Brief analysis of the task complexity, approach, and coordination strategy",
  "taskBreakdownReasoning": "Explanation of why you chose this specific breakdown",
  "subtasks": [
    {
      "id": "subtask_1",
      "description": "Specific description of what needs to be done",
      "requiredSkills": ["skill1", "skill2"],
      "suggestedAgentTypes": ["agent_role1", "agent_role2"],
      "priority": 1,
      "estimatedComplexity": "medium"
    }
  ],
  "coordinationNotes": "Notes about how these tasks should be coordinated"
}

Make sure each subtask is actionable and specific. Consider if the task needs research, analysis, creativity, technical implementation, etc.
Focus on creating subtasks that leverage the strengths of your available agents.
`;
    
    const response = await masterAgent.getCompletion([{
      role: 'user',
      content: decompositionPrompt
    }]);
    
    const responseContent = response.choices[0]?.message?.content || '';
    
    let decompositionResult;
    try {
      // Extract JSON from response (handle potential markdown formatting)
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseContent;
      decompositionResult = JSON.parse(jsonString);
    } catch (error) {
      console.warn('[TaskDecomposer] Failed to parse JSON response, falling back to simple decomposition');
      // Fallback to enhanced simple task structure
      decompositionResult = {
        analysis: "Task analysis completed with fallback method - complex task requiring multiple agent coordination",
        taskBreakdownReasoning: "Using fallback decomposition due to parsing issues",
        subtasks: this.createFallbackSubtasks(state.originalTask, availableAgentTypes),
        coordinationNotes: "Agents should work sequentially, building upon each other's results"
      };
    }
    
    // Validate and enhance subtasks
    const enhancedSubtasks = this.validateAndEnhanceSubtasks(
      decompositionResult.subtasks,
      availableAgentTypes
    );
    
    console.log('[TaskDecomposer] Created subtasks:', enhancedSubtasks.map((st: SubTask) => st.id));
    
    // ✅ Send decomposed tasks to renderer using state webContents
    const webContents = state.webContents;
    if (webContents?.isValid()) {
      try {
        webContents.send('agent:save_decomposed_tasks_to_db', {
          executionId: state.executionId,
          subtasks: enhancedSubtasks,
          taskAnalysis: decompositionResult.analysis
        });
        
        console.log('[TaskDecomposer] ✅ Sent decomposed tasks to renderer for storage');
      } catch (error) {
        console.error('[TaskDecomposer] ❌ Failed to send decomposed tasks to renderer:', error);
      }
    }
    
    await this.sendRendererUpdate(state, {
      type: 'execution_progress',
      data: {
        status: 'decomposed',
        analysis: decompositionResult.analysis,
        subtaskCount: enhancedSubtasks.length,
        taskBreakdownReasoning: decompositionResult.taskBreakdownReasoning,
        coordinationNotes: decompositionResult.coordinationNotes
      }
    });
    
    return {
      currentPhase: 'agent_selection',
      messages: [...state.messages, new AIMessage(decompositionResult.analysis)],
      decomposedSubtasks: enhancedSubtasks,
      taskAnalysis: `${decompositionResult.analysis}\n\nBreakdown Reasoning: ${decompositionResult.taskBreakdownReasoning}\n\nCoordination Notes: ${decompositionResult.coordinationNotes}`
    };
  }

  private createFallbackSubtasks(originalTask: string, availableAgents: any[]): SubTask[] {
    // Create intelligent fallback based on task content and available agents
    const taskLower = originalTask.toLowerCase();
    const subtasks: SubTask[] = [];
    
    // Determine if research is needed
    if (this.taskNeedsResearch(taskLower)) {
      subtasks.push({
        id: "research_phase",
        description: `Research and gather information relevant to: ${originalTask}`,
        requiredSkills: ["research", "information_gathering", "analysis"],
        suggestedAgentTypes: availableAgents.filter(a => 
          ['research', 'analysis'].includes(a.role)
        ).map(a => a.role),
        priority: 1,
        estimatedComplexity: "medium"
      });
    }
    
    // Determine if analysis is needed
    if (this.taskNeedsAnalysis(taskLower)) {
      subtasks.push({
        id: "analysis_phase",
        description: `Analyze findings and develop insights for: ${originalTask}`,
        requiredSkills: ["analysis", "critical_thinking", "evaluation"],
        suggestedAgentTypes: availableAgents.filter(a => 
          ['analysis', 'research'].includes(a.role)
        ).map(a => a.role),
        priority: 2,
        estimatedComplexity: "medium"
      });
    }
    
    // Determine if creative work is needed
    if (this.taskNeedsCreativity(taskLower)) {
      subtasks.push({
        id: "creative_phase",
        description: `Create content or design solutions for: ${originalTask}`,
        requiredSkills: ["creativity", "design", "content_creation"],
        suggestedAgentTypes: availableAgents.filter(a => 
          ['creative', 'communication'].includes(a.role)
        ).map(a => a.role),
        priority: 3,
        estimatedComplexity: "high"
      });
    }
    
    // Always have a synthesis/communication phase
    subtasks.push({
      id: "synthesis_phase",
      description: `Synthesize results and prepare final deliverable for: ${originalTask}`,
      requiredSkills: ["communication", "synthesis", "documentation"],
      suggestedAgentTypes: availableAgents.filter(a => 
        ['communication', 'analysis'].includes(a.role)
      ).map(a => a.role),
      priority: 4,
      estimatedComplexity: "medium"
    });
    
    return subtasks.length > 0 ? subtasks : [{
      id: "general_task",
      description: originalTask,
      requiredSkills: ["general"],
      suggestedAgentTypes: availableAgents.slice(0, 2).map(a => a.role),
      priority: 1,
      estimatedComplexity: "medium"
    }];
  }

  private taskNeedsResearch(task: string): boolean {
    const researchKeywords = [
      'research', 'investigate', 'find', 'gather', 'collect', 'information',
      'data', 'facts', 'study', 'analyze', 'examine', 'explore'
    ];
    return researchKeywords.some(keyword => task.includes(keyword));
  }

  private taskNeedsAnalysis(task: string): boolean {
    const analysisKeywords = [
      'analyze', 'evaluate', 'assess', 'compare', 'review', 'examine',
      'interpret', 'understand', 'insights', 'conclusions', 'report'
    ];
    return analysisKeywords.some(keyword => task.includes(keyword));
  }

  private taskNeedsCreativity(task: string): boolean {
    const creativeKeywords = [
      'create', 'design', 'write', 'develop', 'build', 'generate',
      'content', 'creative', 'innovative', 'blog', 'article', 'story'
    ];
    return creativeKeywords.some(keyword => task.includes(keyword));
  }

  private validateAndEnhanceSubtasks(
    subtasks: SubTask[],
    availableAgents: any[]
  ): SubTask[] {
    if (!subtasks || !Array.isArray(subtasks)) {
      return this.createFallbackSubtasks("general task", availableAgents);
    }
    
    return subtasks.map((task, index) => ({
      id: task.id || `subtask_${index + 1}`,
      description: task.description || "Unspecified task",
      requiredSkills: Array.isArray(task.requiredSkills) ? task.requiredSkills : ["general"],
      suggestedAgentTypes: this.validateAgentTypes(task.suggestedAgentTypes, availableAgents),
      priority: typeof task.priority === 'number' ? task.priority : index + 1,
      estimatedComplexity: ['low', 'medium', 'high'].includes(task.estimatedComplexity) 
        ? task.estimatedComplexity 
        : 'medium'
    }));
  }

  private validateAgentTypes(suggested: string[], availableAgents: any[]): string[] {
    if (!Array.isArray(suggested)) return ['research'];
    
    const availableRoles = availableAgents.map(a => a.role);
    const validSuggestions = suggested.filter(role => availableRoles.includes(role));
    
    return validSuggestions.length > 0 ? validSuggestions : ['research'];
  }
} 