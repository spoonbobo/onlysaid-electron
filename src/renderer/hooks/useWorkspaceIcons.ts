import { useState, useEffect, useCallback, useRef } from 'react';
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
  const workspacesRef = useRef<IWorkspace[]>([]);
  const loadingRef = useRef(false);
  const isInitializedRef = useRef(false);

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

  // Remove the loadWorkspaceIcons callback dependency issue by moving it inside useEffect
  useEffect(() => {
    const loadWorkspaceIcons = async (workspacesToLoad: IWorkspace[]) => {
      // Prevent concurrent loading
      if (loadingRef.current) return;
      
      if (workspacesToLoad.length === 0) {
        setLoading(false);
        return;
      }
      
      loadingRef.current = true;
      setLoading(true);
      
      // First, set cached icons immediately
      const cachedIcons: Record<string, string> = {};
      const now = Date.now();
      
      workspacesToLoad.forEach(workspace => {
        const cached = iconCache[workspace.id];
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          cachedIcons[workspace.id] = cached.iconUrl;
        }
      });
      
      // Set cached icons immediately
      if (Object.keys(cachedIcons).length > 0) {
        setWorkspaceIcons(prev => ({ ...prev, ...cachedIcons }));
      }
      
      // Then load missing icons
      const workspacesToFetch = workspacesToLoad.filter(workspace => 
        workspace.image && 
        workspace.image.startsWith('/storage/') && 
        !cachedIcons[workspace.id]
      );
      
      if (workspacesToFetch.length > 0) {
        try {
          const iconPromises = workspacesToFetch.map(loadWorkspaceIcon);
          const results = await Promise.all(iconPromises);
          
          const newIcons: Record<string, string> = {};
          results.forEach((result) => {
            if (result) {
              newIcons[result.workspaceId] = result.iconUrl;
            }
          });
          
          if (Object.keys(newIcons).length > 0) {
            setWorkspaceIcons(prev => ({ ...prev, ...newIcons }));
          }
        } catch (error) {
          console.error('Error loading workspace icons:', error);
        }
      }
      
      setLoading(false);
      loadingRef.current = false;
    };

    // Only load icons if workspaces actually changed
    const workspaceIds = workspaces.map(w => w.id).sort();
    const previousIds = workspacesRef.current.map(w => w.id).sort();
    
    const hasChanged = !isInitializedRef.current || 
                      workspaceIds.length !== previousIds.length || 
                      workspaceIds.some((id, index) => id !== previousIds[index]);
    
    if (hasChanged) {
      console.log('Workspace icons: Loading icons for workspaces', workspaceIds);
      workspacesRef.current = workspaces;
      isInitializedRef.current = true;
      loadWorkspaceIcons(workspaces);
    }
  }, [workspaces, loadWorkspaceIcon]); // Only depend on workspaces and loadWorkspaceIcon

  const getWorkspaceIcon = useCallback((workspaceId: string) => {
    return workspaceIcons[workspaceId] || null;
  }, [workspaceIcons]);

  const refreshIcons = useCallback(() => {
    // Force refresh by resetting the initialization flag
    isInitializedRef.current = false;
    workspacesRef.current = [];
    
    // This will trigger the useEffect above
    const workspaceIds = workspaces.map(w => w.id).sort();
    console.log('Workspace icons: Force refreshing icons for workspaces', workspaceIds);
  }, [workspaces]);

  return {
    workspaceIcons,
    loading,
    getWorkspaceIcon,
    refreshIcons
  };
}; 