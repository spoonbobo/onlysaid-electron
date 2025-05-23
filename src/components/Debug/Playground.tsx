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
} from "@mui/material";
import { useMCPStore } from "@/stores/MCP/MCPStore";

const Playground = () => {
  const mcpStore = useMCPStore();
  const [services, setServices] = useState<{ [key: string]: any }>({});
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedTool, setSelectedTool] = useState<string>("");

  useEffect(() => {
    const allServers = mcpStore.getAllConfiguredServers();
    const enabledServices: { [key: string]: any } = {};

    Object.entries(allServers).forEach(([key, value]) => {
      if (value.enabled) {
        const serviceTypeMapping: Record<string, string> = {
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

        const serviceKey = serviceTypeMapping[key] || key;
        const displayName = mcpStore.formatServerName(key);

        enabledServices[serviceKey] = {
          name: displayName,
          tools: mcpStore.getServiceTools(serviceKey) || []
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

  // Format schema for display
  const formatSchema = (schema: any) => {
    if (!schema) return null;

    // Convert the schema properties to a more readable format
    if (schema.type === 'object' && schema.properties) {
      return (
        <Box>
          {schema.required && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight="medium" color="warning.main">
                Required fields:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {schema.required.map((field: string) => (
                  <Chip
                    key={field}
                    label={field}
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          <Typography variant="subtitle2" fontWeight="medium" color="primary.main">
            Properties:
          </Typography>

          <Box component="table" sx={{
            width: '100%',
            borderCollapse: 'collapse',
            mt: 0.5,
            '& th': {
              textAlign: 'left',
              p: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
            },
            '& td': {
              p: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
              fontSize: '0.875rem',
            }
          }}>
            <Box component="thead">
              <Box component="tr">
                <Box component="th">Field</Box>
                <Box component="th">Type</Box>
                <Box component="th">Description</Box>
                <Box component="th">Required</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {Object.entries(schema.properties).map(([name, prop]: [string, any]) => (
                <Box component="tr" key={name}>
                  <Box component="td" fontWeight="medium" color="secondary.main">{name}</Box>
                  <Box component="td">{prop.type}</Box>
                  <Box component="td">{prop.description || '-'}</Box>
                  <Box component="td">
                    {schema.required?.includes(name) ? (
                      <Chip size="small" label="Yes" color="warning" />
                    ) : (
                      <Chip size="small" label="No" variant="outlined" />
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Additional schema info if present */}
          {schema.additionalProperties !== undefined && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Additional properties: {schema.additionalProperties ? 'Allowed' : 'Not allowed'}
            </Typography>
          )}
        </Box>
      );
    }

    // Fallback to JSON display if not an object schema
    return (
      <Box sx={{ bgcolor: 'action.hover', p: 1, overflow: 'auto', borderRadius: 1 }}>
        <pre style={{ margin: 0 }}>
          {JSON.stringify(schema, null, 2)}
        </pre>
      </Box>
    );
  };

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      bgcolor: 'background.default'
    }}>
      <Paper sx={{ p: 1, borderRadius: 0, flexShrink: 0 }}>
        <Typography variant="h6" sx={{ color: 'primary.main', mb: 1 }}>MCP Service Tools</Typography>

        <FormControl fullWidth size="small">
          <Typography variant="body2" sx={{ mb: 0.5 }}>Service:</Typography>
          <Select
            value={selectedService}
            onChange={handleServiceChange}
            displayEmpty
          >
            <MenuItem value="" disabled>Select an enabled service</MenuItem>
            {Object.entries(services).map(([key, service]) => (
              <MenuItem key={key} value={key}>
                {service.name} ({service.tools.length} tools)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {selectedService && (
        <Box sx={{
          display: 'flex',
          flexGrow: 1,
          height: 'calc(100% - 90px)',
          overflow: 'hidden'
        }}>
          {/* Left panel: Tool list */}
          <Box sx={{
            width: '25%',
            overflow: 'auto',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}>
            {services[selectedService]?.tools.length === 0 ? (
              <Typography sx={{ p: 1, color: 'text.secondary' }}>
                No tools available
              </Typography>
            ) : (
              <List disablePadding sx={{ width: '100%' }}>
                {services[selectedService]?.tools.map((tool: any, index: number) => (
                  <ListItemButton
                    key={index}
                    selected={selectedTool === tool.name}
                    onClick={() => handleToolSelect(tool.name)}
                    sx={{
                      py: 1,
                      px: 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&.Mui-selected': {
                        bgcolor: 'action.selected',
                      }
                    }}
                  >
                    <ListItemText
                      primary={tool.name}
                      primaryTypographyProps={{
                        noWrap: true,
                        fontSize: '0.875rem',
                        fontWeight: selectedTool === tool.name ? 'bold' : 'normal'
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>

          {/* Right panel: Tool details */}
          <Box sx={{
            flexGrow: 1,
            p: 1,
            overflow: 'auto',
            bgcolor: 'background.paper'
          }}>
            {!selectedTool ? (
              <Typography sx={{
                textAlign: 'center',
                py: 2,
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}>
                Select a tool to view details
              </Typography>
            ) : currentTool ? (
              <Box>
                <Typography variant="h6" fontWeight="bold" color="secondary.main">
                  {currentTool.name}
                </Typography>

                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {currentTool.description || "No description available"}
                </Typography>

                <Divider sx={{ my: 1 }} />

                <Typography variant="subtitle1" fontWeight="medium" color="primary.main">
                  Input Schema:
                </Typography>

                {formatSchema(currentTool.inputSchema)}
              </Box>
            ) : (
              <Typography sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
                Tool not found
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Playground;
