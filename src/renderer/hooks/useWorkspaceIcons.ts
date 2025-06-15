import { useState, useEffect, useCallback } from 'react';
import { getUserTokenFromStore } from '@/utils/user';
import { IWorkspace } from '@/../../types/Workspace/Workspace';

interface WorkspaceIconCache {
  [workspaceId: string]: {
    iconUrl: string;
    timestamp: number;
  };
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const iconCache: WorkspaceIconCache = {};

export const useWorkspaceIcons = (workspaces: IWorkspace[]) => {
  const [workspaceIcons, setWorkspaceIcons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const loadWorkspaceIcon = useCallback(async (workspace: IWorkspace) => {
    const token = getUserTokenFromStore();
    if (!token || !workspace.image || !workspace.image.startsWith('/storage/')) {
      return null;
    }

    // Check cache first
    const cached = iconCache[workspace.id];
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return { workspaceId: workspace.id, iconUrl: cached.iconUrl };
    }

    try {
      const iconData = await window.electron.fileSystem.getWorkspaceIcon({
        workspaceId: workspace.id,
        imagePath: workspace.image,
        token
      });
      
      if (iconData) {
        // Cache the result
        iconCache[workspace.id] = {
          iconUrl: iconData.data,
          timestamp: now
        };
        
        return { workspaceId: workspace.id, iconUrl: iconData.data };
      }
    } catch (error) {
      console.error(`Failed to load icon for workspace ${workspace.id}:`, error);
    }
    
    return null;
  }, []);

  const loadWorkspaceIcons = useCallback(async () => {
    if (workspaces.length === 0) return;
    
    setLoading(true);
    
    // First, set cached icons immediately
    const cachedIcons: Record<string, string> = {};
    const now = Date.now();
    
    workspaces.forEach(workspace => {
      const cached = iconCache[workspace.id];
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        cachedIcons[workspace.id] = cached.iconUrl;
      }
    });
    
    setWorkspaceIcons(cachedIcons);
    
    // Then load missing icons
    const workspacesToLoad = workspaces.filter(workspace => 
      workspace.image && 
      workspace.image.startsWith('/storage/') && 
      !cachedIcons[workspace.id]
    );
    
    if (workspacesToLoad.length > 0) {
      const iconPromises = workspacesToLoad.map(loadWorkspaceIcon);
      const results = await Promise.all(iconPromises);
      
      const newIcons: Record<string, string> = { ...cachedIcons };
      results.forEach((result) => {
        if (result) {
          newIcons[result.workspaceId] = result.iconUrl;
        }
      });
      
      setWorkspaceIcons(newIcons);
    }
    
    setLoading(false);
  }, [workspaces, loadWorkspaceIcon]);

  useEffect(() => {
    loadWorkspaceIcons();
  }, [loadWorkspaceIcons]);

  const getWorkspaceIcon = useCallback((workspaceId: string) => {
    return workspaceIcons[workspaceId] || null;
  }, [workspaceIcons]);

  return {
    workspaceIcons,
    loading,
    getWorkspaceIcon,
    refreshIcons: loadWorkspaceIcons
  };
}; 