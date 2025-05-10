import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as R from 'ramda';
import { v4 as uuidv4 } from 'uuid';
import { getUserFromStore, getUserTokenFromStore } from "@/utils/user";
import { IWorkspace } from "@/../../types/Workspace/Workspace";

interface WorkspaceState {
    // State properties
    workspaces: IWorkspace[];
    isLoading: boolean;
    error: string | null;

    // Workspace operations
    createWorkspace: (data: Partial<IWorkspace>) => Promise<IWorkspace>;
    deleteWorkspace: (workspaceId: string) => Promise<void>;
    exitWorkspace: (workspaceId: string) => Promise<void>;
    getWorkspaceById: (workspaceId: string) => IWorkspace | undefined;
    getWorkspace: (userId: string, type: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
    persist(
        (set, get) => ({
            workspaces: [],
            isLoading: false,
            error: null,

            createWorkspace: async (data) => {
                set({ isLoading: true, error: null });
                try {
                    const newWorkspace: IWorkspace = {
                        id: uuidv4(),
                        name: data.name || 'New Workspace',
                        image: data.image || '/workspace-icon.png',
                        invite_code: data.invite_code || '',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        members: data.members || [],
                        super_admins: data.super_admins || [],
                        admins: data.admins || [],
                        settings: data.settings || {},
                    };

                    const response = await window.electron.workspace.create({
                        token: getUserTokenFromStore(),
                        request: newWorkspace
                    });

                    if (response.data) {
                        set(state => ({
                            workspaces: [...state.workspaces, response.data],
                            isLoading: false
                        }));
                        return response.data;
                    }

                    // Fallback to local creation if API call fails
                    set(state => ({
                        workspaces: [...state.workspaces, newWorkspace],
                        isLoading: false
                    }));

                    return newWorkspace;
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                    console.error("Error creating workspace:", error);
                    throw error;
                }
            },

            deleteWorkspace: async (workspaceId) => {
                set({ isLoading: true, error: null });
                try {
                    await window.electron.workspace.delete({
                        token: getUserTokenFromStore(),
                        id: workspaceId
                    });

                    set(state => ({
                        workspaces: state.workspaces.filter(workspace => workspace.id !== workspaceId),
                        isLoading: false
                    }));
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                    console.error("Error deleting workspace:", error);
                    throw error;
                }
            },

            getWorkspace: async (userId: string, type: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await window.electron.workspace.get({
                        token: getUserTokenFromStore(),
                        userId: userId,
                        type: type
                    });

                    if (response.data && response.data.data && Array.isArray(response.data.data)) {
                        set({ workspaces: [...response.data.data], isLoading: false });
                    } else {
                        set({ isLoading: false });
                    }
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                    console.error("Error fetching workspaces:", error);
                }
            },

            exitWorkspace: async (workspaceId) => {
                set({ isLoading: true, error: null });
                try {
                    const currentUser = getUserFromStore();
                    const userId = currentUser?.id;

                    if (!userId) {
                        throw new Error("User not authenticated");
                    }

                    const existingWorkspace = get().workspaces.find(w => w.id === workspaceId);

                    if (!existingWorkspace) {
                        throw new Error("Workspace not found");
                    }

                    const updatedWorkspace = {
                        ...existingWorkspace,
                        members: (existingWorkspace.members || []).filter(m => m !== userId),
                        updated_at: new Date().toISOString()
                    };

                    await window.electron.workspace.update({
                        token: getUserTokenFromStore(),
                        request: updatedWorkspace
                    });

                    set(state => {
                        const updatedWorkspaces = state.workspaces.map(w => {
                            if (w.id === workspaceId) {
                                return updatedWorkspace;
                            }
                            return w;
                        });

                        return {
                            workspaces: updatedWorkspaces,
                            isLoading: false
                        };
                    });
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                    console.error("Error exiting workspace:", error);
                    throw error;
                }
            },

            getWorkspaceById: (workspaceId) => {
                return get().workspaces.find(workspace => workspace.id === workspaceId);
            },
        }),
        {
            name: "workspace-storage",
            storage: createJSONStorage(() => localStorage),
        }
    )
);