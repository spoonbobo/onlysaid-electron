import { useEffect, useState } from 'react';
import MainInterface from '@/renderer/scenes/Interface/MainInterface';
import { useTopicStore } from '@/renderer/stores/Topic/TopicStore';
import { useUserStore, setupDeeplinkAuthListener } from '@/renderer/stores/User/UserStore';
import { useUserTokenStore } from '@/renderer/stores/User/UserToken';
import { useMCPStore } from '@/renderer/stores/MCP/MCPStore';
import { useToastStore } from '@/renderer/stores/Notification/ToastStore';
import { useSocketStore } from '@/renderer/stores/Socket/SocketStore';
import { useAppAssets } from '@/renderer/hooks/useAppAssets';

function App() {
  const { selectedContext, contexts, setSelectedContext } = useTopicStore();
  const { getAllConfiguredServers, initializeClient } = useMCPStore();
  const [initProgress, setInitProgress] = useState(0);
  const [initToastId, setInitToastId] = useState<string | null>(null);
  const [googleServicesReady, setGoogleServicesReady] = useState(false);
  const { user } = useUserStore();
  const { initialize: initializeSocket, close: closeSocket } = useSocketStore();
  const { initializeGoogleCalendarListeners, initializeMicrosoftCalendarListeners } = useUserTokenStore();
  const { preloadAssets } = useAppAssets();

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
    const handleGoogleServicesReady = () => {
      console.log('[App] Google services ready');
      setGoogleServicesReady(true);
    };

    const handleGoogleServicesError = (event: any, error: any) => {
      console.warn('[App] Google services error:', error);
      useToastStore.getState().addToast(
        "Google Calendar services initialization failed",
        "warning",
        5000
      );
    };

    const removeReadyListener = window.electron.ipcRenderer.on('google-services:ready', handleGoogleServicesReady);
    const removeErrorListener = window.electron.ipcRenderer.on('google-services:error', handleGoogleServicesError);

    return () => {
      removeReadyListener();
      removeErrorListener();
    };
  }, []);

  useEffect(() => {
    console.log('[App] Initializing calendar listeners...');

    const cleanupGoogle = initializeGoogleCalendarListeners();
    const cleanupMicrosoft = initializeMicrosoftCalendarListeners();

    return () => {
      cleanupGoogle();
      cleanupMicrosoft();
    };
  }, [initializeGoogleCalendarListeners, initializeMicrosoftCalendarListeners]);

  useEffect(() => {
    const initializeServices = async () => {
      const servers = getAllConfiguredServers();

      const serviceTypeMap: Record<string, string> = {
        tavily: 'tavily',
        weather: 'weather',
        location: 'location',
        weatherForecast: 'weather-forecast',
        nearbySearch: 'nearby-search',
        web3Research: 'web3-research',
        doorDash: 'doordash',
        whatsApp: 'whatsapp',
        github: 'github',
        ipLocation: 'ip-location',
        airbnb: 'airbnb',
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

  useEffect(() => {
    // Preload essential app assets on app start
    preloadAssets(['icon.png']); // Only load assets that actually exist
  }, [preloadAssets]);

  // Ensure crypto is unlocked for logged-in users
  useEffect(() => {
    if (user && user.id) {
      const timer = setTimeout(() => {
        console.log('[App] Ensuring crypto is unlocked for user:', user.username);
        useUserStore.getState().ensureCryptoUnlocked();
      }, 2000); // Give a bit more time for everything to initialize

      return () => clearTimeout(timer);
    }
  }, [user]);

  return (
    <div>
      <MainInterface />
    </div>
  );
}

export default App;
