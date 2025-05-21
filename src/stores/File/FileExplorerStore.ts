import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface FileNode {
  id: string;
  name: string;
  label: string;
  path: string;
  type: 'file' | 'directory';
  source: 'local' | 'remote';
  workspaceId?: string;
  children?: FileNode[];
  isExpanded?: boolean;
  fileDbId?: string;
}

interface FileExplorerState {
  rootFolders: FileNode[];
  selectedId: string | null;
  lastOpenedFolderIds: string[];
  isLoading: boolean;
  loadingNodeIds: Record<string, boolean>;
  error: string | null;

  // Actions
  addLocalRootFolder: () => Promise<void>;
  addRemoteWorkspaceRoot: (workspaceId: string, workspaceName: string, token: string) => Promise<void>;
  removeRootFolder: (nodeId: string) => void;
  removeRemoteRootFolderByWorkspaceId: (workspaceId: string) => void;
  loadFolder: (nodeId: string, token?: string) => Promise<void>;
  toggleFolder: (nodeId: string) => void;
  selectItem: (nodeId: string) => void;
  refreshFolder: (nodeId: string, token?: string) => Promise<void>;
}

const generateNodeId = (source: 'local' | 'remote', path: string, workspaceId?: string): string => {
  if (source === 'local') {
    return `local:${path}`;
  } else if (source === 'remote' && workspaceId) {
    return `remote:${workspaceId}:${path}`;
  }
  console.error("Cannot generate ID for invalid node data", { source, path, workspaceId });
  throw new Error("Cannot generate ID for invalid node data");
};

const mapRemoteContentsToChildren = async (
  rawContents: Array<{ name: string; type: 'file' | 'directory'; path: string }>,
  workspaceId: string,
  token: string
): Promise<FileNode[]> => {
  const fileNodes: FileNode[] = [];
  const rawFiles = rawContents.filter(item => item.type === 'file');
  const rawDirectories = rawContents.filter(item => item.type === 'directory');

  const fileIdsToFetch = rawFiles.map(rf => rf.name);

  if (fileIdsToFetch.length > 0) {
    try {
      const metadataResponse = await window.electron.fileSystem.getFilesMetadata({
        workspaceId,
        fileIds: fileIdsToFetch,
        token,
      });

      const metadataMap = new Map((metadataResponse.data as any[]).map(m => [m.id, m]));

      for (const rawFile of rawFiles) {
        const meta = metadataMap.get(rawFile.name);
        if (meta) {
          const node: FileNode = {
            id: generateNodeId('remote', rawFile.path, workspaceId),
            name: meta.name,
            label: meta.name,
            path: rawFile.path,
            type: 'file',
            source: 'remote',
            workspaceId: workspaceId,
            fileDbId: meta.id,
          };
          fileNodes.push(node);
        } else {
          console.warn(`Metadata not found for remote file UUID: ${rawFile.name}. Using UUID as name.`);
          const fallbackNode: FileNode = {
            id: generateNodeId('remote', rawFile.path, workspaceId),
            name: rawFile.name,
            label: rawFile.name,
            path: rawFile.path,
            type: 'file',
            source: 'remote',
            workspaceId: workspaceId,
            fileDbId: rawFile.name,
          };
          fileNodes.push(fallbackNode);
        }
      }
    } catch (error) {
      console.error('Error fetching multiple file metadata:', error);
      rawFiles.forEach(rawFile => {
        fileNodes.push({
          id: generateNodeId('remote', rawFile.path, workspaceId),
          name: rawFile.name,
          label: rawFile.name,
          path: rawFile.path,
          type: 'file',
          source: 'remote',
          workspaceId: workspaceId,
          fileDbId: rawFile.name,
        });
      });
    }
  }

  for (const rawDirectory of rawDirectories) {
    const node: FileNode = {
      id: generateNodeId('remote', rawDirectory.path, workspaceId),
      name: rawDirectory.name,
      label: rawDirectory.name,
      path: rawDirectory.path,
      type: 'directory',
      source: 'remote',
      workspaceId: workspaceId,
      children: [],
      isExpanded: false,
    };
    fileNodes.push(node);
  }

  return fileNodes;
};

const mapLocalContentsToChildren = (
  contents: Array<{ name: string; type: 'file' | 'directory'; path: string }>,
  parentAbsolutePath: string
): FileNode[] => {
  return contents.map(item => {
    const absolutePath = item.path;
    return {
      id: generateNodeId('local', absolutePath),
      name: item.name,
      label: item.name,
      path: absolutePath,
      type: item.type,
      source: 'local',
      children: item.type === 'directory' ? [] : undefined,
      isExpanded: false,
    };
  });
};

