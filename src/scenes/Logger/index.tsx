import { Box, Typography } from "@mui/material";

function Logger() {
    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>
                Logger
            </Typography>
            <Typography>
                This is the Logger scene. Display logs or activity here.
            </Typography>
        </Box>
    );
}

export default Logger;