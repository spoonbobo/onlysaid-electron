import { Box, Typography } from "@mui/material";
import { useIntl } from "react-intl";
import { useUserStore } from "@/renderer/stores/User/UserStore";

function Welcome() {
  const intl = useIntl();
  const user = useUserStore(state => state.user);

  return (
    <Box sx={{ 
      mb: 3, 
      textAlign: 'left'
    }}>
      <Typography 
        variant="h6" 
        component="h1" 
        sx={{ 
          color: 'text.primary',
          fontWeight: 'bold'
        }}
      >
        {intl.formatMessage(
          { id: 'homepage.welcome', defaultMessage: 'Welcome message, {username}' },
          { username: user?.username || 'User' }
        )}
      </Typography>
    </Box>
  );
}

export default Welcome;
