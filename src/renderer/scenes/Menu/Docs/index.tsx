import { Box, Typography } from "@mui/material";
import { useState, useEffect } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import MenuListItem from "@/renderer/components/Navigation/MenuListItem";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import BugReportIcon from "@mui/icons-material/BugReport";
import StorageIcon from "@mui/icons-material/Storage";
import { useMCPStore } from "@/renderer/stores/MCP/MCPStore";
import { SERVICE_TYPE_MAPPING, getServiceTools } from "@/utils/mcp";

export default function DocsMenu() {
  const intl = useIntl();
  const { selectedContext } = useCurrentTopicContext();
  const selectedTopics = useTopicStore((state) => state.selectedTopics);
  const setSelectedTopic = useTopicStore((state) => state.setSelectedTopic);
  const mcpStore = useMCPStore();

  const section = selectedContext?.section || '';
  const selectedSubcategory = section ? selectedTopics[section] || '' : '';

  const [services, setServices] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    const allServers = mcpStore.getAllConfiguredServers();
    console.log("DocsMenu - All servers:", allServers);
    
    const enabledServices: { [key: string]: any } = {};
    
    Object.entries(allServers).forEach(([key, value]) => {
      if (value.enabled) {
        const serviceKey = key; // Use original key like 'tavily', 'moodle', 'onlysaidkb'
        const tools = getServiceTools(key);
        const displayName = mcpStore.formatServerName(key);
        enabledServices[serviceKey] = {
          name: displayName,
          tools: tools || [],
          originalKey: key
        };
      }
    });
    
    console.log("DocsMenu - Enabled services:", enabledServices);
    setServices(enabledServices);
  }, [mcpStore]);

  // ✅ FIX: Keep docs section selection like workspace insights
  const handleSelectService = (serviceType: string) => {
    setSelectedTopic(section, serviceType);
  };

  // ✅ FIX: For MCP tools, use a dedicated key like insights does for moodle
  const handleSelectMCPTool = (toolName: string) => {
    setSelectedTopic('mcp-tools', toolName);
  };

  // Available docs services
  const docsServices = [
    {
      id: 'knowledgeBase',
      name: intl.formatMessage({ id: "docs.services.knowledgeBase", defaultMessage: "Knowledge Base Testing" }),
      icon: StorageIcon,
      disabled: false
    },
    {
      id: 'mcp-tools',
      name: intl.formatMessage({ id: "docs.services.mcpTools", defaultMessage: "MCP Tools & Testing" }),
      icon: BugReportIcon,
      disabled: false
    }
  ];

  // Get current selected tool for MCP
  const selectedMCPTool = selectedTopics['mcp-tools'] || '';

  // ✅ FIX: Check if MCP Tools is selected similar to insights
  const isMCPSelected = selectedSubcategory === 'mcp-tools';

  // Convert services to tool list for MCP section - use the actual service keys
  const mcpTools = Object.entries(services).map(([key, service]) => ({
    id: key,  // This should be the original server key like 'tavily', 'moodle', etc.
    name: service.name,
    toolCount: service.tools.length
  }));

  console.log("DocsMenu - section:", section);
  console.log("DocsMenu - selectedSubcategory:", selectedSubcategory);
  console.log("DocsMenu - selectedMCPTool:", selectedMCPTool);
  console.log("DocsMenu - isMCPSelected:", isMCPSelected);
  console.log("DocsMenu - MCP Tools for menu:", mcpTools);

  try {
    return (
      <Box sx={{ mt: 2, px: 2 }}>
        <Box sx={{ mt: 2 }}>
          {docsServices.length > 0 ? (
            docsServices.map((service) => {
              const IconComponent = service.icon;
              const isServiceSelected = selectedSubcategory === service.id;
              
              return (
                <Box key={service.id}>
                  <MenuListItem
                    label={
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        width: '100%',
                        pr: 1
                      }}>
                        <IconComponent sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {service.name}
                        </Typography>
                      </Box>
                    }
                    isSelected={isServiceSelected}
                    onClick={() => !service.disabled && handleSelectService(service.id)}
                    sx={{ 
                      pl: 4,
                      py: 1.5,
                      opacity: service.disabled ? 0.5 : 1,
                      cursor: service.disabled ? 'not-allowed' : 'pointer',
                      pointerEvents: service.disabled ? 'none' : 'auto',
                      '& .MuiListItemText-root': {
                        margin: 0,
                      }
                    }}
                  />
                  
                  {/* Show MCP Tools when selected */}
                  {service.id === 'mcp-tools' && isMCPSelected && (
                    <Box sx={{ ml: 2, mt: 1, mb: 1 }}>
                      {mcpTools.length > 0 ? mcpTools.map((tool) => {
                        const isToolSelected = selectedMCPTool === tool.id;
                        
                        return (
                          <MenuListItem
                            key={tool.id}
                            label={
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                width: '100%',
                                pr: 1
                              }}>
                                <BugReportIcon sx={{ mr: 1, fontSize: 14, color: 'text.secondary' }} />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                    {tool.name}
                                  </Typography>
                                  <Typography variant="body2" sx={{ 
                                    fontSize: '0.75rem', 
                                    color: 'text.secondary',
                                    fontWeight: 'regular'
                                  }}>
                                    ({tool.toolCount})
                                  </Typography>
                                </Box>
                              </Box>
                            }
                            isSelected={isToolSelected}
                            onClick={() => handleSelectMCPTool(tool.id)}
                            sx={{ 
                              pl: 6,
                              py: 1,
                              '& .MuiListItemText-root': {
                                margin: 0,
                              },
                              '&.Mui-selected': {
                                bgcolor: 'action.selected',
                              }
                            }}
                          />
                        );
                      }) : (
                        <Box sx={{ pl: 6, py: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
                          <FormattedMessage id="docs.noMCPTools" defaultMessage="No MCP tools available" />
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              );
            })
          ) : (
            <Box sx={{ pl: 4, py: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
              <FormattedMessage id="docs.noServices" defaultMessage="No docs services available" />
            </Box>
          )}
        </Box>
      </Box>
    );
  } catch (error) {
    console.error("Error in DocsMenu:", error);
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        An error occurred loading the docs menu.
      </Box>
    );
  }
}
