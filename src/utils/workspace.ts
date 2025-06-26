import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { IWorkspace, IWorkspaceUser } from "@/../../types/Workspace/Workspace";

export const getCurrentWorkspaceId = (): string | undefined => {
  return useTopicStore.getState().selectedContext?.id;
};

export const getCurrentWorkspace = () => {
  const workspaceId = getCurrentWorkspaceId();
  if (!workspaceId) {
    return null;
  }
  return useWorkspaceStore.getState().getWorkspaceById(workspaceId);
};

// Permission-based utilities
type WorkspaceRole = 'member' | 'admin' | 'super_admin';
type PermissionType = 'read' | 'write' | 'share' | 'control';
type ResourceType = 'chat' | 'kb';

type PermissionSet = {
  read: boolean;
  write: boolean;
  share: boolean;
  control?: boolean;
};

const WORKSPACE_PERMISSIONS: Record<ResourceType, Record<WorkspaceRole, PermissionSet>> = {
  chat: {
    member: { read: true, write: true, share: false },
    admin: { read: true, write: true, share: true },
    super_admin: { read: true, write: true, share: true, control: true }
  },
  kb: {
    member: { read: true, write: false, share: false },
    admin: { read: true, write: true, share: true },
    super_admin: { read: true, write: true, share: true, control: true }
  }
};

/**
 * Get current user's role in a workspace
 */
export const getCurrentUserWorkspaceRole = async (workspaceId?: string): Promise<WorkspaceRole | null> => {
  const currentUser = useUserStore.getState().user;
  if (!currentUser?.id) return null;
  
  const targetWorkspaceId = workspaceId || getCurrentWorkspaceId();
  if (!targetWorkspaceId) return null;
  
  const userInWorkspace = await useWorkspaceStore.getState().getUserInWorkspace(targetWorkspaceId, currentUser.id);
  return userInWorkspace?.role as WorkspaceRole || null;
};

/**
 * Check if current user has specific permission in workspace
 */
export const hasWorkspacePermission = async (
  resource: ResourceType,
  permission: PermissionType,
  workspaceId?: string
): Promise<boolean> => {
  const role = await getCurrentUserWorkspaceRole(workspaceId);
  if (!role) return false;
  
  return WORKSPACE_PERMISSIONS[resource][role][permission] === true;
};

/**
 * Check if current user can manage workspace (admin or super_admin)
 */
export const canManageWorkspace = async (workspaceId?: string): Promise<boolean> => {
  const role = await getCurrentUserWorkspaceRole(workspaceId);
  return role === 'admin' || role === 'super_admin';
};

/**
 * Check if current user is workspace super admin
 */
export const isSuperAdmin = async (workspaceId?: string): Promise<boolean> => {
  const role = await getCurrentUserWorkspaceRole(workspaceId);
  return role === 'super_admin';
};

/**
 * Get all workspaces where user has specific role
 */
export const getWorkspacesByRole = (role: WorkspaceRole): IWorkspace[] => {
  return useWorkspaceStore.getState().workspaces.filter((workspace: any) => 
    workspace.role === role
  );
};

/**
 * Get workspaces where user can manage (admin or super_admin)
 */
export const getManagedWorkspaces = (): IWorkspace[] => {
  return useWorkspaceStore.getState().workspaces.filter((workspace: any) => 
    workspace.role === 'admin' || workspace.role === 'super_admin'
  );
};

/**
 * Check if workspace exists and user has access
 */
export const hasWorkspaceAccess = (workspaceId: string): boolean => {
  const workspace = useWorkspaceStore.getState().getWorkspaceById(workspaceId);
  return !!workspace;
};

/**
 * Get workspace with user's role information
 */
export const getWorkspaceWithRole = (workspaceId: string) => {
  return useWorkspaceStore.getState().workspaces.find((w: any) => w.id === workspaceId);
};

/**
 * Format workspace display name with role badge
 */
export const getWorkspaceDisplayName = (workspace: IWorkspace & { role?: WorkspaceRole }): string => {
  if (!workspace.role) return workspace.name;
  
  const roleBadges = {
    member: '',
    admin: ' (Admin)',
    super_admin: ' (Owner)'
  };
  
  return workspace.name + (roleBadges[workspace.role] || '');
};

/**
 * Check if user can invite others to workspace
 */
export const canInviteToWorkspace = async (workspaceId?: string): Promise<boolean> => {
  return await canManageWorkspace(workspaceId);
};

/**
 * Check if user can remove others from workspace
 */
export const canRemoveFromWorkspace = async (workspaceId?: string): Promise<boolean> => {
  return await canManageWorkspace(workspaceId);
};

/**
 * Check if user can delete workspace
 */
export const canDeleteWorkspace = async (workspaceId?: string): Promise<boolean> => {
  return await isSuperAdmin(workspaceId);
};

