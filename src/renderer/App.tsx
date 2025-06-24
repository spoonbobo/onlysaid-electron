import { useEffect, useState, useCallback } from 'react';
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
import { useChatStore } from '@/renderer/stores/Chat/ChatStore';
import { useIPCListeners } from '@/renderer/IPCListeners';

// ✅ LangGraph Interaction interface
interface LangGraphInteraction {
  interactionId: string;
  request: any;
  messageType: string;
  messageId: string | null;
}

function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [initializationComplete, setInitializationComplete] = useState(false);
  const { selectedContext, contexts, setSelectedContext } = useTopicStore();
  const { getAllConfiguredServers, initializeClient, getServiceTypeMapping } = useMCPStore();
  const [initProgress, setInitProgress] = useState(0);
  const [initToastId, setInitToastId] = useState<string | null>(null);
  const { user } = useUserStore();
  const { agent, createGuestAgent, resumeLangGraphWorkflow } = useAgentStore();
  const { initialize: initializeSocket, close: closeSocket } = useSocketStore();
  const { initializeGoogleCalendarListeners, initializeMicrosoftCalendarListeners } = useUserTokenStore();
  const { preloadAssets } = useAppAssets();
  
  // ✅ Global state for IPC listeners
  const [osswarmToolRequests, setOSSwarmToolRequests] = useState<Map<string, {
    approvalId: string;
    request: any;
    messageId: string;
  }>>(new Map());
  
  const [langGraphInteractions, setLangGraphInteractions] = useState<Map<string, LangGraphInteraction>>(new Map());

  // ✅ Get current chat context
  const { selectedTopics } = useTopicStore();
  const { messages: storeMessages, appendMessage, updateMessage } = useChatStore();
  
  const activeChatId = selectedContext?.section ? selectedTopics[selectedContext.section] || null : null;
  const workspaceId = selectedContext?.id || '';

  // ✅ Use the IPC listeners hook
  const [googleServicesReady, setGoogleServicesReady] = useState(false);
  const { handleHumanInteractionResponse } = useIPCListeners({
    activeChatId,
    workspaceId,
    agent,
    appendMessage,
    updateMessage,
    osswarmToolRequests,
    setOSSwarmToolRequests,
    langGraphInteractions,
    setLangGraphInteractions,
    resumeLangGraphWorkflow,
    setGoogleServicesReady
  });

  // ✅ FIXED: Corrected progress tracking - 4 main steps with proper percentage calculation
  const sendInitProgress = (step: string, currentStep: number, totalSteps: number, mcpProgress?: { current: number, total: number }) => {
    let percentage: number;
    
    if (mcpProgress && currentStep === totalSteps) {
      // For MCP step (final step), calculate progress within that step
      // Previous steps take up 75% (3/4), MCP step takes up the remaining 25%
      const previousStepsProgress = ((currentStep - 1) / totalSteps) * 100; // 75%
      const mcpStepProgress = (mcpProgress.current / mcpProgress.total) * (100 / totalSteps); // 0-25%
      percentage = Math.round(previousStepsProgress + mcpStepProgress);
    } else {
      // For non-MCP steps, calculate normally but don't reach 100% until the very end
      if (currentStep === totalSteps && !mcpProgress) {
        // This is the final step without MCP progress - show 100%
        percentage = 100;
      } else {
        // For steps 1-3, show 0%, 25%, 50%, 75%
        percentage = Math.round(((currentStep - 1) / totalSteps) * 100);
      }
    }
    
    // Use window function with MCP progress info
    if (window.updateEJSProgress) {
      window.updateEJSProgress(percentage, step, mcpProgress);
    }
    
    console.log(`[App Init] ${step}: ${currentStep}/${totalSteps} (${percentage}%)`);
  };

  const sendStepComplete = (step: string) => {
    if (window.setEJSLoadingText) {
      window.setEJSLoadingText(`${step} completed`);
    }
    console.log(`[App Init] Completed: ${step}`);
  };

  const sendInitComplete = () => {
    if (window.updateEJSProgress) {
      window.updateEJSProgress(100, 'Ready to start');
    }
    console.log('[App Init] Initialization complete');
  };

  // ✅ Enhanced MCP Services initialization with corrected progress calls
  const initializeMCPServices = async () => {
    const servers = getAllConfiguredServers();
    const serviceTypeMap = getServiceTypeMapping();

    const servicesToInit = Object.entries(servers)
      .filter(([_, service]) => service.enabled && service.configured)
      .map(([key]) => ({ key, serviceType: serviceTypeMap[key] }))
      .filter(({ serviceType }) => serviceType);

    if (servicesToInit.length === 0) {
      console.log('[App] No MCP services to initialize');
      sendStepComplete('MCP Services');
      return;
    }

    const total = servicesToInit.length;
    let completed = 0;

    console.log(`[App] Starting MCP initialization: ${total} services to initialize`);

    // ✅ Show initial MCP progress (75% + 0% of remaining 25%)
    sendInitProgress('Initializing MCP services', 4, 4, { current: 0, total });

    for (const { key, serviceType } of servicesToInit) {
      try {
        console.log(`[App] Initializing service ${completed + 1}/${total}: ${serviceType}`);
        
        await initializeClient(serviceType);
        completed++;
        
        console.log(`[App] Successfully initialized ${serviceType} (${completed}/${total})`);
        
        // ✅ Update progress after completing each service
        sendInitProgress('Initializing MCP services', 4, 4, { current: completed, total });
        
      } catch (error) {
        console.error(`[App] Failed to initialize ${serviceType}:`, error);
        completed++; // Still count as completed to maintain progress
        
        // ✅ Update progress even on failure
        sendInitProgress('Initializing MCP services', 4, 4, { current: completed, total });
      }
    }

    console.log(`[App] MCP initialization complete: ${completed}/${total} services processed`);
    sendStepComplete('MCP Services');
  };

  // ✅ SIMPLIFIED: Remove Google services dependency
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[App] Starting initialization...');
        
        // Step 1: Preload essential assets
        sendInitProgress('Loading essential assets', 1, 4); // Changed to 4 steps
        console.log('[App] Loading essential assets...');
        await preloadAssets(['icon.png']);
        sendStepComplete('Essential Assets');
        
        // Step 2: Setup authentication listeners
        sendInitProgress('Setting up authentication', 2, 4);
        console.log('[App] Setting up authentication...');
        setupDeeplinkAuthListener();
        sendStepComplete('Authentication');
        
        // Step 3: Initialize calendar listeners (non-blocking)
        sendInitProgress('Setting up calendar listeners', 3, 4);
        console.log('[App] Setting up calendar listeners...');
        const cleanupGoogle = initializeGoogleCalendarListeners();
        const cleanupMicrosoft = initializeMicrosoftCalendarListeners();
        sendStepComplete('Calendar Listeners');
        
        // Step 4: Initialize MCP services (no waiting for Google services)
        sendInitProgress('Initializing MCP services', 4, 4);
        console.log('[App] Initializing MCP services...');
        await initializeMCPServices();
        
        // Ready!
        sendInitComplete();
        
        // Hide EJS loading after showing completion
        setTimeout(() => {
          if (window.hideEJSLoading) {
            window.hideEJSLoading();
          }
        }, 1000);
        
        setIsAppReady(true);
        setInitializationComplete(true);
        
      } catch (error) {
        console.error('App initialization failed:', error);
        sendInitComplete();
        if (window.hideEJSLoading) {
          window.hideEJSLoading();
        }
        setIsAppReady(true);
        setInitializationComplete(true);
      }
    };

    initializeApp();
  }, [preloadAssets, initializeGoogleCalendarListeners, initializeMicrosoftCalendarListeners]);

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