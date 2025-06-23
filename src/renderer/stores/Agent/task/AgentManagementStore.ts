import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { DBTABLES } from '@/../../constants/db';
import { osswarmAgentToAgentCard } from '@/service/langchain/factory/renderer/factory';
import { AgentCard } from '@/../../types/Agent/AgentCard';
import { OSSwarmAgent, AgentUpdateData } from './types';

interface AgentManagementState {
  // Current agents
  agents: OSSwarmAgent[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createAgent: (executionId: string, agentId: string, role: string, expertise?: string[]) => Promise<string>;
  updateAgentStatus: (agentId: string, status: OSSwarmAgent['status'], currentTask?: string) => Promise<void>;
  loadAgentsByExecution: (executionId: string) => Promise<void>;
  setAgents: (agents: OSSwarmAgent[]) => void;
  clearAgents: () => void;
  
  // Agent cards
  getAgentCards: () => AgentCard[];
  getAgentCardsByExecution: (executionId: string) => AgentCard[];
  
  // Real-time updates
  handleAgentUpdate: (data: AgentUpdateData) => void;
}

export const useAgentManagementStore = create<AgentManagementState>((set, get) => ({
  agents: [],
  isLoading: false,
  error: null,

  createAgent: async (executionId: string, agentId: string, role: string, expertise?: string[]) => {
    const callId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`💾 [DB AGENT CREATE START] ${callId}:`, { executionId, agentId, role });
    
    const dbAgentId = uuidv4();
    const now = new Date().toISOString();

    try {
      // ✅ First, verify the execution exists with a retry mechanism
      let executionExists = false;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!executionExists && retryCount < maxRetries) {
        const executionCheck = await window.electron.db.query({
          query: `SELECT id FROM ${DBTABLES.OSSWARM_EXECUTIONS} WHERE id = @id`,
          params: { id: executionId }
        });

        if (executionCheck && executionCheck.length > 0) {
          executionExists = true;
          console.log(`💾 [DB AGENT CREATE] ${callId}: Execution verified on attempt ${retryCount + 1}`);
        } else {
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`💾 [DB AGENT CREATE] ${callId}: Execution not found, retry ${retryCount}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms before retry
          }
        }
      }

      if (!executionExists) {
        throw new Error(`Execution ${executionId} does not exist after ${maxRetries} attempts. Cannot create agent.`);
      }

      await window.electron.db.query({
        query: `
          INSERT INTO ${DBTABLES.OSSWARM_AGENTS}
          (id, execution_id, agent_id, role, expertise, status, created_at)
          VALUES (@id, @execution_id, @agent_id, @role, @expertise, @status, @created_at)
        `,
        params: {
          id: dbAgentId,
          execution_id: executionId,
          agent_id: agentId,
          role,
          expertise: expertise ? JSON.stringify(expertise) : null,
          status: 'idle',
          created_at: now
        }
      });

      console.log(`✅ [DB AGENT CREATE SUCCESS] ${callId} - DB ID: ${dbAgentId}`);

      // Update total agents count
      await window.electron.db.query({
        query: `UPDATE ${DBTABLES.OSSWARM_EXECUTIONS} SET total_agents = total_agents + 1 WHERE id = @id`,
        params: { id: executionId }
      });

      // Add to local state
      const newAgent: OSSwarmAgent = {
        id: dbAgentId,
        execution_id: executionId,
        agent_id: agentId,
        role,
        expertise: expertise ? JSON.stringify(expertise) : undefined,
        status: 'idle',
        created_at: now
      };

      set(state => ({
        agents: [...state.agents, newAgent]
      }));
      
      return dbAgentId;
    } catch (error: any) {
      console.error(`❌ [DB AGENT CREATE ERROR] ${callId}:`, error);
      set({ error: error.message });
      throw error;
    }
  },

  updateAgentStatus: async (agentId: string, status: OSSwarmAgent['status'], currentTask?: string) => {
    const now = new Date().toISOString();
    const updates: any = { status };
    
    if (currentTask) updates.current_task = currentTask;
    if (status === 'busy' && !updates.started_at) updates.started_at = now;
    if ((status === 'completed' || status === 'failed') && !updates.completed_at) updates.completed_at = now;

    try {
      const setClause = Object.keys(updates).map(key => `${key} = @${key}`).join(', ');
      
      await window.electron.db.query({
        query: `UPDATE ${DBTABLES.OSSWARM_AGENTS} SET ${setClause} WHERE id = @id`,
        params: { ...updates, id: agentId }
      });

      // Update local state
      set(state => ({
        agents: state.agents.map(agent => 
          agent.id === agentId ? { ...agent, ...updates } : agent
        )
      }));
    } catch (error: any) {
      console.error('[AgentManagementStore] Error updating agent status:', error);
      set({ error: error.message });
      throw error;
    }
  },

  loadAgentsByExecution: async (executionId: string) => {
    set({ isLoading: true, error: null });

    try {
      const agents = await window.electron.db.query({
        query: `SELECT * FROM ${DBTABLES.OSSWARM_AGENTS} WHERE execution_id = @execution_id ORDER BY created_at`,
        params: { execution_id: executionId }
      });

      set({ agents: agents || [], isLoading: false });
    } catch (error: any) {
      console.error('[AgentManagementStore] Error loading agents:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  setAgents: (agents: OSSwarmAgent[]) => {
    set({ agents });
  },

  clearAgents: () => {
    set({ agents: [] });
  },

  getAgentCards: () => {
    const state = get();
    return state.agents.map(agent => osswarmAgentToAgentCard(agent));
  },

  getAgentCardsByExecution: (executionId: string) => {
    const state = get();
    const executionAgents = state.agents.filter(agent => agent.execution_id === executionId);
    return executionAgents.map(agent => osswarmAgentToAgentCard(agent));
  },

  handleAgentUpdate: (data: AgentUpdateData) => {
    const { agentId, status, currentTask } = data;
    
    set(state => ({
      agents: state.agents.map(agent => 
        agent.id === agentId 
          ? { 
              ...agent, 
              status: status as OSSwarmAgent['status'], 
              current_task: currentTask,
              completed_at: (status === 'completed' || status === 'failed') 
                ? new Date().toISOString() 
                : agent.completed_at
            }
          : agent
      )
    }));
  }
})); 