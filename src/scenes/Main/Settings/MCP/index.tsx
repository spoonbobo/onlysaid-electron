import { Box, Button, FormControl, InputLabel, Select, MenuItem, Pagination, SelectChangeEvent, TextField, InputAdornment } from "@mui/material";
import { useState } from "react";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import { useMCPPageStore } from "@/stores/MCP/MCPPageStore";
import Servers from "./Servers";
import ServiceDialog from "./Dialogs";
import { FormattedMessage } from "react-intl";
import { toast } from "@/utils/toast";
import SearchIcon from "@mui/icons-material/Search";

function MCPSettings() {
  const {
    weatherEnabled, locationEnabled, ipLocationEnabled, weatherForecastEnabled,
    weatherConfig, locationConfig, ipLocationConfig, weatherForecastConfig,
    nearbySearchEnabled, web3ResearchEnabled, doorDashEnabled, whatsAppEnabled, gitHubEnabled, airbnbEnabled,
    nearbySearchConfig, web3ResearchConfig, doorDashConfig, whatsAppConfig, gitHubConfig,
    setWeatherEnabled, setLocationEnabled, setIPLocationEnabled, setWeatherForecastEnabled,
    setWeatherConfig, setLocationConfig, setIPLocationConfig, setWeatherForecastConfig,
    setNearbySearchConfig, setWeb3ResearchConfig, setDoorDashConfig, setWhatsAppConfig, setGitHubConfig,
    setNearbySearchEnabled, setWeb3ResearchEnabled, setDoorDashEnabled, setWhatsAppEnabled, setGitHubEnabled,
    setAirbnbEnabled,
    tavilyEnabled, tavilyConfig,
    setTavilyEnabled, setTavilyConfig,
    initializeClient,
    linkedInEnabled, linkedInConfig,
    setLinkedInEnabled, setLinkedInConfig
  } = useMCPStore();

  const {
    page,
    itemsPerPage,
    selectedCategory,
    setPage,
    setItemsPerPage,
    setSelectedCategory
  } = useMCPPageStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [serviceType, setServiceType] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

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

  const serviceConfigs = [
    {
      type: "weather",
      enabledFlag: weatherEnabled,
      config: weatherConfig,
      humanName: "Weather",
      category: "weather"
    },
    {
      type: "weather-forecast",
      enabledFlag: weatherForecastEnabled,
      config: weatherForecastConfig,
      humanName: "Weather Forecast",
      category: "weather"
    },
    {
      type: "location",
      enabledFlag: locationEnabled,
      config: locationConfig,
      humanName: "Location",
      category: "location"
    },
    {
      type: "ip-location",
      enabledFlag: ipLocationEnabled,
      config: ipLocationConfig,
      humanName: "IP Location",
      category: "location"
    },
    {
      type: "nearby-search",
      enabledFlag: nearbySearchEnabled,
      config: nearbySearchConfig,
      humanName: "Nearby Search",
      category: "location"
    },
    {
      type: "web3-research",
      enabledFlag: web3ResearchEnabled,
      config: web3ResearchConfig,
      humanName: "Web3 Research",
      category: "research"
    },
    {
      type: "doordash",
      enabledFlag: doorDashEnabled,
      config: doorDashConfig,
      humanName: "DoorDash",
      category: "delivery"
    },
    {
      type: "whatsapp",
      enabledFlag: whatsAppEnabled,
      config: whatsAppConfig,
      humanName: "WhatsApp",
      category: "communication"
    },
    {
      type: "github",
      enabledFlag: gitHubEnabled,
      config: gitHubConfig,
      humanName: "GitHub",
      category: "development"
    },
    {
      type: "airbnb",
      enabledFlag: airbnbEnabled,
      config: {},
      humanName: "Airbnb",
      category: "accommodation"
    },
    {
      type: "tavily",
      enabledFlag: tavilyEnabled,
      config: tavilyConfig,
      humanName: "Tavily",
      category: "research"
    },
    {
      type: "linkedin",
      enabledFlag: linkedInEnabled,
      config: linkedInConfig,
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

  const openWeatherDialog = () => {
    setServiceType("weather");
    setDialogOpen(true);
  };

  const openLocationDialog = () => {
    setServiceType("location");
    setDialogOpen(true);
  };

  const openNearbySearchDialog = () => {
    setServiceType("nearby-search");
    setDialogOpen(true);
  };

  const openWeb3ResearchDialog = () => {
    setServiceType("web3-research");
    setDialogOpen(true);
  };

  const openDoorDashDialog = () => {
    setServiceType("doordash");
    setDialogOpen(true);
  };

  const openWhatsAppDialog = () => {
    setServiceType("whatsapp");
    setDialogOpen(true);
  };

  const openGitHubDialog = () => {
    setServiceType("github");
    setDialogOpen(true);
  };

  const openIPLocationDialog = () => {
    setServiceType("ip-location");
    setDialogOpen(true);
  };

  const openWeatherForecastDialog = () => {
    setServiceType("weather-forecast");
    setDialogOpen(true);
  };

  const openAirbnbDialog = () => {
    setServiceType("airbnb");
    setDialogOpen(true);
  };

  const openTavilyDialog = () => {
    setServiceType("tavily");
    setDialogOpen(true);
  };

  const openLinkedInDialog = () => {
    setServiceType("linkedin");
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSaveDialog = async (data: Record<string, any>) => {
    switch (serviceType) {
      case "weather":
        setWeatherConfig(data);
        if (weatherEnabled) {
          const result = await initializeClient("weather");
          if (result.success) {
            toast.success("Weather service configuration updated successfully");
          }
        }
        break;
      case "weather-forecast":
        setWeatherForecastConfig(data);
        if (weatherForecastEnabled) {
          const result = await initializeClient("weather-forecast");
          if (result.success) {
            toast.success("Weather forecast service configuration updated successfully");
          }
        }
        break;
      case "location":
        setLocationConfig(data);
        if (locationEnabled) {
          const result = await initializeClient("location");
          if (result.success) {
            toast.success("Location service configuration updated successfully");
          }
        }
        break;
      case "nearby-search":
        setNearbySearchConfig(data);
        if (nearbySearchEnabled) {
          const result = await initializeClient("nearby-search");
          if (result.success) {
            toast.success("Nearby search service configuration updated successfully");
          }
        }
        break;
      case "web3-research":
        setWeb3ResearchConfig(data);
        if (web3ResearchEnabled) {
          const result = await initializeClient("web3-research");
          if (result.success) {
            toast.success("Web3 research service configuration updated successfully");
          }
        }
        break;
      case "doordash":
        setDoorDashConfig(data);
        if (doorDashEnabled) {
          const result = await initializeClient("doordash");
          if (result.success) {
            toast.success("DoorDash service configuration updated successfully");
          }
        }
        break;
      case "whatsapp":
        setWhatsAppConfig(data);
        if (whatsAppEnabled) {
          const result = await initializeClient("whatsapp");
          if (result.success) {
            toast.success("WhatsApp service configuration updated successfully");
          }
        }
        break;
      case "github":
        setGitHubConfig(data);
        if (gitHubEnabled) {
          const result = await initializeClient("github");
          if (result.success) {
            toast.success("GitHub service configuration updated successfully");
          }
        }
        break;
      case "ip-location":
        setIPLocationConfig(data);
        if (ipLocationEnabled) {
          const result = await initializeClient("ip-location");
          if (result.success) {
            toast.success("IP location service configuration updated successfully");
          }
        }
        break;
      case "airbnb":
        setAirbnbEnabled(true);
        const airbnbResult = await initializeClient("airbnb");
        if (airbnbResult.success) {
          toast.success("Airbnb service enabled successfully");
        }
        break;
      case "tavily":
        setTavilyConfig(data);
        if (tavilyEnabled) {
          const result = await initializeClient("tavily");
          if (result.success) {
            toast.success("Tavily service configuration updated successfully");
          }
        }
        break;
      case "linkedin":
        setLinkedInConfig(data);
        if (linkedInEnabled) {
          const result = await initializeClient("linkedin");
          if (result.success) {
            toast.success("LinkedIn service configuration updated successfully");
          }
        }
        break;
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

    if (weatherEnabled) await runInitialize("weather", "Weather");
    if (locationEnabled) await runInitialize("location", "Location");
    if (nearbySearchEnabled) await runInitialize("nearby-search", "Nearby search");
    if (web3ResearchEnabled) await runInitialize("web3-research", "Web3 research");
    if (doorDashEnabled) await runInitialize("doordash", "DoorDash");
    if (whatsAppEnabled) await runInitialize("whatsapp", "WhatsApp");
    if (gitHubEnabled) await runInitialize("github", "GitHub");
    if (ipLocationEnabled) await runInitialize("ip-location", "IP location");
    if (weatherForecastEnabled) await runInitialize("weather-forecast", "Weather forecast");
    if (airbnbEnabled) await runInitialize("airbnb", "Airbnb");
    if (tavilyEnabled) await runInitialize("tavily", "Tavily");
    if (linkedInEnabled) await runInitialize("linkedin", "LinkedIn");

    if (successCount > 0 && failCount === 0) {
      toast.success(`All services (${successCount}) initialized successfully`);
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(`${successCount} services initialized, ${failCount} failed`);
    }
  };

  const configureHandlers: Record<string, () => void> = {
    "weather": openWeatherDialog,
    "location": openLocationDialog,
    "nearby-search": openNearbySearchDialog,
    "web3-research": openWeb3ResearchDialog,
    "doordash": openDoorDashDialog,
    "whatsapp": openWhatsAppDialog,
    "github": openGitHubDialog,
    "ip-location": openIPLocationDialog,
    "weather-forecast": openWeatherForecastDialog,
    "airbnb": openAirbnbDialog,
    "tavily": openTavilyDialog,
    "linkedin": openLinkedInDialog
  };

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
          switch (serviceType) {
            case "weather": return weatherConfig;
            case "location": return locationConfig;
            case "nearby-search": return nearbySearchConfig;
            case "web3-research": return web3ResearchConfig;
            case "doordash": return doorDashConfig;
            case "whatsapp": return whatsAppConfig;
            case "github": return gitHubConfig;
            case "ip-location": return ipLocationConfig;
            case "weather-forecast": return weatherForecastConfig;
            case "airbnb": return {};
            case "tavily": return tavilyConfig;
            case "linkedin": return linkedInConfig;
            default: return {};
          }
        })()}
      />
    </Box>
  );
}

export default MCPSettings;
