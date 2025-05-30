import { useState, useEffect } from "react";
import { Chip, Menu, MenuItem, Typography, alpha } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { LLMService } from "@/service/ai";
import { useLLMConfigurationStore } from "@/renderer/stores/LLM/LLMConfiguration";
import { useIntl } from "react-intl";

const llmService = new LLMService();

interface ModelSelectorProps {
  disabled?: boolean;
}

export default function ModelSelector({ disabled = false }: ModelSelectorProps) {
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const { modelName, provider, modelId, setSelectedModel, aiMode } = useLLMConfigurationStore();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);
  const intl = useIntl();

  // Check if model selection should be disabled based on AI mode
  const isDisabled = disabled || aiMode === "none";

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const models = await llmService.GetEnabledLLM();
      setAvailableModels(models);
      if (models.length > 0 && (modelId === undefined || provider === undefined) && aiMode !== "none") {
        setSelectedModel(models[0].provider, models[0].id, models[0].name);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isDisabled) return;
    loadModels();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleModelSelect = (model: any) => {
    setSelectedModel(model.provider, model.id, model.name);
    handleMenuClose();
  };

  return (
    <>
      {aiMode === "none" ? (
        <Chip
          label="None"
          disabled
          size="small"
          variant="outlined"
          sx={{
            height: 24,
            fontSize: "0.75rem",
            fontStyle: "italic",
            opacity: 0.7,
            borderColor: "transparent"
          }}
        />
      ) : availableModels.length > 0 ? (
        <Chip
          label={modelName || "Select Model"}
          onClick={handleMenuOpen}
          disabled={isDisabled}
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
      ) : (
        <Chip
          label={intl.formatMessage({ id: "chat.noModelsEnabled" })}
          disabled
          size="small"
          variant="outlined"
          sx={{
            height: 24,
            fontSize: "0.75rem",
            fontStyle: "italic",
            opacity: 0.7,
            borderColor: "transparent"
          }}
        />
      )}

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
          sx: { minWidth: 150 }
        }}
      >
        {availableModels.length > 0 ? (
          [
            <MenuItem
              key="none-option"
              onClick={() => setSelectedModel(null, null, "None")}
              selected={!modelId && !provider}
              dense
            >
              <Typography variant="body2">None</Typography>
            </MenuItem>,
            <MenuItem
              key="divider"
              sx={{ borderTop: 1, borderColor: 'divider', my: 0.5 }}
              disabled
              dense
            >
              <Typography variant="caption" color="text.secondary">Models</Typography>
            </MenuItem>,
            ...availableModels.map((model) => (
              <MenuItem
                key={model.id}
                onClick={() => handleModelSelect(model)}
                selected={modelId === model.id && provider === model.provider}
                dense
              >
                <Typography variant="body2">{model.name}</Typography>
              </MenuItem>
            ))
          ]
        ) : (
          <MenuItem disabled dense>
            <Typography variant="body2" sx={{ maxWidth: 220 }}>
              {intl.formatMessage({ id: "chat.noModelsEnabled" })}
            </Typography>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
