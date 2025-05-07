import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MCPConfigurationState {
    // Smithery API configuration
    smitheryKey: string;
    smitheryVerified: boolean;

    // Actions
    setSmitheryKey: (key: string) => void;
    setSmitheryVerified: (verified: boolean) => void;
}

// Default configuration values
const DEFAULT_CONFIG = {
    smitheryKey: "",
    smitheryVerified: false,
};

export const useMCPConfigurationStore = create<MCPConfigurationState>()(
    persist(
        (set) => ({
            // Initial state
            ...DEFAULT_CONFIG,

            // Actions
            setSmitheryKey: (key) => set({ smitheryKey: key, smitheryVerified: false }),
            setSmitheryVerified: (verified) => set({ smitheryVerified: verified }),
        }),
        {
            name: "mcp-configuration-storage",
        }
    )
);
