import { Box, Typography } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { FormattedMessage } from "react-intl";

interface MenuDefaultProps {
  section?: string;
}

function MenuDefault({ section }: MenuDefaultProps) {
  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        p: 3
      }}
    >
      <MenuIcon
        sx={{
          fontSize: 32,
          color: "text.secondary",
          mb: 1
        }}
      />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        <FormattedMessage id="menu.noMenuAvailable" />
      </Typography>
    </Box>
  );
}

export default MenuDefault;
