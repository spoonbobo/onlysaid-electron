import { create } from "zustand";
import { persist } from "zustand/middleware";
import { IChatroomSelection } from "../../models/Chat/Chatroom";


interface ChatroomStore {
    selectedTopics: IChatroomSelection;
    setSelectedTopic: (groupName: string, topic: string) => void;
    clearSelectedTopic: (groupName: string) => void;
    expandedGroups: Record<string, boolean>; // group name -> expanded/collapsed
    setGroupExpanded: (groupName: string, expanded: boolean) => void;
}

export const useChatroomStore = create<ChatroomStore>()(
    persist(
        (set) => ({
            selectedTopics: {},
            setSelectedTopic: (groupName, topic) =>
                set(() => ({
                    selectedTopics: { [groupName]: topic },
                })),
            clearSelectedTopic: () =>
                set(() => ({
                    selectedTopics: {},
                })),
            expandedGroups: {},
            setGroupExpanded: (groupName, expanded) =>
                set((state) => ({
                    expandedGroups: {
                        ...state.expandedGroups,
                        [groupName]: expanded,
                    },
                })),
        }),
        {
            name: "chatroom-storage",
            partialize: (state) => ({
                selectedTopics: state.selectedTopics,
                expandedGroups: state.expandedGroups,
            }),
        }
    )
);
