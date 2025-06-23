import React from "react";
import {
  Box,
  Typography,
  Alert,
} from "@mui/material";

// This component is no longer needed since we only test OnlySaid KB
// Keeping as placeholder for backwards compatibility
const MCPDebug: React.FC = () => {
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100%',
      p: 3
    }}>
      <Alert severity="info">
        <Typography variant="h6">MCP Testing Removed</Typography>
        <Typography variant="body2">
          This component has been simplified to focus only on OnlySaid Knowledge Base testing.
        </Typography>
      </Alert>
    </Box>
  );
};

export default MCPDebug;
