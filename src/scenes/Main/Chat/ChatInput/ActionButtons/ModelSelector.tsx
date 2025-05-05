import { useState, useEffect } from "react";
import { Button, Menu, MenuItem, Typography, alpha } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { LLMService } from "@/service/llm";
import { useSelectedModelStore } from "@/stores/LLM/SelectedModelStore";
import { useIntl } from "react-intl";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";

const llmService = new LLMService();

interface ModelSelectorProps {
  disabled?: boolean;
}

export default function ModelSelector({ disabled = false }: ModelSelectorProps) {
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const { modelName, provider, modelId, setSelectedModel } = useSelectedModelStore();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);
  const intl = useIntl();
  const { parentId } = useCurrentTopicContext();

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    setMenuAnchor(null);
    loadModels();
  }, [parentId]);

  const loadModels = async () => {
    try {
      const models = await llmService.GetEnabledLLM();
      setAvailableModels(models);
      if (models.length > 0 && (!modelId || !provider)) {
        setSelectedModel(models[0].provider, models[0].id, models[0].name);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
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
      {availableModels.length > 0 ? (
        <Button
          variant="text"
          size="small"
          onClick={handleMenuOpen}
          disabled={disabled}
          sx={{
            minWidth: "auto",
            px: 1.5,
            borderRadius: "20px",
            color: "text.primary",
            fontSize: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            "&:hover": {
              bgcolor: theme => alpha(theme.palette.action.hover, 0.1)
            }
          }}
        >
          {modelName || "Select Model"}
          <ExpandMoreIcon fontSize="small" sx={{ width: 16, height: 16 }} />
        </Button>
      ) : (
        <Button
          variant="text"
          size="small"
          disabled
          sx={{
            minWidth: "auto",
            px: 1.5,
            borderRadius: "20px",
            color: "text.disabled",
            fontSize: "0.75rem",
            fontStyle: "italic",
            opacity: 0.7,
          }}
        >
          {intl.formatMessage({ id: "chat.noModelsEnabled" })}
        </Button>
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
      >
        {availableModels.length > 0 ? (
          availableModels.map((model) => (
            <MenuItem
              key={model.id}
              onClick={() => handleModelSelect(model)}
              selected={modelId === model.id && provider === model.provider}
            >
              <Typography variant="body2">{model.name}</Typography>
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>
            <Typography variant="body2" sx={{ maxWidth: 220 }}>
              {intl.formatMessage({ id: "chat.noModelsEnabled" })}
            </Typography>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}