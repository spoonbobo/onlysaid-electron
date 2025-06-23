import { useState, useEffect, useCallback } from 'react';
import { AgentCard } from '@/../../types/Agent/AgentCard';
import { useAgentTaskStore } from '@/renderer/stores/Agent/AgentTaskStore';

export interface UseAgentCardsOptions {
  executionId?: string;
  role?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useAgentCards(options: UseAgentCardsOptions = {}) {
  const [agentCards, setAgentCards] = useState<AgentCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getAgentCards, getAgentCardsByExecution, currentGraph } = useAgentTaskStore();

  const fetchAgentCards = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let cards: AgentCard[] = [];

      if (options.executionId) {
        cards = getAgentCardsByExecution(options.executionId);
      } else {
        cards = getAgentCards();
      }

      // Filter by role if specified
      if (options.role) {
        cards = cards.filter(card => card.role === options.role);
      }

      setAgentCards(cards);
    } catch (err: any) {
      console.error('[useAgentCards] Error fetching agent cards:', err);
      setError(err.message || 'Failed to fetch agent cards');
    } finally {
      setLoading(false);
    }
  }, [options.executionId, options.role, getAgentCards, getAgentCardsByExecution]);

  // Initial fetch
  useEffect(() => {
    fetchAgentCards();
  }, [fetchAgentCards]);

  // Auto-refresh
  useEffect(() => {
    if (!options.autoRefresh) return;

    const interval = setInterval(fetchAgentCards, options.refreshInterval || 5000);
    return () => clearInterval(interval);
  }, [options.autoRefresh, options.refreshInterval, fetchAgentCards]);

  // Refresh when current graph changes
  useEffect(() => {
    if (currentGraph) {
      fetchAgentCards();
    }
  }, [currentGraph, fetchAgentCards]);

  const refresh = useCallback(() => {
    fetchAgentCards();
  }, [fetchAgentCards]);

  const getAgentCard = useCallback((agentId: string) => {
    return agentCards.find(card => card.runtimeId === agentId || card.name === agentId);
  }, [agentCards]);

  const getAgentsByStatus = useCallback((status: string) => {
    return agentCards.filter(card => card.status === status);
  }, [agentCards]);

  const getAgentsByRole = useCallback((role: string) => {
    return agentCards.filter(card => card.role === role);
  }, [agentCards]);

  return {
    agentCards,
    loading,
    error,
    refresh,
    getAgentCard,
    getAgentsByStatus,
    getAgentsByRole
  };
} 