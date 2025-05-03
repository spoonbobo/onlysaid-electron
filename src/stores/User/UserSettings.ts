import { create } from "zustand";

export const UserSettingsSubcategories = {
  User: "user",
  LLMSettings: "llmSettings",
  PublicLLM: "publicLLMs",
  PrivateLLM: "privateLLMs",
  KnowledgeBase: "knowledgeBase",
  KBSettings: "kbSettings",
  CloudKB: "cloudKb",
  PrivateKB: "privateKb",
  MCP: "mcp",
  DeveloperAPI: "developerAPI",
  DeleteAccount: "deleteAccount",
} as const;

type UserSettingsSubcategory = typeof UserSettingsSubcategories[keyof typeof UserSettingsSubcategories];

export type UserSectionName = 'General' | 'LLM' | 'KnowledgeBase' | 'MCP' | 'Developer' | 'DangerZone';


interface UserSettingsStore {
  selectedSubcategory: UserSettingsSubcategory;
  setSelectedSubcategory: (subcategory: UserSettingsSubcategory) => void;
}

export const useUserSettingsStore = create<UserSettingsStore>((set) => ({
  selectedSubcategory: UserSettingsSubcategories.User,
  setSelectedSubcategory: (subcategory) => set({ selectedSubcategory: subcategory }),
}));
