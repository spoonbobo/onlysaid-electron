import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Stack,
  useTheme,
  alpha,
} from "@mui/material";
import {
  MenuBook as MenuBookIcon,
  Code as CodeIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { useMCPStore } from "@/renderer/stores/MCP/MCPStore";
import { SERVICE_TYPE_MAPPING, getServiceTools } from "@/utils/mcp";

const Playground = () => {
  const theme = useTheme();
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

  // Enhanced schema formatting using MUI Table components
  const formatSchema = (schema: any) => {
    if (!schema) {
      return (
        <Alert severity="info" icon={<InfoIcon />}>
          No input schema defined for this tool.
        </Alert>
      );
    }

    if (schema.type === 'object' && schema.properties) {
      return (
        <Stack spacing={2}>
          {/* Required Parameters Alert */}
          {schema.required && schema.required.length > 0 && (
            <Alert severity="warning" icon={<WarningIcon />}>
              <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 1 }}>
                Required Parameters
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {schema.required.map((field: string) => (
                  <Chip
                    key={field}
                    label={field}
                    size="small"
                    color="warning"
                    sx={{ fontFamily: 'monospace' }}
                  />
                ))}
              </Stack>
            </Alert>
          )}

          {/* Parameters Table */}
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableCell sx={{ fontWeight: 600 }}>Parameter</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Required</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(schema.properties).map(([name, prop]: [string, any]) => (
                  <TableRow key={name} hover>
                    <TableCell>
                      <Chip
                        label={name}
                        variant="outlined"
                        size="small"
                        sx={{ 
                          fontFamily: 'monospace',
                          fontWeight: 500
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={prop.type} 
                        size="small" 
                        color="primary"
                        variant="outlined"
                        sx={{ fontFamily: 'monospace' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {prop.description || 'No description provided'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {schema.required?.includes(name) ? (
                        <Chip 
                          label="Required" 
                          size="small" 
                          color="warning"
                          icon={<WarningIcon />}
                        />
                      ) : (
                        <Chip 
                          label="Optional" 
                          size="small" 
                          variant="outlined"
                          icon={<CheckCircleIcon />}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Additional Properties Info */}
          {schema.additionalProperties !== undefined && (
            <Typography variant="caption" color="text.secondary">
              Additional properties: {schema.additionalProperties ? 'Allowed' : 'Not allowed'}
            </Typography>
          )}
        </Stack>
      );
    }

    // Fallback JSON display
    return (
      <Paper variant="outlined">
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2">Raw Schema</Typography>
        </Box>
        <Box sx={{ 
          p: 2,
          bgcolor: alpha(theme.palette.grey[500], 0.05),
          overflow: 'auto'
        }}>
          <Typography 
            component="pre" 
            variant="body2"
            sx={{ 
              fontFamily: 'monospace',
              margin: 0,
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap'
            }}
          >
            {JSON.stringify(schema, null, 2)}
          </Typography>
        </Box>
      </Paper>
    );
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
                MCP Tools
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                API Documentation
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
              {Object.entries(services).map(([key, service]) => (
                <MenuItem key={key} value={key}>
                  {service.name} ({service.tools.length})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Tools List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {selectedService ? (
            services[selectedService]?.tools.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No tools available
                </Typography>
              </Box>
            ) : (
              <List dense>
                {services[selectedService]?.tools.map((tool: any, index: number) => (
                  <ListItemButton
                    key={index}
                    selected={selectedTool === tool.name}
                    onClick={() => handleToolSelect(tool.name)}
                    sx={{
                      '&.Mui-selected': {
                        borderRight: 3,
                        borderColor: 'primary.main',
                        bgcolor: alpha(theme.palette.primary.main, 0.08)
                      }
                    }}
                  >
                    <CodeIcon sx={{ mr: 1, fontSize: '1rem', color: 'text.secondary' }} />
                    <ListItemText
                      primary={tool.name}
                      primaryTypographyProps={{
                        fontFamily: 'monospace',
                        fontSize: '0.875rem'
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Select a service
              </Typography>
            </Box>
          )}
        </Box>
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
                Welcome to MCP Tools
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select a service to explore available tools
              </Typography>
            </Stack>
          </Box>
        ) : !selectedTool ? (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
              {services[selectedService]?.name}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {services[selectedService]?.tools.length} tools available
            </Typography>
            
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Tools</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {services[selectedService]?.tools.map((tool: any, index: number) => (
                  <Chip
                    key={index}
                    label={tool.name}
                    onClick={() => handleToolSelect(tool.name)}
                    clickable
                    variant="outlined"
                    icon={<CodeIcon />}
                    sx={{ fontFamily: 'monospace' }}
                  />
                ))}
              </Stack>
            </Paper>
          </Box>
        ) : currentTool ? (
          <Box sx={{ p: 3 }}>
            {/* Breadcrumbs */}
            <Breadcrumbs sx={{ mb: 2 }}>
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

            {/* Tool Details */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  mb: 1,
                  fontFamily: 'monospace',
                  color: 'primary.main'
                }}
              >
                {currentTool.name}
              </Typography>
              
              <Typography variant="body1" color="text.secondary">
                {currentTool.description || "No description available"}
              </Typography>
            </Paper>

            {/* Parameters */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Parameters
              </Typography>
              {formatSchema(currentTool.inputSchema)}
            </Paper>
          </Box>
        ) : (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%'
          }}>
            <Alert severity="error">Tool not found</Alert>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Playground;
