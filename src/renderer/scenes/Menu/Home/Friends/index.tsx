import { Box } from "@mui/material";
import { FormattedMessage } from "react-intl";

export default function FriendsMenu() {
  return (
    <Box sx={{ mt: 2, px: 2 }}>
      <Box sx={{ mt: 2, pl: 4, py: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
        <FormattedMessage id="home.noFriends" defaultMessage="No friends found" />
      </Box>
    </Box>
  );
}
