import { IChatRoom } from "@/types/Chat/Chatroom";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface TopicContext {
    id?: string;
    name: string;
    type: "home" | "team" | "settings" | "file";
    section?: string;
}

interface TopicStore {
    contexts: TopicContext[];
    selectedContext: TopicContext | null;
    addContext: (context: TopicContext) => void;
    removeContext: (context: TopicContext) => void;
    setSelectedContext: (context: TopicContext) => void;

    selectedTopics: Record<string, string>;
    setSelectedTopic: (sectionName: string, topicId: string) => void;
    clearSelectedTopic: (sectionName: string) => void;

    expandedGroups: Record<string, boolean>;
    setGroupExpanded: (sectionName: string, expanded: boolean) => void;

    trustMode: boolean;
    setTrustMode: (trustMode: boolean) => void;

    replyingToId: string | null;
    setReplyingTo: (messageId: string | null) => void;

    attachments: Record<string, any>;
    setAttachment: (type: string, file: any) => void;
    clearAttachments: () => void;

    streamingState: {
        messageId: string | null;
        roomId: string | null;
        streamId: string | null;
    };
    setStreamingState: (messageId: string | null, roomId: string | null) => void;
}

export const useTopicStore = create<TopicStore>()(
    persist(
        (set, get) => ({
            contexts: [
                { name: "home", type: "home" },
                { name: "team", type: "team" },
                { name: "settings", type: "settings" },
                { name: "file", type: "file" }
            ],
            selectedContext: { name: "home", type: "home" },

            addContext: (context) =>
                set((state) => ({
                    contexts: [...state.contexts, {
                        ...context,
                        id: context.id || `${context.name}:${context.type}`
                    }]
                })),

            removeContext: (context) =>
                set((state) => ({
                    contexts: state.contexts.filter(
                        (c) => c.name !== context.name || c.type !== context.type
                    ),
                    selectedContext:
                        state.selectedContext?.name === context.name &&
                            state.selectedContext?.type === context.type
                            ? (state.contexts.length > 1 ? state.contexts[0] : null)
                            : state.selectedContext
                })),

            setSelectedContext: (context) =>
                set({ selectedContext: context }),

            selectedTopics: {},

            setSelectedTopic: (sectionName, topicId) =>
                set((state) => ({
                    selectedTopics: {
                        ...state.selectedTopics,
                        [sectionName]: topicId,
                    },
                })),

            clearSelectedTopic: (sectionName) =>
                set((state) => {
                    const updatedTopics = { ...state.selectedTopics };
                    delete updatedTopics[sectionName];
                    return { selectedTopics: updatedTopics };
                }),

            expandedGroups: {},

            setGroupExpanded: (sectionName, expanded) =>
                set((state) => ({
                    expandedGroups: {
                        ...state.expandedGroups,
                        [sectionName]: expanded,
                    },
                })),

            trustMode: false,

            setTrustMode: (trustMode) =>
                set({ trustMode }),

            replyingToId: null,

            setReplyingTo: (messageId) =>
                set({ replyingToId: messageId }),

            attachments: {},

            setAttachment: (type, file) =>
                set((state) => ({
                    attachments: {
                        ...state.attachments,
                        [type]: file,
                    },
                })),

            clearAttachments: () =>
                set({ attachments: {} }),

            streamingState: { messageId: null, roomId: null, streamId: null },

            setStreamingState: (messageId, roomId) =>
                set({
                    streamingState: {
                        messageId,
                        roomId,
                        streamId: messageId ? `stream-${messageId}` : null
                    }
                }),
        }),
        {
            name: "topic-store",
            storage: createJSONStorage(() => localStorage),
            version: 3,
        }
    )
);

export const useCurrentTopicContext = () => useTopicStore();

