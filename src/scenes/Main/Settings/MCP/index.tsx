/**
 * MCP Settings Component
 *
 * This component manages Model Context Protocol (MCP) server configurations.
 *
 * === Adding a New MCP Server ===
 *
 * 1. Create server component in Servers/{YourServerName}/ directory
 *
 * 2. Create dialog component in Dialogs/ directory
 *
 * 3. Update MCPStore.ts
 *
 * 4. Update this file (index.tsx)

 * 5. Update Servers/index.tsx
 */

import { Box, Button, FormControl, InputLabel, Select, MenuItem, Pagination, SelectChangeEvent, TextField, InputAdornment } from "@mui/material";
import { useEffect, useState } from "react";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import { useMCPPageStore } from "@/stores/MCP/MCPPageStore";
import Servers from "./Servers";
import ServiceDialog from "./Dialogs";
import { FormattedMessage } from "react-intl";
import { toast } from "@/utils/toast";
import SearchIcon from "@mui/icons-material/Search";

function MCPSettings() {
    // Get state and actions from MCP store
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

    // Get pagination state from page store
    const {
        page,
        itemsPerPage,
        selectedCategory,
        setPage,
        setItemsPerPage,
        setSelectedCategory
    } = useMCPPageStore();

    // Dialog state (not persisted)
    const [dialogOpen, setDialogOpen] = useState(false);
    const [serviceType, setServiceType] = useState("");

    // Search state
    const [searchTerm, setSearchTerm] = useState("");

    // Service categories
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

    // Service configuration map to connect service types with their config objects and state variables
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

    // Filter services based on selected category and search term
    const filteredServices = serviceConfigs
        .filter(service => selectedCategory === "all" || service.category === selectedCategory)
        .filter(service => searchTerm === "" ||
            service.humanName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.type.toLowerCase().includes(searchTerm.toLowerCase()));

    // Calculate total pages
    const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

    // Get current page items
    const getCurrentPageItems = () => {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredServices.slice(startIndex, endIndex);
    };

    // Handle page change
    const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
    };

    // Handle category filter change
    const handleCategoryChange = (event: SelectChangeEvent) => {
        setSelectedCategory(event.target.value);
    };

    // Handle items per page change
    const handleItemsPerPageChange = (event: SelectChangeEvent) => {
        setItemsPerPage(Number(event.target.value));
    };

    // Handle search term change
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(1); // Reset to first page when search changes
    };

    useEffect(() => {
        // Create an async function to handle initialization
        const initializeServices = async () => {
            for (const service of serviceConfigs) {
                if (service.enabledFlag) {
                    const result = await initializeClient(service.type);

                    if (!result.success) {
                        console.error(`Failed to initialize ${service.type} client:`, result.error);
                        toast.error(`${service.humanName} service error: ${result.error}`);

                        // Disable service on initialization failure
                        switch (service.type) {
                            case "weather": setWeatherEnabled(false); break;
                            case "location": setLocationEnabled(false); break;
                            case "ip-location": setIPLocationEnabled(false); break;
                            case "weather-forecast": setWeatherForecastEnabled(false); break;
                            case "nearby-search": setNearbySearchEnabled(false); break;
                            case "web3-research": setWeb3ResearchEnabled(false); break;
                            case "doordash": setDoorDashEnabled(false); break;
                            case "whatsapp": setWhatsAppEnabled(false); break;
                            case "github": setGitHubEnabled(false); break;
                            case "airbnb": setAirbnbEnabled(false); break;
                            case "tavily": setTavilyEnabled(false); break;
                            case "linkedin": setLinkedInEnabled(false); break;
                        }
                    } else {
                        toast.success(`${service.humanName} service initialized`);
                    }
                }
            }
        };

        initializeServices();
    }, [
        weatherEnabled, weatherConfig,
        locationEnabled, locationConfig,
        ipLocationEnabled, ipLocationConfig,
        nearbySearchEnabled, nearbySearchConfig,
        web3ResearchEnabled, web3ResearchConfig,
        doorDashEnabled, doorDashConfig,
        whatsAppEnabled, whatsAppConfig,
        gitHubEnabled, gitHubConfig,
        airbnbEnabled,
        weatherForecastEnabled, weatherForecastConfig,
        tavilyEnabled, tavilyConfig,
        linkedInEnabled, linkedInConfig,
        initializeClient
    ]);

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

    const handleSaveDialog = (data: Record<string, any>) => {
        switch (serviceType) {
            case "weather":
                setWeatherConfig(data);
                break;
            case "weather-forecast":
                setWeatherForecastConfig(data);
                break;
            case "location":
                setLocationConfig(data);
                break;
            case "nearby-search":
                setNearbySearchConfig(data);
                break;
            case "web3-research":
                setWeb3ResearchConfig(data);
                break;
            case "doordash":
                setDoorDashConfig(data);
                break;
            case "whatsapp":
                setWhatsAppConfig(data);
                break;
            case "github":
                setGitHubConfig(data);
                break;
            case "ip-location":
                setIPLocationConfig(data);
                break;
            case "weather-forecast":
                setWeatherForecastConfig(data);
                break;
            case "airbnb":
                setAirbnbEnabled(true);
                break;
            case "tavily":
                setTavilyConfig(data);
                break;
            case "linkedin":
                setLinkedInConfig(data);
                break;
        }
        setDialogOpen(false);
    };

    const handleSave = () => {
        // Manually re-initialize clients
        if (weatherEnabled) initializeClient("weather");
        if (locationEnabled) initializeClient("location");
        if (nearbySearchEnabled) initializeClient("nearby-search");
        if (web3ResearchEnabled) initializeClient("web3-research");
        if (doorDashEnabled) initializeClient("doordash");
        if (whatsAppEnabled) initializeClient("whatsapp");
        if (gitHubEnabled) initializeClient("github");
        if (ipLocationEnabled) initializeClient("ip-location");
        if (weatherForecastEnabled) initializeClient("weather-forecast");
        if (airbnbEnabled) initializeClient("airbnb");
        if (tavilyEnabled) initializeClient("tavily");
        if (linkedInEnabled) initializeClient("linkedin");
    };

    // Mapping of service types to their configure handlers
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
                                height: 40, // Match height with Select component
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
