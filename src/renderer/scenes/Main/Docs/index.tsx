import React from "react";
import { Box, Alert, Typography, CircularProgress } from "@mui/material";
import { useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useDocsStore } from "@/renderer/stores/Docs/DocsStore";
import { useMCPStore } from "@/renderer/stores/MCP/MCPStore";
import { SERVICE_TYPE_MAPPING, getServiceTools } from "@/utils/mcp";
import MCPDebug from "./MCPDebug";
import KBDebug from "./KBDebug";

function Docs() {
  const intl = useIntl();
  const { selectedContext, selectedTopics } = useTopicStore();
  const section = selectedContext?.section || '';
  
  // Get the selected docs service from the store
  const selectedDocsService = selectedTopics[section] || section;
  // Get the selected MCP service (if any)
  const selectedMCPService = selectedTopics['mcp-tools'] || '';

  console.log("Docs - section:", section);
  console.log("Docs - selectedDocsService:", selectedDocsService);
  console.log("Docs - selectedMCPService:", selectedMCPService);
  console.log("Docs - selectedTopics:", selectedTopics);

  if (!selectedDocsService) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Typography variant="h5" sx={{ mb: 2, color: 'text.secondary' }}>
            {intl.formatMessage({ id: "docs.selectService", defaultMessage: "Select a Documentation Service" })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {intl.formatMessage({ id: "docs.selectServiceDescription", defaultMessage: "Choose a documentation service from the menu to get started with API testing and documentation." })}
          </Typography>
        </Box>
      </Box>
    );
  }

  const renderDocsService = () => {
    if (selectedDocsService === 'knowledgeBase') {
      return <KBDebug />;
    } else if (selectedDocsService === 'mcp-tools') {
      // ✅ FIX: Only show MCPToolsWrapper if a specific service is selected
      if (selectedMCPService) {
        return <MCPToolsWrapper />;
      } else {
        // Show message to select a specific MCP service
        return (
          <Box sx={{ p: 3 }}>
            <Box sx={{ textAlign: 'center', mt: 8 }}>
              <Typography variant="h5" sx={{ mb: 2, color: 'text.secondary' }}>
                {intl.formatMessage({ id: "docs.selectMCPService", defaultMessage: "Select an MCP Service" })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {intl.formatMessage({ id: "docs.selectMCPServiceDescription", defaultMessage: "Choose a specific MCP service from the menu to explore its tools and documentation." })}
              </Typography>
            </Box>
          </Box>
        );
      }
    } else {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="info">
            {intl.formatMessage(
              { id: "docs.serviceNotImplemented", defaultMessage: "Documentation service '{service}' is not yet implemented." },
              { service: selectedDocsService }
            )}
          </Alert>
        </Box>
      );
    }
  };

  return (
    <Box sx={{ 
      height: "100%",
      overflow: "auto",
      bgcolor: "background.default"
    }}>
      {renderDocsService()}
    </Box>
  );
}

// Wrapper component for MCP Debug that uses topic store and docs store
function MCPToolsWrapper() {
  const { selectedTopics, selectedContext } = useTopicStore();
  const { setSelectedTool, getSelectedTool } = useDocsStore();
  const mcpStore = useMCPStore();
  const [services, setServices] = React.useState<{ [key: string]: any }>({});
  const [isLoading, setIsLoading] = React.useState(true); // ✅ Add loading state

  // Get workspace ID for docs store
  const workspaceId = selectedContext?.type === 'workspace' ? selectedContext.id || '' : 'global';
  
  // Get the specific MCP service selected from the menu
  const selectedMCPService = selectedTopics['mcp-tools'] || '';
  
  // Get selected tool from docs store (workspace-aware)
  const selectedTool = getSelectedTool(workspaceId, selectedMCPService);

  console.log("MCPToolsWrapper - workspaceId:", workspaceId);
  console.log("MCPToolsWrapper - Selected MCP service:", selectedMCPService);
  console.log("MCPToolsWrapper - Selected tool:", selectedTool);
  console.log("MCPToolsWrapper - Services loaded:", Object.keys(services));
  console.log("MCPToolsWrapper - isLoading:", isLoading);

  // Load MCP services
  React.useEffect(() => {
    setIsLoading(true); // ✅ Set loading when starting
    
    const allServers = mcpStore.getAllConfiguredServers();
    console.log("MCPToolsWrapper - All servers:", allServers);
    
    const enabledServices: { [key: string]: any } = {};
    Object.entries(allServers).forEach(([key, value]) => {
      if (value.enabled) {
        const serviceKey = key;
        const tools = getServiceTools(key);
        console.log(`MCPToolsWrapper - Server: ${key}, ServiceKey: ${serviceKey}, Tools:`, tools);
        const displayName = mcpStore.formatServerName(key);
        enabledServices[serviceKey] = {
          name: displayName,
          tools: tools || []
        };
      }
    });

    console.log("MCPToolsWrapper - Enabled services:", enabledServices);
    setServices(enabledServices);
    setIsLoading(false); // ✅ Set loading false when done
  }, [mcpStore]);

  const handleToolSelect = (toolName: string) => {
    setSelectedTool(workspaceId, selectedMCPService, toolName);
  };

  const handleBackToService = () => {
    setSelectedTool(workspaceId, selectedMCPService, '');
  };

  // ✅ Show loading spinner while services are loading
  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={24} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Loading MCP services...
        </Typography>
      </Box>
    );
  }

  // ✅ Now check if service exists after loading is complete
  if (!services[selectedMCPService]) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="warning">
          Service "{selectedMCPService}" not found or not enabled.
        </Alert>
        {Object.keys(services).length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Available services: {Object.entries(services).map(([key, service]) => service.name).join(', ')}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  // Show the MCPDebug component for the specific service
  return (
    <MCPDebug
      services={services}
      selectedService={selectedMCPService}
      selectedTool={selectedTool}
      onToolSelect={handleToolSelect}
      onBackToService={handleBackToService}
      renderMode="main"
    />
  );
}

export default Docs;