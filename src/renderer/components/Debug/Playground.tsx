import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  List,
  ListItemText,
  Chip,
  ListItemButton,
  Card,
  CardContent,
  Breadcrumbs,
  Link,
} from "@mui/material";
import { useMCPStore } from "@/renderer/stores/MCP/MCPStore";
import { SERVICE_TYPE_MAPPING, getServiceTools } from "@/utils/mcp";

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

  // Get current tool object
  const getCurrentTool = () => {
    if (!selectedService || !selectedTool) return null;
    const tools = services[selectedService]?.tools || [];
    return tools.find((tool: any) => tool.name === selectedTool) || null;
  };

  const currentTool = getCurrentTool();

  // Enhanced schema formatting for documentation style
  const formatSchema = (schema: any) => {
    if (!schema) {
      return (
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              No input schema defined for this tool.
            </Typography>
          </CardContent>
        </Card>
      );
    }

    if (schema.type === 'object' && schema.properties) {
      return (
        <Box sx={{ mt: 2 }}>
          {/* Required Parameters Section */}
          {schema.required && schema.required.length > 0 && (
            <Card variant="outlined" sx={{ mb: 2, bgcolor: 'warning.light', borderColor: 'warning.main' }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="subtitle2" fontWeight="600" color="warning.dark" sx={{ mb: 1 }}>
                  ⚠️ Required Parameters
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {schema.required.map((field: string) => (
                    <Chip
                      key={field}
                      label={field}
                      size="small"
                      sx={{ 
                        bgcolor: 'warning.main', 
                        color: 'warning.contrastText',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem'
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Parameters Table */}
          <Card variant="outlined">
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ 
                overflowX: 'auto',
                '& table': {
                  width: '100%',
                  borderCollapse: 'collapse',
                },
                '& th': {
                  textAlign: 'left',
                  p: 2,
                  bgcolor: 'grey.50',
                  borderBottom: '2px solid',
                  borderColor: 'divider',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: 'text.primary'
                },
                '& td': {
                  p: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  fontSize: '0.875rem',
                  verticalAlign: 'top'
                },
                '& tr:hover': {
                  bgcolor: 'action.hover'
                }
              }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Parameter</th>
                      <th style={{ width: '15%' }}>Type</th>
                      <th style={{ width: '45%' }}>Description</th>
                      <th style={{ width: '15%' }}>Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(schema.properties).map(([name, prop]: [string, any]) => (
                      <tr key={name}>
                        <td>
                          <Typography 
                            component="code" 
                            sx={{ 
                              fontFamily: 'monospace',
                              bgcolor: 'grey.100',
                              px: 0.5,
                              py: 0.25,
                              borderRadius: 0.5,
                              fontSize: '0.8rem',
                              fontWeight: 500
                            }}
                          >
                            {name}
                          </Typography>
                        </td>
                        <td>
                          <Chip 
                            label={prop.type} 
                            size="small" 
                            variant="outlined"
                            sx={{ 
                              fontFamily: 'monospace',
                              fontSize: '0.7rem',
                              height: '20px'
                            }}
                          />
                        </td>
                        <td>
                          <Typography variant="body2" color="text.secondary">
                            {prop.description || 'No description provided'}
                          </Typography>
                        </td>
                        <td>
                          {schema.required?.includes(name) ? (
                            <Chip 
                              label="Required" 
                              size="small" 
                              color="warning"
                              sx={{ fontSize: '0.7rem', height: '20px' }}
                            />
                          ) : (
                            <Chip 
                              label="Optional" 
                              size="small" 
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: '20px' }}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </CardContent>
          </Card>

          {/* Additional Properties Info */}
          {schema.additionalProperties !== undefined && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Additional properties: {schema.additionalProperties ? 'Allowed' : 'Not allowed'}
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    // Fallback JSON display with better styling
    return (
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Raw Schema:</Typography>
          <Box sx={{ 
            bgcolor: 'grey.50', 
            p: 2, 
            borderRadius: 1,
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <pre style={{ 
              margin: 0, 
              fontFamily: 'monospace', 
              fontSize: '0.8rem',
              lineHeight: 1.4
            }}>
              {JSON.stringify(schema, null, 2)}
            </pre>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      display: 'flex',
      bgcolor: '#fafafa'
    }}>
      {/* Documentation-style Sidebar */}
      <Box sx={{
        width: '280px',
        bgcolor: 'white',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Sidebar Header */}
        <Box sx={{ 
          p: 3, 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          bgcolor: 'primary.main',
          color: 'primary.contrastText'
        }}>
          <Typography variant="h6" fontWeight="600">
            📚 MCP Tools Reference
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
            Interactive API Documentation
          </Typography>
        </Box>

        {/* Service Selector */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Select Service
          </Typography>
          <FormControl fullWidth size="small">
            <Select
              value={selectedService}
              onChange={handleServiceChange}
              displayEmpty
              sx={{ fontSize: '0.875rem' }}
            >
              <MenuItem value="" disabled>Choose a service...</MenuItem>
              {Object.entries(services).map(([key, service]) => (
                <MenuItem key={key} value={key}>
                  {service.name} ({service.tools.length} tools)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Tools Navigation */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {selectedService ? (
            services[selectedService]?.tools.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No tools available for this service
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                <ListItemButton sx={{ px: 2, py: 1, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" fontWeight="600" color="text.secondary">
                    Available Tools ({services[selectedService]?.tools.length})
                  </Typography>
                </ListItemButton>
                {services[selectedService]?.tools.map((tool: any, index: number) => (
                  <ListItemButton
                    key={index}
                    selected={selectedTool === tool.name}
                    onClick={() => handleToolSelect(tool.name)}
                    sx={{
                      px: 3,
                      py: 1.5,
                      borderLeft: selectedTool === tool.name ? '3px solid' : '3px solid transparent',
                      borderColor: 'primary.main',
                      '&.Mui-selected': {
                        bgcolor: 'primary.light',
                        '&:hover': {
                          bgcolor: 'primary.light',
                        }
                      },
                      '&:hover': {
                        bgcolor: 'action.hover',
                      }
                    }}
                  >
                    <ListItemText
                      primary={tool.name}
                      primaryTypographyProps={{
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        fontWeight: selectedTool === tool.name ? 600 : 400,
                        color: selectedTool === tool.name ? 'primary.main' : 'text.primary'
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Select a service to view available tools
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Main Documentation Content */}
      <Box sx={{
        flexGrow: 1,
        overflow: 'auto',
        bgcolor: 'white'
      }}>
        {!selectedService ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            flexDirection: 'column',
            gap: 2
          }}>
            <Typography variant="h5" color="text.secondary">
              Welcome to MCP Tools Documentation
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Select a service from the sidebar to explore available tools and their documentation.
            </Typography>
          </Box>
        ) : !selectedTool ? (
          <Box sx={{ p: 4 }}>
            <Typography variant="h4" fontWeight="600" sx={{ mb: 2 }}>
              {services[selectedService]?.name}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              This service provides {services[selectedService]?.tools.length} tools for integration.
              Select a tool from the sidebar to view its detailed documentation.
            </Typography>
            
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Available Tools</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {services[selectedService]?.tools.map((tool: any, index: number) => (
                    <Chip
                      key={index}
                      label={tool.name}
                      onClick={() => handleToolSelect(tool.name)}
                      clickable
                      variant="outlined"
                      sx={{ fontFamily: 'monospace' }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        ) : currentTool ? (
          <Box sx={{ maxWidth: '900px', mx: 'auto', p: 4 }}>
            {/* Breadcrumb Navigation */}
            <Breadcrumbs sx={{ mb: 3 }}>
              <Link 
                color="inherit" 
                href="#" 
                onClick={() => setSelectedTool("")}
                sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                {services[selectedService]?.name}
              </Link>
              <Typography color="text.primary" fontFamily="monospace">
                {currentTool.name}
              </Typography>
            </Breadcrumbs>

            {/* Tool Header */}
            <Box sx={{ mb: 4 }}>
              <Typography 
                variant="h3" 
                fontWeight="700" 
                sx={{ 
                  mb: 1,
                  fontFamily: 'monospace',
                  color: 'primary.main'
                }}
              >
                {currentTool.name}
              </Typography>
              
              <Typography 
                variant="h6" 
                color="text.secondary" 
                sx={{ mb: 2, lineHeight: 1.6 }}
              >
                {currentTool.description || "No description available for this tool."}
              </Typography>

              <Divider />
            </Box>

            {/* Parameters Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" fontWeight="600" sx={{ mb: 2 }}>
                Parameters
              </Typography>
              {formatSchema(currentTool.inputSchema)}
            </Box>
          </Box>
        ) : (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%' 
          }}>
            <Typography variant="h6" color="error">
              Tool not found
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Playground;
