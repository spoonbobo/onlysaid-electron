import { create } from "zustand";

export const MenuItems = {
  Chatroom: "Chatroom",
  Plan: "Plan",
  UserSettings: "User Settings",
  TeamSettings: "Team Settings",
  FileExplorer: "File Explorer",
  Workflow: "Workflow",
  Calendar: "Calendar",
  Workbench: "Workbench",
  Chat: "Chat",
  CodeEditor: "Code Editor",
  Learning: "Learning",
  KnowledgeBase: "Knowledge Base",
  Manage: "Manage",
  Exit: "Exit",
} as const;

type MenuItem = typeof MenuItems[keyof typeof MenuItems];

interface MenuStore {
  selectedMenu: MenuItem;
  setSelectedMenu: (menu: MenuItem) => void;
}

export const useMenuStore = create<MenuStore>((set) => ({
  selectedMenu: MenuItems.Chatroom,
  setSelectedMenu: (menu) => set({ selectedMenu: menu }),
}));