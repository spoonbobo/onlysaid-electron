import { Box, Typography, Divider } from "@mui/material";
import { FormattedMessage } from "react-intl";
import GenericServer from "./GenericServer";
import withReset from "./withReset";
import { IServiceItem } from "@/../../types/MCP/server";

// Create enhanced GenericServer with reset functionality
const EnhancedGenericServer = withReset(GenericServer, "");

interface ServersProps {
  services: IServiceItem[];
}

const Servers = ({ services }: ServersProps) => {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        <FormattedMessage id="settings.mcp.availableServers" />
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {services.map((service) => (
        <EnhancedGenericServer
          key={service.serverKey}
          serverKey={service.serverKey}
        />
      ))}
    </Box>
  );
};

export default Servers;
