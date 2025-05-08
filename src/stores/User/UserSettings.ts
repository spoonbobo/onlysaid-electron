import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const UserSettingsSubcategories = {
    // General
    User: "user",
    DebugMode: "debug_mode",

    // LLM
    LLMSettings: "llmSettings",
    LLMModels: "llm.apiKeys",

    // KnowledgeBase
    KBSettings: "kbSettings",
    KB: "kb",

    // MCP
    MCPConfiguration: "mcpConfiguration",
    MCP: "mcp",

    // Developer
    DeveloperAPI: "developerAPI",

    // DangerZone
    DeleteAccount: "deleteAccount",
} as const;

type UserSettingsSubcategory = typeof UserSettingsSubcategories[keyof typeof UserSettingsSubcategories];

export type UserSectionName = 'General' | 'LLM' | 'KnowledgeBase' | 'MCP' | 'Developer' | 'DangerZone';

interface UserSettingsStore {
    selectedSubcategory: UserSettingsSubcategory;
    setSelectedSubcategory: (subcategory: UserSettingsSubcategory) => void;
    debugMode: boolean;
    setDebugMode: (enabled: boolean) => void;
}

export const useUserSettingsStore = create<UserSettingsStore>()(
    persist(
        (set) => ({
            selectedSubcategory: UserSettingsSubcategories.User,
            setSelectedSubcategory: (subcategory) => set({ selectedSubcategory: subcategory }),
            debugMode: false,
            setDebugMode: (enabled) => set({ debugMode: enabled }),
        }),
        {
            name: "user-settings-storage",
            storage: createJSONStorage(() => localStorage),
        }
    )
);
