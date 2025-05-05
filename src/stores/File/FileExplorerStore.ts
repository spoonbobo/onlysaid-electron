import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  isExpanded?: boolean;
}

interface FileExplorerState {
  rootFolders: FileNode[];
  selectedPath: string | null;
  lastOpenedFolders: string[];
  isLoading: boolean;
  loadingPaths: Record<string, boolean>;
  error: string | null;

  // Actions
  addRootFolder: () => Promise<void>;
  removeRootFolder: (path: string) => void;
  loadFolder: (path: string) => Promise<void>;
  toggleFolder: (path: string) => void;
  selectItem: (path: string) => void;
  refreshFolder: (path: string) => Promise<void>;
}

// Helper function to find and update a node recursively
// Using Immer makes this much cleaner, but here's a manual recursive approach
const updateNodeRecursively = (nodes: FileNode[], path: string, updateFn: (node: FileNode) => FileNode): FileNode[] => {
  return nodes.map(node => {
    if (node.path === path) {
      return updateFn(node);
    } else if (node.children && node.type === 'directory') {
      // Only recurse if the path could potentially be inside this directory
      if (path.startsWith(node.path + '/')) { // Basic check, adjust if path separators differ
        const updatedChildren = updateNodeRecursively(node.children, path, updateFn);
        // Return node with updated children only if children actually changed
        return updatedChildren !== node.children ? { ...node, children: updatedChildren } : node;
      }
    }
    return node;
  });
};

export const useFileExplorerStore = create<FileExplorerState>()(
  persist(
    (set, get) => ({
      rootFolders: [],
      selectedPath: null,
      lastOpenedFolders: [],
      isLoading: false,
      loadingPaths: {},
      error: null,

      addRootFolder: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await window.electron.fileSystem.openFolderDialog();

          if (!result.canceled && result.filePaths.length > 0) {
            const folderPath = result.filePaths[0];
            const existingFolder = get().rootFolders.find(f => f.path === folderPath);
            if (existingFolder) {
              set({ isLoading: false });
              return;
            }

            const folderContents = await window.electron.fileSystem.getFolderContents(folderPath);
            const newFolder: FileNode = {
              id: `folder-${Date.now()}`,
              name: folderPath.split(/[\\/]/).pop() || folderPath,
              path: folderPath,
              type: 'directory',
              children: folderContents,
              isExpanded: true
            };

            set(state => ({
              rootFolders: [...state.rootFolders, newFolder],
              lastOpenedFolders: [folderPath, ...state.lastOpenedFolders].slice(0, 5),
              isLoading: false
            }));
          } else {
            set({ isLoading: false });
          }
        } catch (err) {
          console.error('Error adding root folder:', err);
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to add folder'
          });
        }
      },

      removeRootFolder: (path: string) => {
        set(state => ({
          rootFolders: state.rootFolders.filter(folder => folder.path !== path),
          lastOpenedFolders: state.lastOpenedFolders.filter(p => p !== path),
          selectedPath: state.selectedPath?.startsWith(path) ? null : state.selectedPath
        }));
      },

      loadFolder: async (path: string) => {
        set(state => ({
          loadingPaths: { ...state.loadingPaths, [path]: true },
          error: null
        }));

        try {
          const folderContents = await window.electron.fileSystem.getFolderContents(path);
          console.log('Folder contents for path:', path, folderContents);

          set(state => ({
            rootFolders: updateNodeRecursively(state.rootFolders, path, node => ({
              ...node,
              children: folderContents,
              isExpanded: true
            })),
            loadingPaths: { ...state.loadingPaths, [path]: false }
          }));
        } catch (err) {
          console.error('Error loading folder:', path, err);
          set(state => ({
            loadingPaths: { ...state.loadingPaths, [path]: false },
            error: err instanceof Error ? err.message : 'Failed to load folder contents'
          }));
        }
      },

      toggleFolder: (path: string) => {
        set(state => ({
          rootFolders: updateNodeRecursively(state.rootFolders, path, node => ({
            ...node,
            isExpanded: !node.isExpanded
          }))
        }));
      },

      selectItem: (path: string) => {
        set({ selectedPath: path });
      },

      refreshFolder: async (path: string) => {
        set({ isLoading: true, error: null });
        try {
          const folderContents = await window.electron.fileSystem.getFolderContents(path);
          set(state => ({
            rootFolders: updateNodeRecursively(state.rootFolders, path, node => ({
              ...node,
              children: folderContents
            })),
            isLoading: false
          }));
        } catch (err) {
          console.error('Error refreshing folder:', path, err);
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to refresh folder'
          });
        }
      }
    }),
    {
      name: 'file-explorer',
      partialize: (state) => ({
        rootFolders: state.rootFolders,
        lastOpenedFolders: state.lastOpenedFolders,
      })
    }
  )
);

export const selectors = {
  selectIsNodeLoading: (path: string) => (state: FileExplorerState): boolean => {
    return !!state.loadingPaths[path];
  }
};
