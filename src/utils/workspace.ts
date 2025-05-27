import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";


export const getCurrentWorkspace = () => {
  const workspaceId = useTopicStore.getState().selectedContext?.id;
  if (!workspaceId) {
    return null;
  }
  return useWorkspaceStore.getState().getWorkspaceById(workspaceId);
};
