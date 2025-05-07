import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const UserSettingsSubcategories = {
    User: "user",
    LLMSettings: "llmSettings",
    PublicLLM: "publicLLMs",
    PrivateLLM: "privateLLMs",
    KnowledgeBase: "knowledgeBase",
    KBSettings: "kbSettings",
    CloudKB: "cloudKb",
    PrivateKB: "privateKb",
    MCPConfiguration: "mcpConfiguration",
    MCP: "mcp",
    DeveloperAPI: "developerAPI",
    DeleteAccount: "deleteAccount",
    DebugMode: "debug_mode",
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
