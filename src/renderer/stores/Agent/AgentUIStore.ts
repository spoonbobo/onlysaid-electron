import { create } from 'zustand';

interface AgentUIState {
  taskHistoryOpen: boolean;
  openTaskHistory: () => void;
  closeTaskHistory: () => void;
}

export const useAgentUIStore = create<AgentUIState>((set) => ({
  taskHistoryOpen: false,
  openTaskHistory: () => set({ taskHistoryOpen: true }),
  closeTaskHistory: () => set({ taskHistoryOpen: false })
}));


