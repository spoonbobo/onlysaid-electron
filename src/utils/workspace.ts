import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";

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
