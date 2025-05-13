import { useState } from "react";
import { Button, Menu, MenuItem, Typography, alpha, Chip } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useIntl } from "react-intl";
import { useLLMConfigurationStore } from "@/stores/LLM/LLMConfiguration";

interface AIModeProps {
  disabled?: boolean;
}

export default function AIMode({ disabled = false }: AIModeProps) {
  const { aiMode, setAIMode } = useLLMConfigurationStore();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);
  const intl = useIntl();

  const handleMenuOpen = (event: React.MouseEvent<HTMLDivElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleModeSelect = (newMode: "none" | "ask" | "agent") => {
    setAIMode(newMode);
    handleMenuClose();
  };

  // Get display text based on current mode
  const getModeDisplayText = () => {
    if (aiMode === "none") return intl.formatMessage({ id: "chat.mode.none" }) || "Not using AI";
    if (aiMode === "ask") return intl.formatMessage({ id: "chat.mode.ask" }) || "Ask";
    return intl.formatMessage({ id: "chat.mode.agent" }) || "Agent";
  };

  return (
    <>
      <Chip
        label={getModeDisplayText()}
        onClick={handleMenuOpen}
        disabled={disabled}
        deleteIcon={<ExpandMoreIcon fontSize="small" />}
        onDelete={handleMenuOpen}
        size="small"
        variant="outlined"
        sx={{
          height: 24,
          fontSize: "0.75rem",
          fontWeight: 500,
          borderColor: "transparent",
          color: "text.primary",
          "& .MuiChip-deleteIcon": {
            margin: 0,
            color: "text.secondary"
          }
        }}
      />

      <Menu
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        PaperProps={{
          elevation: 2,
          sx: { minWidth: 120 }
        }}
      >
        <MenuItem
          onClick={() => handleModeSelect("none")}
          selected={aiMode === "none"}
          dense
        >
          <Typography variant="body2">{intl.formatMessage({ id: "chat.mode.none" }) || "Not using AI"}</Typography>
        </MenuItem>
        <MenuItem
          onClick={() => handleModeSelect("ask")}
          selected={aiMode === "ask"}
          dense
        >
          <Typography variant="body2">{intl.formatMessage({ id: "chat.mode.ask" })}</Typography>
        </MenuItem>
        <MenuItem
          onClick={() => handleModeSelect("agent")}
          selected={aiMode === "agent"}
          dense
        >
          <Typography variant="body2">{intl.formatMessage({ id: "chat.mode.agent" })}</Typography>
        </MenuItem>
      </Menu>
    </>
  );
}
