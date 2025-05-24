import { Box, Button, FormControl, InputLabel, Select, MenuItem, Pagination, SelectChangeEvent, TextField, InputAdornment } from "@mui/material";
import { useState, useMemo } from "react";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import { useMCPSettingsStore } from "@/stores/MCP/MCPSettingsStore";
import Servers from "./Servers";
import { FormattedMessage } from "react-intl";
import { toast } from "@/utils/toast";
import SearchIcon from "@mui/icons-material/Search";
import { serverRegistry } from "./Registry/ServerRegistry";
import { IServiceItem } from "@/../../types/MCP/server";

function MCPSettings() {
  const {
    getAllConfiguredServers,
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

  const [searchTerm, setSearchTerm] = useState("");

  // Get current server states
  const allServers = getAllConfiguredServers();

  // Get all registered servers and create service configs dynamically
  const registeredServers = serverRegistry.getAll();

  // Get unique categories from registered servers
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    Object.values(registeredServers).forEach(server => {
      if (server.metadata.category) {
        categories.add(server.metadata.category);
      }
    });

    // Add legacy categories that might not be in registry yet
    const legacyCategories = ["delivery", "development", "accommodation", "communication"];
    legacyCategories.forEach(cat => categories.add(cat));

    return Array.from(categories).sort();
  }, [registeredServers]);

  const serviceCategories = [
    { value: "all", label: "All Services" },
    ...availableCategories.map(category => ({
      value: category,
      label: category.charAt(0).toUpperCase() + category.slice(1) + " Services"
    }))
  ];

  // Create service configs from registry
  const serviceConfigs = useMemo((): IServiceItem[] => {
    const configs: IServiceItem[] = [];

    // Add registered servers
    Object.entries(registeredServers).forEach(([serverKey, serverModule]) => {
      const serverState = allServers[serverKey];
      configs.push({
        serverKey,
        type: serverModule.metadata.id,
        enabledFlag: serverState?.enabled || false,
        config: serverState?.config || serverModule.defaultConfig,
        humanName: serverModule.metadata.title,
        category: serverModule.metadata.category || 'other',
        isRegistered: true,
        metadata: serverModule.metadata
      });
    });

    return configs;
  }, [registeredServers, allServers]);

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
                <FormattedMessage
                  id={`settings.mcp.category.${category.value}`}
                  defaultMessage={category.label}
                />
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

      <Servers services={getCurrentPageItems()} />

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
    </Box>
  );
}

export default MCPSettings;