/**
 * Get workspace member count
 */
export const getWorkspaceMemberCount = async (workspaceId: string): Promise<number> => {
  try {
    const users = await useWorkspaceStore.getState().getUsersByWorkspace(workspaceId);
    return users.length;
  } catch {
    return 0;
  }
};

/**
 * Get workspace admins
 */
export const getWorkspaceAdmins = async (workspaceId: string): Promise<IWorkspaceUser[]> => {
  try {
    const users = await useWorkspaceStore.getState().getUsersByWorkspace(workspaceId);
    return users.filter(user => user.role === 'admin' || user.role === 'super_admin');
  } catch {
    return [];
  }
};

/**
 * Check if workspace has multiple admins (safe to remove admin role)
 */
export const hasMultipleAdmins = async (workspaceId: string): Promise<boolean> => {
  const admins = await getWorkspaceAdmins(workspaceId);
  return admins.length > 1;
};

/**
 * Validate workspace invite code format
 */
export const isValidInviteCode = (code: string): boolean => {
  return typeof code === 'string' && code.length === 6 && /^[A-Za-z0-9]+$/.test(code);
};

/**
 * Generate permission summary for user in workspace
 */
export const getWorkspacePermissionSummary = async (workspaceId?: string) => {
  const role = await getCurrentUserWorkspaceRole(workspaceId);
  if (!role) return null;
  
  return {
    role,
    chat: WORKSPACE_PERMISSIONS.chat[role],
    kb: WORKSPACE_PERMISSIONS.kb[role],
    canManage: role === 'admin' || role === 'super_admin',
    canDelete: role === 'super_admin'
  };
};

/**
 * Get workspace settings with defaults
 */
export const getWorkspaceSettings = (workspaceId: string) => {
  const workspace = useWorkspaceStore.getState().getWorkspaceById(workspaceId);
  const defaultSettings = {
    allowGuestUsers: false,
    requireApprovalForJoin: true,
    maxMembers: 100,
    enableKnowledgeBase: true,
    enableChat: true
  };
  
  return {
    ...defaultSettings,
    ...workspace?.settings
  };
};

/**
 * Check if current user can access resource in current workspace
 */
export const canAccessCurrentWorkspaceResource = async (
  resource: ResourceType,
  permission: PermissionType = 'read'
): Promise<boolean> => {
  const currentWorkspaceId = getCurrentWorkspaceId();
  if (!currentWorkspaceId) return false;
  
  return await hasWorkspacePermission(resource, permission, currentWorkspaceId);
};

/**
 * Get current workspace context info
 */
export const getCurrentWorkspaceContext = async () => {
  const workspaceId = getCurrentWorkspaceId();
  if (!workspaceId) return null;
  
  const workspace = getCurrentWorkspace();
  const role = await getCurrentUserWorkspaceRole(workspaceId);
  const permissions = await getWorkspacePermissionSummary(workspaceId);
  
  return {
    id: workspaceId,
    workspace,
    role,
    permissions
  };
};

/**
 * Switch to workspace and update context
 */
export const switchToWorkspace = (workspaceId: string) => {
  const workspace = useWorkspaceStore.getState().getWorkspaceById(workspaceId);
  if (!workspace) {
    console.error(`Workspace ${workspaceId} not found`);
    return false;
  }
  
  const { setSelectedContext } = useTopicStore.getState();
  setSelectedContext({
    id: workspaceId,
    name: workspace.name,
    type: "workspace",
    section: "workspace"
  });
  
  return true;
};

/**
 * Leave current workspace
 */
export const leaveCurrentWorkspace = async (): Promise<boolean> => {
  const workspaceId = getCurrentWorkspaceId();
  if (!workspaceId) return false;
  
  try {
    await useWorkspaceStore.getState().exitWorkspace(workspaceId);
    
    // Navigate to home
    const { setSelectedContext } = useTopicStore.getState();
    setSelectedContext({ name: "home", type: "home", section: "homepage" });
    
    return true;
  } catch (error) {
    console.error('Failed to leave workspace:', error);
    return false;
  }
};

/**
 * Check if user is the only super admin in workspace
 */
export const isOnlySuperAdmin = async (workspaceId?: string): Promise<boolean> => {
  const targetWorkspaceId = workspaceId || getCurrentWorkspaceId();
  if (!targetWorkspaceId) return false;
  
  const currentUser = useUserStore.getState().user;
  if (!currentUser?.id) return false;
  
  try {
    const users = await useWorkspaceStore.getState().getUsersByWorkspace(targetWorkspaceId);
    const superAdmins = users.filter(user => user.role === 'super_admin');
    
    return superAdmins.length === 1 && superAdmins[0].user_id === currentUser.id;
  } catch {
    return false;
  }
};
