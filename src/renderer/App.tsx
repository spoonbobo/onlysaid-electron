import { useEffect, useState } from 'react';
import MainInterface from '@/renderer/scenes/Interface/MainInterface';
import LoadingScreen from '@/renderer/components/LoadingScreen';
import { useTopicStore } from '@/renderer/stores/Topic/TopicStore';
import { useUserStore, setupDeeplinkAuthListener } from '@/renderer/stores/User/UserStore';
import { useUserTokenStore } from '@/renderer/stores/User/UserToken';
import { useAgentStore } from '@/renderer/stores/Agent/AgentStore';
import { useMCPStore } from '@/renderer/stores/MCP/MCPStore';
import { useToastStore } from '@/renderer/stores/Notification/ToastStore';
import { useSocketStore } from '@/renderer/stores/Socket/SocketStore';
import { useAppAssets } from '@/renderer/hooks/useAppAssets';

function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [initializationComplete, setInitializationComplete] = useState(false);
  const { selectedContext, contexts, setSelectedContext } = useTopicStore();
  const { getAllConfiguredServers, initializeClient } = useMCPStore();
  const [initProgress, setInitProgress] = useState(0);
  const [initToastId, setInitToastId] = useState<string | null>(null);
  const [googleServicesReady, setGoogleServicesReady] = useState(false);
  const { user } = useUserStore();
  const { agent, createGuestAgent } = useAgentStore();
  const { initialize: initializeSocket, close: closeSocket } = useSocketStore();
  const { initializeGoogleCalendarListeners, initializeMicrosoftCalendarListeners } = useUserTokenStore();
  const { preloadAssets } = useAppAssets();

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[App] Starting initialization...');
        
        // Step 1: Preload essential assets
        console.log('[App] Loading essential assets...');
        await preloadAssets(['icon.png']);
        
        // Step 2: Setup authentication listeners
        console.log('[App] Setting up authentication...');
        setupDeeplinkAuthListener();
        
        // Step 3: Initialize calendar listeners
        console.log('[App] Setting up calendar listeners...');
        const cleanupGoogle = initializeGoogleCalendarListeners();
        const cleanupMicrosoft = initializeMicrosoftCalendarListeners();
        
        // Step 4: Wait for Google services to be ready
        console.log('[App] Waiting for Google services...');
        await new Promise<void>((resolve) => {
          if (googleServicesReady) {
            resolve();
          } else {
            const checkReady = () => {
              if (googleServicesReady) {
                resolve();
              } else {
                setTimeout(checkReady, 100);
              }
            };
            checkReady();
          }
        });
        
        // Step 5: Initialize MCP services
        console.log('[App] Initializing MCP services...');
        await initializeMCPServices();
        
        console.log('[App] App initialization complete');
        
        // Hide EJS loading and immediately mark as complete
        if (window.hideEJSLoading) {
          window.hideEJSLoading();
        }
        
        // Set both states immediately to skip React loading screen
        setIsAppReady(true);
        setInitializationComplete(true);
        
      } catch (error) {
        console.error('App initialization failed:', error);
        if (window.hideEJSLoading) {
          window.hideEJSLoading();
        }
        setIsAppReady(true);
        setInitializationComplete(true);
      }
    };

    initializeApp();
  }, [preloadAssets, googleServicesReady, initializeGoogleCalendarListeners, initializeMicrosoftCalendarListeners]);

  // MCP Services initialization function
  const initializeMCPServices = async () => {
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

    let completed = 0;
    for (const [key, service] of Object.entries(servers)) {
      if (service.enabled && service.configured) {
        const serviceType = serviceTypeMap[key];
        if (serviceType) {
          try {
            console.log(`Initializing service: ${serviceType}`);
            await initializeClient(serviceType);
            completed++;
          } catch (error) {
            console.error(`Failed to initialize ${serviceType}:`, error);
          }
        }
      }
    }
  };

  useEffect(() => {
    if (!selectedContext && contexts.length > 0) {
      setSelectedContext(contexts[0]);
    }
  }, [selectedContext, contexts, setSelectedContext]);

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
      // Still mark as ready to continue initialization
      setGoogleServicesReady(true);
    };

    const removeReadyListener = window.electron.ipcRenderer.on('google-services:ready', handleGoogleServicesReady);
    const removeErrorListener = window.electron.ipcRenderer.on('google-services:error', handleGoogleServicesError);

    return () => {
      removeReadyListener();
      removeErrorListener();
    };
  }, []);

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

  // Initialize guest agent when no user is logged in
  useEffect(() => {
    if (!user && !agent) {
      console.log('[App] No user logged in, creating guest agent');
      createGuestAgent();
    }
  }, [user, agent, createGuestAgent]);

  // Skip LoadingScreen entirely
  if (!initializationComplete) {
    return null; // Return nothing while EJS loading screen handles everything
  }

  return <MainInterface />;
}

export default App;
