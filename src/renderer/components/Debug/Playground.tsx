import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  Stack,
} from "@mui/material";
import {
  MenuBook as MenuBookIcon,
} from "@mui/icons-material";
import { useMCPStore } from "@/renderer/stores/MCP/MCPStore";
import { SERVICE_TYPE_MAPPING, getServiceTools } from "@/utils/mcp";
import MCPDebug from "./MCPDebug";
import KBDebug from "./KBDebug";

const Playground = () => {
  const mcpStore = useMCPStore();
  const [services, setServices] = useState<{ [key: string]: any }>({});
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedTool, setSelectedTool] = useState<string>("");

  useEffect(() => {
    const allServers = mcpStore.getAllConfiguredServers();
    console.log("All servers:", allServers);
    
    const enabledServices: { [key: string]: any } = {};
    Object.entries(allServers).forEach(([key, value]) => {
      if (value.enabled) {
        const serviceKey = SERVICE_TYPE_MAPPING[key] || key;
        const tools = getServiceTools(key);
        console.log(`Server: ${key}, ServiceKey: ${serviceKey}, Tools:`, tools);
        const displayName = mcpStore.formatServerName(key);
        enabledServices[serviceKey] = {
          name: displayName,
          tools: tools || []
        };
      }
    });

    setServices(enabledServices);
    
    // Set first service as default if any exist
    const serviceKeys = Object.keys(enabledServices);
    if (serviceKeys.length > 0 && !selectedService) {
      setSelectedService(serviceKeys[0]);
    }
  }, [mcpStore]);

  // Reset selected tool when service changes
  useEffect(() => {
    setSelectedTool("");
  }, [selectedService]);

  const handleServiceChange = (event: SelectChangeEvent) => {
    setSelectedService(event.target.value);
  };

  const handleToolSelect = (toolName: string) => {
    setSelectedTool(toolName);
  };

  const handleBackToService = () => {
    setSelectedTool("");
  };

  return (
    <Box sx={{ display: 'flex', height: '100%', minHeight: 400 }}>
      {/* Sidebar */}
      <Box sx={{
        width: 280,
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper'
      }}>
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          bgcolor: 'primary.main',
          color: 'primary.contrastText'
        }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <MenuBookIcon fontSize="small" />
            <Box>
              <Typography variant="subtitle1" fontWeight="600">
                MCP Tools & KB Testing
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                API Documentation & Testing
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Service Selector */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Service
          </Typography>
          <FormControl fullWidth size="small">
            <Select
              value={selectedService}
              onChange={handleServiceChange}
              displayEmpty
            >
              <MenuItem value="" disabled>Choose service...</MenuItem>
              <MenuItem value="knowledgeBase">🧠 Knowledge Base Testing</MenuItem>
              {Object.entries(services).map(([key, service]) => (
                <MenuItem key={key} value={key}>
                  {service.name} ({service.tools.length})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Render appropriate sidebar content based on selected service */}
        {selectedService === "knowledgeBase" ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Knowledge Base testing interface selected
            </Typography>
          </Box>
        ) : selectedService && (
          <MCPDebug
            services={services}
            selectedService={selectedService}
            selectedTool={selectedTool}
            onToolSelect={handleToolSelect}
            onBackToService={handleBackToService}
            renderMode="sidebar"
          />
        )}
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default' }}>
        {!selectedService ? (
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            p: 3
          }}>
            <Stack spacing={2} alignItems="center">
              <MenuBookIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
              <Typography variant="h6" color="text.secondary">
                Welcome to MCP Tools & KB Testing
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select a service to explore available tools or test Knowledge Base
              </Typography>
            </Stack>
          </Box>
        ) : selectedService === "knowledgeBase" ? (
          <KBDebug />
        ) : (
          <MCPDebug
            services={services}
            selectedService={selectedService}
            selectedTool={selectedTool}
            onToolSelect={handleToolSelect}
            onBackToService={handleBackToService}
            renderMode="main"
          />
        )}
      </Box>
    </Box>
  );
};

export default Playground;