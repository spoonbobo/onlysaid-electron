import React from "react";
import {
  Box,
  Typography,
  List,
  ListItemText,
  Chip,
  ListItemButton,
  Paper,
  Alert,
  Stack,
  useTheme,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Breadcrumbs,
  Link,
} from "@mui/material";
import {
  Code as CodeIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from "@mui/icons-material";

interface MCPDebugProps {
  services: { [key: string]: any };
  selectedService: string;
  selectedTool: string;
  onToolSelect: (toolName: string) => void;
  onBackToService: () => void;
  renderMode?: 'sidebar' | 'main';
}

const MCPDebug: React.FC<MCPDebugProps> = ({
  services,
  selectedService,
  selectedTool,
  onToolSelect,
  onBackToService,
  renderMode = 'main',
}) => {
  const theme = useTheme();

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

  // Sidebar Tools List Component
  if (renderMode === 'sidebar') {
    return (
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
                  onClick={() => onToolSelect(tool.name)}
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
    );
  }

  // Main Content Component - Only show tool details or tool selection
  if (!selectedTool) {
    // ✅ Show tool selection interface for the specific service
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          {services[selectedService]?.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {services[selectedService]?.tools.length} tools available. Select a tool to view its details.
        </Typography>
        
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Available Tools</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {services[selectedService]?.tools.map((tool: any, index: number) => (
              <Chip
                key={index}
                label={tool.name}
                onClick={() => onToolSelect(tool.name)}
                clickable
                variant="outlined"
                icon={<CodeIcon />}
                sx={{ fontFamily: 'monospace' }}
              />
            ))}
          </Stack>
        </Paper>
      </Box>
    );
  }

  if (!currentTool) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%'
      }}>
        <Alert severity="error">Tool not found</Alert>
      </Box>
    );
  }

  // Tool Details (same as before)
  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link 
          color="inherit" 
          href="#" 
          onClick={onBackToService}
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
  );
};

export default MCPDebug;
