import { useEffect, useState } from 'react';
import MainInterface from '../scenes/Interface/MainInterface';
import { useTopicStore } from '../stores/Topic/TopicStore';
import { useUserStore, setupDeeplinkAuthListener } from '../stores/User/UserStore';
import { useMCPStore } from '../stores/MCP/MCPStore';
import { useToastStore } from '../stores/Notification/ToastStore';
import { useSocketStore } from '../stores/Socket/SocketStore';


function App() {
  const { selectedContext, contexts, setSelectedContext } = useTopicStore();
  const { getAllConfiguredServers, initializeClient } = useMCPStore();
  const [initProgress, setInitProgress] = useState(0);
  const [initToastId, setInitToastId] = useState<string | null>(null);
  const { user } = useUserStore();
  const { initialize: initializeSocket, close: closeSocket } = useSocketStore();

  useEffect(() => {
    if (!selectedContext && contexts.length > 0) {
      setSelectedContext(contexts[0]);
    }
  }, [selectedContext, contexts, setSelectedContext]);

  useEffect(() => {
    setupDeeplinkAuthListener();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user && user.id) {
        console.log("Initializing socket with user:", user.username);
        initializeSocket(user);
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (!user) {
        closeSocket();
      }
    };
  }, [user, initializeSocket, closeSocket]);

  const { isConnected } = useSocketStore();

  useEffect(() => {
    console.log("isConnected", isConnected);
    if (isConnected) {
      console.log("Socket connected successfully!");
      useToastStore.getState().addToast(
        "Socket connected",
        "success",
        3000
      );
    }
  }, [isConnected]);

  useEffect(() => {
    const initializeServices = async () => {
      const servers = getAllConfiguredServers();

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

      const servicesToInit = Object.entries(servers)
        .filter(([_, service]) => service.enabled && service.configured)
        .map(([key]) => serviceTypeMap[key])
        .filter(Boolean);

      if (servicesToInit.length === 0) return;

      const toastId = useToastStore.getState().addToast(
        "Initializing MCP services...",
        "info",
        15000
      );
      useToastStore.getState().updateToastProgress(toastId, 0);
      setInitToastId(toastId);

      let completed = 0;
      for (const [key, service] of Object.entries(servers)) {
        if (service.enabled && service.configured) {
          const serviceType = serviceTypeMap[key];
          if (serviceType) {
            try {
              console.log(`Initializing service: ${serviceType}`);
              await initializeClient(serviceType);
              completed++;

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