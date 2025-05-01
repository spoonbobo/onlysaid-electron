import { create } from "zustand";

export const UserSettingsSubcategories = {
  User: "User",
  LLMSettings: "LLM Settings",
  PublicLLM: "Public LLM",
  PrivateLLM: "Private LLM",
  KnowledgeBase: "Knowledge Base",
  MCP: "MCP",
  DeleteAccount: "Delete Account",
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
