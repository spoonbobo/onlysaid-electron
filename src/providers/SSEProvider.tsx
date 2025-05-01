import { createContext, ReactNode, useEffect } from 'react';
import { create } from 'zustand';

interface SSEState {
    connections: Record<string, EventSource | null>;
    messages: Record<string, any[]>;
    isConnecting: Record<string, boolean>;
    errors: Record<string, Error | null>;

    // Actions
    connect: (id: string, url: string) => void;
    disconnect: (id: string) => void;
    disconnectAll: () => void;
    clearMessages: (id: string) => void;
}

export const useSSEStore = create<SSEState>((set, get) => ({
    connections: {},
    messages: {},
    isConnecting: {},
    errors: {},

    connect: (id: string, url: string) => {
        get().disconnect(id);

        set((state) => ({
            isConnecting: { ...state.isConnecting, [id]: true },
            errors: { ...state.errors, [id]: null }
        }));

        try {
            const eventSource = new EventSource(url);

            eventSource.onopen = () => {
                set((state) => ({
                    isConnecting: { ...state.isConnecting, [id]: false }
                }));
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    set((state) => ({
                        messages: {
                            ...state.messages,
                            [id]: [...(state.messages[id] || []), data]
                        }
                    }));
                } catch (error) {
                    set((state) => ({
                        messages: {
                            ...state.messages,
                            [id]: [...(state.messages[id] || []), event.data]
                        }
                    }));
                }
            };

            eventSource.onerror = () => {
                set((state) => ({
                    errors: { ...state.errors, [id]: new Error('SSE connection error') },
                    isConnecting: { ...state.isConnecting, [id]: false }
                }));
                eventSource.close();
            };

            set((state) => ({
                connections: { ...state.connections, [id]: eventSource }
            }));
        } catch (error) {
            set((state) => ({
                errors: { ...state.errors, [id]: error as Error },
                isConnecting: { ...state.isConnecting, [id]: false }
            }));
        }
    },

    disconnect: (id: string) => {
        const connection = get().connections[id];
        if (connection) {
            connection.close();
            set((state) => ({
                connections: { ...state.connections, [id]: null }
            }));
        }
    },

    disconnectAll: () => {
        Object.entries(get().connections).forEach(([id, connection]) => {
            console.log('Disconnecting', id);
            if (connection) {
                connection.close();
            }
        });
        set({ connections: {} });
    },

    clearMessages: (id: string) => {
        set((state) => ({
            messages: { ...state.messages, [id]: [] }
        }));
    }
}));

// Create a context for component-based access (optional)
const SSEContext = createContext<null>(null);

interface SSEProviderProps {
    children: ReactNode;
}

export function SSEProvider({ children }: SSEProviderProps) {
    // Clean up connections when the provider unmounts
    useEffect(() => {
        return () => {
            useSSEStore.getState().disconnectAll();
        };
    }, []);

    return (
        <SSEContext.Provider value={null}>
            {children}
        </SSEContext.Provider>
    );
} 