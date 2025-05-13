import { useEffect, useState } from 'react';
import MainInterface from '../scenes/Interface/MainInterface';
import { useTopicStore } from '../stores/Topic/TopicStore';
import { useUserStore, setupDeeplinkAuthListener } from '../stores/User/UserStore';
import { useMCPStore } from '../stores/MCP/MCPStore';
import { useToastStore } from '../stores/Notification/ToastStore';

function App() {
  const { selectedContext, contexts, setSelectedContext } = useTopicStore();
  const { getAllConfiguredServers, initializeClient } = useMCPStore();
  const [initProgress, setInitProgress] = useState(0);
  const [initToastId, setInitToastId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedContext && contexts.length > 0) {
      setSelectedContext(contexts[0]);
    }
  }, [selectedContext, contexts, setSelectedContext]);

  useEffect(() => {
    setupDeeplinkAuthListener();
  }, []);

  // Initialize all enabled MCP services on app startup
  useEffect(() => {
    const initializeServices = async () => {
      const servers = getAllConfiguredServers();

      // Map of store keys to service types expected by initializeClient
      const serviceTypeMap: Record<string, string> = {
        weatherCategory: 'weather',
        location: 'location',
        weatherForecast: 'weather-forecast',
        nearbySearch: 'nearby-search',
        web3Research: 'web3-research',
        doorDash: 'doordash',
        whatsApp: 'whatsapp',
        github: 'github',
        ipLocation: 'ip-location',
        airbnb: 'airbnb',
        tavily: 'tavily',
        linkedIn: 'linkedin'
      };

      // Get all services that need to be initialized
      const servicesToInit = Object.entries(servers)
        .filter(([_, service]) => service.enabled && service.configured)
        .map(([key]) => serviceTypeMap[key])
        .filter(Boolean);

      if (servicesToInit.length === 0) return;

      // Create initial toast with progress 0
      const toastId = useToastStore.getState().addToast(
        "Initializing MCP services...",
        "info",
        15000
      );
      useToastStore.getState().updateToastProgress(toastId, 0);
      setInitToastId(toastId);

      // Initialize each enabled and configured service
      let completed = 0;
      for (const [key, service] of Object.entries(servers)) {
        if (service.enabled && service.configured) {
          const serviceType = serviceTypeMap[key];
          if (serviceType) {
            try {
              console.log(`Initializing service: ${serviceType}`);
              await initializeClient(serviceType);
              completed++;

              // Update progress
              const progress = Math.round((completed / servicesToInit.length) * 100);
              setInitProgress(progress);
              useToastStore.getState().updateToastProgress(
                toastId,
                progress
              );
            } catch (error) {
              console.error(`Failed to initialize ${serviceType}:`, error);
            }
          }
        }
      }

      // All services initialized
      if (completed > 0) {
        useToastStore.getState().updateToastProgress(
          toastId,
          100
        );
      }
    };

    initializeServices();
  }, [getAllConfiguredServers, initializeClient]);

  return (
    <>
      <MainInterface />
    </>
  );
}

export default App;
