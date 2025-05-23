import { Box, Button, FormControl, InputLabel, Select, MenuItem, Pagination, SelectChangeEvent, TextField, InputAdornment } from "@mui/material";
import { useState } from "react";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import { useMCPSettingsStore } from "@/stores/MCP/MCPSettingsStore";
import Servers from "./Servers";
import ServiceDialog from "./Dialogs";
import { FormattedMessage } from "react-intl";
import { toast } from "@/utils/toast";
import SearchIcon from "@mui/icons-material/Search";

function MCPSettings() {
  const {
    getAllConfiguredServers,
    setServerConfig,
    initializeClient
  } = useMCPStore();

  const {
    page,
    itemsPerPage,
    selectedCategory,
    setPage,
    setItemsPerPage,
    setSelectedCategory
  } = useMCPSettingsStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [serviceType, setServiceType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Get current server states
  const allServers = getAllConfiguredServers();

  const serviceCategories = [
    { value: "all", label: "All Services" },
    { value: "location", label: "Location Services" },
    { value: "communication", label: "Communication Services" },
    { value: "research", label: "Research Services" },
    { value: "delivery", label: "Delivery Services" },
    { value: "development", label: "Development Services" },
    { value: "weather", label: "Weather Services" },
    { value: "accommodation", label: "Accommodation Services" }
  ];

  // Map server names to service types and categories
  const serviceConfigs = [
    {
      type: "weather",
      serverName: "weather",
      enabledFlag: allServers.weather?.enabled || false,
      config: allServers.weather?.config || {},
      humanName: "Weather",
      category: "weather"
    },
    {
      type: "weather-forecast",
      serverName: "weatherForecast",
      enabledFlag: allServers.weatherForecast?.enabled || false,
      config: allServers.weatherForecast?.config || {},
      humanName: "Weather Forecast",
      category: "weather"
    },
    {
      type: "location",
      serverName: "location",
      enabledFlag: allServers.location?.enabled || false,
      config: allServers.location?.config || {},
      humanName: "Location",
      category: "location"
    },
    {
      type: "ip-location",
      serverName: "ipLocation",
      enabledFlag: allServers.ipLocation?.enabled || false,
      config: allServers.ipLocation?.config || {},
      humanName: "IP Location",
      category: "location"
    },
    {
      type: "nearby-search",
      serverName: "nearbySearch",
      enabledFlag: allServers.nearbySearch?.enabled || false,
      config: allServers.nearbySearch?.config || {},
      humanName: "Nearby Search",
      category: "location"
    },
    {
      type: "web3-research",
      serverName: "web3Research",
      enabledFlag: allServers.web3Research?.enabled || false,
      config: allServers.web3Research?.config || {},
      humanName: "Web3 Research",
      category: "research"
    },
    {
      type: "doordash",
      serverName: "doorDash",
      enabledFlag: allServers.doorDash?.enabled || false,
      config: allServers.doorDash?.config || {},
      humanName: "DoorDash",
      category: "delivery"
    },
    {
      type: "whatsapp",
      serverName: "whatsApp",
      enabledFlag: allServers.whatsApp?.enabled || false,
      config: allServers.whatsApp?.config || {},
      humanName: "WhatsApp",
      category: "communication"
    },
    {
      type: "github",
      serverName: "github",
      enabledFlag: allServers.github?.enabled || false,
      config: allServers.github?.config || {},
      humanName: "GitHub",
      category: "development"
    },
    {
      type: "airbnb",
      serverName: "airbnb",
      enabledFlag: allServers.airbnb?.enabled || false,
      config: allServers.airbnb?.config || {},
      humanName: "Airbnb",
      category: "accommodation"
    },
    {
      type: "tavily",
      serverName: "tavily",
      enabledFlag: allServers.tavily?.enabled || false,
      config: allServers.tavily?.config || {},
      humanName: "Tavily",
      category: "research"
    },
    {
      type: "linkedin",
      serverName: "linkedIn",
      enabledFlag: allServers.linkedIn?.enabled || false,
      config: allServers.linkedIn?.config || {},
      humanName: "LinkedIn",
      category: "communication"
    }
  ];

  const filteredServices = serviceConfigs
    .filter(service => selectedCategory === "all" || service.category === selectedCategory)
    .filter(service => searchTerm === "" ||
      service.humanName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.type.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

  const getCurrentPageItems = () => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredServices.slice(startIndex, endIndex);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleCategoryChange = (event: SelectChangeEvent) => {
    setSelectedCategory(event.target.value);
  };

  const handleItemsPerPageChange = (event: SelectChangeEvent) => {
    setItemsPerPage(Number(event.target.value));
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  // Create dialog handlers dynamically
  const createDialogHandler = (type: string) => () => {
    setServiceType(type);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSaveDialog = async (data: Record<string, any>) => {
    const serviceConfig = serviceConfigs.find(s => s.type === serviceType);
    if (!serviceConfig) return;

    // Update server config using generic method
    setServerConfig(serviceConfig.serverName, data);

    // If server is enabled, reinitialize
    if (serviceConfig.enabledFlag) {
      const result = await initializeClient(serviceType);
      if (result.success) {
        toast.success(`${serviceConfig.humanName} service configuration updated successfully`);
      } else {
        toast.error(`${serviceConfig.humanName} service error: ${result.error}`);
      }
    }

    setDialogOpen(false);
  };

  const handleSave = async () => {
    let successCount = 0;
    let failCount = 0;

    const runInitialize = async (type: string, name: string) => {
      const result = await initializeClient(type);
      if (result.success) {
        successCount++;
        toast.success(`${name} service initialized successfully`);
      } else {
        failCount++;
        toast.error(`${name} service error: ${result.error}`);
      }
    };

    // Initialize all enabled services
    for (const service of serviceConfigs) {
      if (service.enabledFlag) {
        await runInitialize(service.type, service.humanName);
      }
    }

    if (successCount > 0 && failCount === 0) {
      toast.success(`All services (${successCount}) initialized successfully`);
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(`${successCount} services initialized, ${failCount} failed`);
    }
  };

  // Create configure handlers dynamically
  const configureHandlers: Record<string, () => void> = {};
  serviceConfigs.forEach(service => {
    configureHandlers[service.type] = createDialogHandler(service.type);
  });

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="category-select-label">
            <FormattedMessage id="settings.mcp.filterByCategory" />
          </InputLabel>
          <Select
            labelId="category-select-label"
            value={selectedCategory}
            onChange={handleCategoryChange}
            label={<FormattedMessage id="settings.mcp.filterByCategory" />}
          >
            {serviceCategories.map(category => (
              <MenuItem key={category.value} value={category.value}>
                <FormattedMessage id={`settings.mcp.category.${category.value}`} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search services"
            value={searchTerm}
            onChange={handleSearchChange}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }
            }}
            sx={{
              width: 200,
              '& .MuiInputBase-root': {
                height: 40,
                borderRadius: 1
              },
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
                '&:hover fieldset': {
                  borderColor: 'primary.main',
                },
              }
            }}
          />

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="items-per-page-label">
              <FormattedMessage id="settings.mcp.itemsPerPage" />
            </InputLabel>
            <Select
              labelId="items-per-page-label"
              value={itemsPerPage.toString()}
              onChange={handleItemsPerPageChange}
              label={<FormattedMessage id="settings.mcp.itemsPerPage" />}
            >
              <MenuItem value={2}>2</MenuItem>
              <MenuItem value={4}>4</MenuItem>
              <MenuItem value={6}>6</MenuItem>
              <MenuItem value={8}>8</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Servers
        services={getCurrentPageItems()}
        configureHandlers={configureHandlers}
      />

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 3 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={handlePageChange}
          color="primary"
        />
      </Box>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" onClick={handleSave}>
          <FormattedMessage id="settings.mcp.reinitializeAllServices" />
        </Button>
      </Box>

      <ServiceDialog
        open={dialogOpen}
        serviceType={serviceType}
        onClose={handleCloseDialog}
        onSave={handleSaveDialog}
        initialData={(() => {
          const serviceConfig = serviceConfigs.find(s => s.type === serviceType);
          return serviceConfig?.config || {};
        })()}
      />
    </Box>
  );
}

export default MCPSettings;
