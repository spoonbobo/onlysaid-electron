/*
 Please be careful when changing this file. It is used in many places.
 It impacts user's experience directly.
*/

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface TopicContext {
    id?: string;
    name: string;
    type:
    "home" |
    "workspace" |
    "settings" |
    "file" |
    "playground" |
    "workspace:calendar"
    section?: string;
}

interface TopicStore {
    contexts: TopicContext[];
    selectedContext: TopicContext | null;
    lastSections: Record<string, string | undefined>;
    addContext: (context: TopicContext) => void;
    removeContext: (context: TopicContext) => void;
    setSelectedContext: (context: TopicContext) => void;

    selectedTopics: Record<string, string>;
    setSelectedTopic: (sectionName: string, topicId: string) => void;
    clearSelectedTopic: (sectionName: string) => void;

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
                { name: "workspace", type: "workspace" },
                { name: "settings", type: "settings" },
                { name: "file", type: "file" },
                { name: "playground", type: "playground" }
            ],
            selectedContext: { name: "home", type: "home" },
            lastSections: {},

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
                set((state) => {
                    let lastSections = { ...state.lastSections };
                    if (state.selectedContext?.section && state.selectedContext?.type) {
                        lastSections[state.selectedContext.type] = state.selectedContext.section;
                    }

                    const updatedContext = { ...context };

                    if (!updatedContext.section && lastSections[updatedContext.type]) {
                        updatedContext.section = lastSections[updatedContext.type];
                    }

                    return {
                        selectedContext: updatedContext,
                        lastSections
                    };
                }),

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
            partialize: (state) => ({
                selectedContext: state.selectedContext,
                lastSections: state.lastSections,
                selectedTopics: state.selectedTopics,
                contexts: state.contexts
            }),
            version: 6,
        }
    )
);

export const useCurrentTopicContext = () => useTopicStore();