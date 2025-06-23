import React from "react";
import {
  Box,
  Typography,
  Stack,
} from "@mui/material";
import {
  MenuBook as MenuBookIcon,
} from "@mui/icons-material";
import KBDebug from "./KBDebug";

const Playground = () => {
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
                Knowledge Base Testing
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                OnlySaid KB Query Interface
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Info */}
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Test your OnlySaid Knowledge Base queries and document retrieval
          </Typography>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default' }}>
        <KBDebug />
      </Box>
    </Box>
  );
};

export default Playground;