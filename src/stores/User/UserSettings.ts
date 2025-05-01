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
  DeleteAccount: "deleteAccount",
} as const;

type UserSettingsSubcategory = typeof UserSettingsSubcategories[keyof typeof UserSettingsSubcategories];

interface UserSettingsStore {
  selectedSubcategory: UserSettingsSubcategory;
  setSelectedSubcategory: (subcategory: UserSettingsSubcategory) => void;
}

export const useUserSettingsStore = create<UserSettingsStore>((set) => ({
  selectedSubcategory: UserSettingsSubcategories.User,
  setSelectedSubcategory: (subcategory) => set({ selectedSubcategory: subcategory }),
}));
