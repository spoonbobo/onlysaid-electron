import { createContext, ReactNode, useEffect } from 'react';
import { useStreamStore } from '@/renderer/stores/Stream/StreamStore';

// Create a context for component-based access (optional)
const SSEContext = createContext<null>(null);

interface SSEProviderProps {
  children: ReactNode;
}

export function SSEProvider({ children }: SSEProviderProps) {
  // Clean up connections when the provider unmounts
  useEffect(() => {
    return () => {
      useStreamStore.getState().disconnectAll();
    };
  }, []);

  return (
    <SSEContext.Provider value={null}>
      {children}
    </SSEContext.Provider>
  );
}

// Re-export the store for convenience
export { useStreamStore as useSSEStore } from '@/renderer/stores/Stream/StreamStore';
