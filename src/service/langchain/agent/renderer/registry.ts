import { AgentCard, AgentCapabilities, AgentSkill } from '@/../../types/Agent/AgentCard';

export interface AgentTypeConfig {
  role: string;
  name: string;
  description: string;
  iconUrl: string;
  expertise: string[];
  skills: AgentSkill[];
  capabilities: AgentCapabilities;
  systemPrompt: string;
  supportsKnowledgeBase?: boolean;
}

export class RendererAgentRegistry {
  private static agentTypes: Map<string, AgentTypeConfig> = new Map();

  static {
    // Initialize all agent types
    this.registerAgentTypes();
  }

  private static registerAgentTypes(): void {
    const agentConfigs: AgentTypeConfig[] = [
      {
        role: 'research',
        name: 'Research Agent',
        description: 'Specialized in information gathering, fact-checking, and data analysis. Provides accurate, well-sourced information.',
        iconUrl: '/icons/agents/research.svg',
        expertise: ['information_gathering', 'fact_checking', 'data_analysis'],
        skills: [
          {
            name: 'Information Gathering',
            description: 'Collect and organize information from various sources',
            category: 'research',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
            requiresApproval: true,
            tools: []
          },
          {
            name: 'Fact Checking',
            description: 'Verify the accuracy and reliability of information',
            category: 'research',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
            requiresApproval: true,
            tools: []
          }
        ],
        capabilities: {
          streaming: true,
          toolCalling: true,
          knowledgeBase: false,
          pushNotifications: false,
          multiModal: false
        },
        systemPrompt: "You are a Research Agent specializing in information gathering, fact-checking, and data analysis. All tool usage requires human approval. Provide accurate, well-sourced information."
      },
      {
        role: 'analysis',
        name: 'Analysis Agent',
        description: 'Expert in logical reasoning and problem decomposition. Breaks down complex problems systematically.',
        iconUrl: '/icons/agents/analysis.svg',
        expertise: ['logical_reasoning', 'problem_decomposition', 'critical_thinking'],
        skills: [
          {
            name: 'Logical Reasoning',
            description: 'Apply logical thinking to solve problems',
            category: 'analysis',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
            requiresApproval: false,
            tools: []
          },
          {
            name: 'Problem Decomposition',
            description: 'Break down complex problems into manageable parts',
            category: 'analysis',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
            requiresApproval: false,
            tools: []
          }
        ],
        capabilities: {
          streaming: true,
          toolCalling: true,
          knowledgeBase: false,
          pushNotifications: false,
          multiModal: false
        },
        systemPrompt: "You are an Analysis Agent specializing in logical reasoning and problem decomposition. All tool usage requires human approval. Break down complex problems systematically."
      },
      {
        role: 'creative',
        name: 'Creative Agent',
        description: 'Focused on innovative solutions and design thinking. Generates creative, practical ideas.',
        iconUrl: '/icons/agents/creative.svg',
        expertise: ['brainstorming', 'design_thinking', 'innovation'],
        skills: [
          {
            name: 'Brainstorming',
            description: 'Generate creative ideas and solutions',
            category: 'creative',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
            requiresApproval: false,
            tools: []
          },
          {
            name: 'Design Thinking',
            description: 'Apply human-centered design principles',
            category: 'creative',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
            requiresApproval: false,
            tools: []
          }
        ],
        capabilities: {
          streaming: true,
          toolCalling: true,
          knowledgeBase: false,
          pushNotifications: false,
          multiModal: false
        },
        systemPrompt: "You are a Creative Agent specializing in innovative solutions and design thinking. All tool usage requires human approval. Generate creative, practical ideas."
      },
      {
        role: 'technical',
        name: 'Technical Agent',
        description: 'Specialized in implementation and system design. Provides technical solutions and code.',
        iconUrl: '/icons/agents/technical.svg',
        expertise: ['programming', 'system_design', 'implementation'],
        skills: [
          {
            name: 'Programming',
            description: 'Write and debug code in various languages',
            category: 'technical',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
            requiresApproval: true,
            tools: []
          },
          {
            name: 'System Design',
            description: 'Design scalable and maintainable systems',
            category: 'technical',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
            requiresApproval: true,
            tools: []
          }
        ],
        capabilities: {
          streaming: true,
          toolCalling: true,
          knowledgeBase: false,
          pushNotifications: false,
          multiModal: false
        },
        systemPrompt: "You are a Technical Agent specializing in implementation and system design. All tool usage requires human approval. Provide technical solutions and code."
      },
      {
        role: 'communication',
        name: 'Communication Agent',
        description: 'Expert in clear writing and synthesis. Creates well-structured, understandable content.',
        iconUrl: '/icons/agents/communication.svg',
        expertise: ['writing', 'presentation', 'synthesis'],
        skills: [
          {
            name: 'Writing',
            description: 'Create clear and effective written content',
            category: 'communication',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
            requiresApproval: false,
            tools: []
          },
          {
            name: 'Presentation',
            description: 'Organize and present information effectively',
            category: 'communication',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
            requiresApproval: false,
            tools: []
          }
        ],
        capabilities: {
          streaming: true,
          toolCalling: true,
          knowledgeBase: false,
          pushNotifications: false,
          multiModal: false
        },
        systemPrompt: "You are a Communication Agent specializing in clear writing and synthesis. All tool usage requires human approval. Create well-structured, understandable content."
      },
      {
        role: 'validation',
        name: 'Validation Agent',
        description: 'Specialized in quality assurance and testing. Verifies accuracy and completeness.',
        iconUrl: '/icons/agents/validation.svg',
        expertise: ['testing', 'quality_assurance', 'verification'],
        skills: [
          {
            name: 'Testing',
            description: 'Verify functionality and quality of solutions',
            category: 'validation',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
            requiresApproval: true,
            tools: []
          },
          {
            name: 'Quality Assurance',
            description: 'Ensure standards and requirements are met',
            category: 'validation',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
            requiresApproval: true,
            tools: []
          }
        ],
        capabilities: {
          streaming: true,
          toolCalling: true,
          knowledgeBase: false,
          pushNotifications: false,
          multiModal: false
        },
        systemPrompt: "You are a Validation Agent specializing in quality assurance and testing. All tool usage requires human approval. Verify accuracy and completeness."
      },
      {
        role: 'rag',
        name: 'RAG Agent',
        description: 'Retrieval-Augmented Generation agent with access to knowledge bases. Provides contextual responses based on retrieved information.',
        iconUrl: '/icons/agents/rag.svg',
        expertise: ['knowledge_retrieval', 'contextual_search', 'information_synthesis', 'document_analysis'],
        skills: [
          {
            name: 'Knowledge Retrieval',
            description: 'Search and retrieve relevant information',
            category: 'rag',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
            requiresApproval: false,
            tools: []
          },
          {
            name: 'Contextual Search',
            description: 'Find information based on context and intent',
            category: 'rag',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
            requiresApproval: false,
            tools: []
          }
        ],
        capabilities: {
          streaming: true,
          toolCalling: true,
          knowledgeBase: true,
          pushNotifications: false,
          multiModal: false
        },
        systemPrompt: "You are a RAG (Retrieval-Augmented Generation) Agent specializing in knowledge retrieval and contextual responses. You have access to knowledge bases and can retrieve relevant information to enhance your responses. All tool usage requires human approval. Provide accurate, well-sourced answers based on retrieved knowledge.",
        supportsKnowledgeBase: true
      },
      {
        role: 'master',
        name: 'Master Agent',
        description: 'Master coordinator agent that orchestrates the entire swarm, decomposes tasks, and synthesizes results from specialized agents.',
        iconUrl: '/icons/agents/master.svg',
        expertise: ['task_coordination', 'agent_management', 'result_synthesis'],
        skills: [
          {
            name: 'Task Decomposition',
            description: 'Break down complex tasks into subtasks for specialized agents',
            category: 'coordination',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
            requiresApproval: false,
            tools: []
          },
          {
            name: 'Agent Coordination',
            description: 'Coordinate multiple specialized agents to work together',
            category: 'coordination',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
            requiresApproval: false,
            tools: []
          },
          {
            name: 'Result Synthesis',
            description: 'Combine results from multiple agents into coherent responses',
            category: 'coordination',
            inputModes: ['text/plain'],
            outputModes: ['text/plain'],
            requiresApproval: false,
            tools: []
          }
        ],
        capabilities: {
          streaming: true,
          toolCalling: true,
          knowledgeBase: true,
          pushNotifications: false,
          multiModal: false
        },
        systemPrompt: `You are the Master Agent of LangGraph OSSwarm, a distributed AI agent system with human oversight.

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

All tool usage requires human approval.`
      }
    ];

    // Register all agent types
    agentConfigs.forEach(config => {
      this.agentTypes.set(config.role, config);
    });
  }

  static getAgentConfig(role: string): AgentTypeConfig | null {
    return this.agentTypes.get(role) || null;
  }

  static getAllAgentConfigs(): AgentTypeConfig[] {
    return Array.from(this.agentTypes.values());
  }

  static getAvailableRoles(): string[] {
    return Array.from(this.agentTypes.keys());
  }

  static isValidRole(role: string): boolean {
    return this.agentTypes.has(role);
  }

  static getSystemPrompt(role: string): string {
    const config = this.getAgentConfig(role);
    return config?.systemPrompt || "You are a specialized AI agent with human oversight. All tool usage requires human approval. Follow instructions carefully and provide helpful responses.";
  }

  static getExpertise(role: string): string[] {
    const config = this.getAgentConfig(role);
    return config?.expertise || ['general'];
  }

  static supportsKnowledgeBase(role: string): boolean {
    const config = this.getAgentConfig(role);
    return config?.supportsKnowledgeBase || config?.capabilities.knowledgeBase || false;
  }
}