const updateNodeRecursivelyById = (nodes: FileNode[], nodeId: string, updateFn: (node: FileNode) => FileNode): FileNode[] => {
  return nodes.map(node => {
    if (node.id === nodeId) {
      return updateFn(node);
    }
    if (node.children && node.type === 'directory') {
      const updatedChildren = updateNodeRecursivelyById(node.children, nodeId, updateFn);
      return updatedChildren !== node.children ? { ...node, children: updatedChildren } : node;
    }
    return node;
  });
};

const findNodeById = (nodes: FileNode[], nodeId: string): FileNode | null => {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }
    if (node.children && node.type === 'directory') {
      const foundInChildren = findNodeById(node.children, nodeId);
      if (foundInChildren) {
        return foundInChildren;
      }
    }
  }
  return null;
};

export const useFileExplorerStore = create<FileExplorerState>()(
  persist(
    (set, get) => ({
      rootFolders: [],
      selectedId: null,
      lastOpenedFolderIds: [],
      isLoading: false,
      loadingNodeIds: {},
      error: null,

      addLocalRootFolder: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await window.electron.fileSystem.openFolderDialog();

          if (!result.canceled && result.filePaths.length > 0) {
            const folderPath = result.filePaths[0];
            const folderId = generateNodeId('local', folderPath);

            if (get().rootFolders.find(f => f.id === folderId)) {
              set({ isLoading: false, selectedId: folderId });
              return;
            }

            const folderContents = await window.electron.fileSystem.getFolderContents(folderPath);
            const newFolder: FileNode = {
              id: folderId,
              name: folderPath.split(/[\\/]/).pop() || folderPath,
              label: folderPath.split(/[\\/]/).pop() || folderPath,
              path: folderPath,
              type: 'directory',
              source: 'local',
              children: mapLocalContentsToChildren(folderContents, folderPath),
              isExpanded: true
            };

            set(state => ({
              rootFolders: [...state.rootFolders, newFolder],
              lastOpenedFolderIds: [newFolder.id, ...state.lastOpenedFolderIds].slice(0, 10),
              isLoading: false,
              selectedId: newFolder.id,
            }));
          } else {
            set({ isLoading: false });
          }
        } catch (err: any) {
          console.error('Error adding local root folder:', err);
          set({ isLoading: false, error: err.message || 'Failed to add folder' });
        }
      },

      addRemoteWorkspaceRoot: async (workspaceId: string, workspaceName: string, token: string) => {
        const rootPath = '';
        const rootId = generateNodeId('remote', rootPath, workspaceId);
        set({ isLoading: true, error: null });

        if (get().rootFolders.find(f => f.id === rootId)) {
          set({ isLoading: false, selectedId: rootId });
          return;
        }

        try {
          const response = await window.electron.ipcRenderer.invoke('storage:list-contents', {
            workspaceId,
            token,
            relativePath: rootPath,
          });

          if (response.error) {
            throw new Error(response.error);
          }

          const children = await mapRemoteContentsToChildren(response.data.contents, workspaceId, token);

          const newRemoteRoot: FileNode = {
            id: rootId,
            name: workspaceName,
            label: workspaceName,
            path: rootPath,
            type: 'directory',
            source: 'remote',
            workspaceId: workspaceId,
            children: children,
            isExpanded: true,
          };

          set(state => ({
            rootFolders: [...state.rootFolders, newRemoteRoot],
            lastOpenedFolderIds: [newRemoteRoot.id, ...state.lastOpenedFolderIds].slice(0, 10),
            isLoading: false,
            selectedId: newRemoteRoot.id,
          }));

        } catch (err: any) {
          console.error(`Error adding remote workspace ${workspaceId}:`, err);
          set({ isLoading: false, error: err.message || `Failed to add workspace ${workspaceId}` });
        }
      },

      removeRootFolder: (nodeId: string) => {
        set(state => {
          const nodeToRemove = findNodeById(state.rootFolders, nodeId);
          return {
            rootFolders: state.rootFolders.filter(folder => folder.id !== nodeId),
            lastOpenedFolderIds: state.lastOpenedFolderIds.filter(id => id !== nodeId),
            selectedId: state.selectedId === nodeId ? null : state.selectedId,
          };
        });
      },

      removeRemoteRootFolderByWorkspaceId: (workspaceId: string) => {
        set(state => {
          const remoteRootNodeId = generateNodeId('remote', '', workspaceId);
          const nodeToRemove = findNodeById(state.rootFolders, remoteRootNodeId);

          if (!nodeToRemove || nodeToRemove.source !== 'remote' || nodeToRemove.path !== '') {
            return state;
          }

          return {
            rootFolders: state.rootFolders.filter(folder => folder.id !== remoteRootNodeId),
            lastOpenedFolderIds: state.lastOpenedFolderIds.filter(id => id !== remoteRootNodeId),
            selectedId: state.selectedId === remoteRootNodeId ? null : state.selectedId,
          };
        });
      },

      loadFolder: async (nodeId: string, token?: string) => {
        const nodeToLoad = findNodeById(get().rootFolders, nodeId);
        if (!nodeToLoad || nodeToLoad.type !== 'directory') {
          console.warn('Cannot load folder: Node not found or not a directory', nodeId);
          return;
        }

        set(state => ({
          loadingNodeIds: { ...state.loadingNodeIds, [nodeId]: true },
          error: null
        }));

        try {
          let children: FileNode[] = [];
          if (nodeToLoad.source === 'local') {
            const localContents = await window.electron.fileSystem.getFolderContents(nodeToLoad.path);
            children = mapLocalContentsToChildren(localContents, nodeToLoad.path);
          } else if (nodeToLoad.source === 'remote') {
            if (!nodeToLoad.workspaceId) {
              throw new Error("Workspace ID missing for remote folder load.");
            }
            if (!token) {
              throw new Error("Token missing for remote folder load.");
            }
            const response = await window.electron.ipcRenderer.invoke('storage:list-contents', {
              workspaceId: nodeToLoad.workspaceId,
              token,
              relativePath: nodeToLoad.path,
            });
            if (response.error) throw new Error(response.error);
            children = await mapRemoteContentsToChildren(response.data.contents, nodeToLoad.workspaceId, token);
          }

          set(state => ({
            rootFolders: updateNodeRecursivelyById(state.rootFolders, nodeId, node => ({
              ...node,
              children: children,
              isExpanded: true
            })),
            loadingNodeIds: { ...state.loadingNodeIds, [nodeId]: false }
          }));
        } catch (err: any) {
          console.error(`Error loading folder ${nodeId}:`, err);
          set(state => ({
            loadingNodeIds: { ...state.loadingNodeIds, [nodeId]: false },
            error: err.message || 'Failed to load folder contents'
          }));
        }
      },

      toggleFolder: (nodeId: string) => {
        set(state => ({
          rootFolders: updateNodeRecursivelyById(state.rootFolders, nodeId, node => ({
            ...node,
            isExpanded: !node.isExpanded
          }))
        }));
      },

      selectItem: (nodeId: string) => {
        set({ selectedId: nodeId });
      },

      refreshFolder: async (nodeId: string, token?: string) => {
        const nodeToRefresh = findNodeById(get().rootFolders, nodeId);
        if (!nodeToRefresh || nodeToRefresh.type !== 'directory') {
          console.warn('Cannot refresh folder: Node not found or not a directory', nodeId);
          return;
        }
        await get().loadFolder(nodeId, token);
      }
    }),
    {
      name: 'file-explorer-store',
      partialize: (state) => ({
        rootFolders: state.rootFolders.map(root => ({
          id: root.id,
          name: root.name,
          label: root.label,
          path: root.path,
          type: root.type,
          source: root.source,
          workspaceId: root.workspaceId,
          isExpanded: root.isExpanded,
          fileDbId: root.fileDbId,
          children: root.isExpanded && root.children ?
            root.children.map(c => ({ id: c.id, name: c.name, label: c.label, path: c.path, type: c.type, source: c.source, workspaceId: c.workspaceId, isExpanded: c.isExpanded, fileDbId: c.fileDbId }))
            : []
        })),
        lastOpenedFolderIds: state.lastOpenedFolderIds,
        selectedId: state.selectedId,
      }),
    }
  )
);

export const selectors = {
  selectRootFolders: (state: FileExplorerState) => state.rootFolders,
  selectSelectedNodeId: (state: FileExplorerState) => state.selectedId,
  selectIsLoading: (state: FileExplorerState) => state.isLoading,
  selectError: (state: FileExplorerState) => state.error,
  selectLastOpenedFolderIds: (state: FileExplorerState) => state.lastOpenedFolderIds,
  selectIsNodeLoading: (nodeId: string) => (state: FileExplorerState): boolean => {
    return !!state.loadingNodeIds[nodeId];
  },
  selectNodeById: (nodeId: string | null) => (state: FileExplorerState): FileNode | null => {
    if (!nodeId) return null;
    return findNodeById(state.rootFolders, nodeId);
  }
};
