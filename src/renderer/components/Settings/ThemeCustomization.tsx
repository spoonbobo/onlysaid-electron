import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Slider,
  Button,
  Paper,
  Divider,
  Alert,
  Collapse,
  IconButton,
} from '@mui/material';
import { ExpandMore, Refresh } from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';
import { debounce } from 'lodash';
import { useThemeStore } from '@/renderer/stores/Theme/ThemeStore';
import { toast } from '@/utils/toast';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  colorKey: string;
}

// Optimized ColorPicker that bypasses React state during rapid changes
const ColorPicker: React.FC<ColorPickerProps> = React.memo(({ label, value, onChange, colorKey }) => {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const isUpdatingRef = useRef(false);

  // Direct DOM update for immediate visual feedback
  const updateInputValues = useCallback((color: string) => {
    if (colorInputRef.current && !isUpdatingRef.current) {
      colorInputRef.current.value = color;
    }
    if (textInputRef.current && !isUpdatingRef.current) {
      textInputRef.current.value = color;
    }
  }, []);

  // Handle color input change with direct DOM manipulation
  const handleColorInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    isUpdatingRef.current = true;
    
    // Update the text input immediately via DOM
    if (textInputRef.current) {
      textInputRef.current.value = color;
    }
    
    // Call the onChange callback
    onChange(color);
    
    // Reset the flag after a brief delay
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 10);
  }, [onChange]);

  // Handle text input change
  const handleTextInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    isUpdatingRef.current = true;
    
    // Update the color input immediately via DOM
    if (colorInputRef.current) {
      colorInputRef.current.value = color;
    }
    
    // Call the onChange callback
    onChange(color);
    
    // Reset the flag after a brief delay
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 10);
  }, [onChange]);

  // Update inputs when value prop changes (from external state updates)
  React.useEffect(() => {
    updateInputValues(value);
  }, [value, updateInputValues]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      <Typography variant="body2" sx={{ minWidth: 100 }}>
        {label}
      </Typography>
      <input
        ref={colorInputRef}
        type="color"
        defaultValue={value}
        onChange={handleColorInputChange}
        style={{ 
          width: 40, 
          height: 40, 
          border: 'none', 
          borderRadius: 4,
          cursor: 'pointer'
        }}
      />
      <TextField
        size="small"
        defaultValue={value}
        onChange={handleTextInputChange}
        inputRef={textInputRef}
        sx={{ 
          width: 100,
          '& .MuiOutlinedInput-root': {
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(0, 0, 0, 0.23)'
            },
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(0, 0, 0, 0.23)'
              }
            }
          }
        }}
      />
    </Box>
  );
});

interface CollapsibleSectionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  children, 
  defaultExpanded = false 
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        mb: 1,
        '&:hover': {
          boxShadow: 'none'
        }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          cursor: 'pointer',
          userSelect: 'none'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Typography variant="subtitle1" sx={{ flex: 1 }}>
          {title}
        </Typography>
        <IconButton
          size="small"
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            '&:hover': {
              backgroundColor: 'transparent'
            }
          }}
        >
          <ExpandMore />
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ p: 2, pt: 0 }}>
          {children}
        </Box>
      </Collapse>
    </Paper>
  );
};

const ThemeCustomization: React.FC = () => {
  const {
    mode,
    customization,
    isCustomThemeEnabled,
    updateCustomization,
    setCustomThemeEnabled,
    resetToDefaults,
  } = useThemeStore();

  // Only store the base customization state - no frequent updates
  const [baseCustomization, setBaseCustomization] = useState(customization);
  const [isSaving, setIsSaving] = useState(false);

  // Refs to track current values without triggering re-renders
  const currentValuesRef = useRef(customization);
  const isActivelyChangingRef = useRef(false);

  // Debounced save function with longer delay for better performance
  const debouncedSave = useMemo(
    () => debounce((newCustomization: typeof customization) => {
      setIsSaving(true);
      updateCustomization(newCustomization);
      setBaseCustomization(newCustomization);
      
      // Reset active changing flag
      isActivelyChangingRef.current = false;
      
      // Hide saving indicator
      setTimeout(() => {
        setIsSaving(false);
      }, 200);
    }, 500), // Increased to 500ms for better batching
    [updateCustomization]
  );

  // Optimized color change handler that minimizes React updates
  const handleColorChange = useCallback((colorType: keyof typeof customization.colors.light, color: string) => {
    // Update the ref immediately
    const newCustomization = {
      ...currentValuesRef.current,
      colors: {
        ...currentValuesRef.current.colors,
        [mode]: {
          ...currentValuesRef.current.colors[mode],
          [colorType]: color,
        },
      },
    };
    
    currentValuesRef.current = newCustomization;
    isActivelyChangingRef.current = true;
    
    // Only trigger the debounced save, no React state update
    debouncedSave(newCustomization);
  }, [mode, debouncedSave]);

  const handleTypographyChange = useCallback((field: keyof typeof customization.typography, value: string | number) => {
    const newCustomization = {
      ...currentValuesRef.current,
      typography: {
        ...currentValuesRef.current.typography,
        [field]: value,
      },
    };
    
    currentValuesRef.current = newCustomization;
    isActivelyChangingRef.current = true;
    
    // For typography changes, we need to update React state for sliders/selects
    setBaseCustomization(newCustomization);
    debouncedSave(newCustomization);
  }, [debouncedSave]);

  const handleLayoutChange = useCallback((field: 'borderRadius' | 'spacing', value: number) => {
    const newCustomization = {
      ...currentValuesRef.current,
      [field]: value,
    };
    
    currentValuesRef.current = newCustomization;
    isActivelyChangingRef.current = true;
    
    // For layout changes, we need to update React state for sliders
    setBaseCustomization(newCustomization);
    debouncedSave(newCustomization);
  }, [debouncedSave]);

  const handleReset = useCallback(() => {
    // Cancel any pending saves
    debouncedSave.cancel();
    
    resetToDefaults();
    setBaseCustomization(customization);
    currentValuesRef.current = customization;
    isActivelyChangingRef.current = false;
    setIsSaving(false);
    toast.success('Theme reset to defaults');
  }, [resetToDefaults, customization, debouncedSave]);

  // Update base state when customization changes from store
  React.useEffect(() => {
    if (!isActivelyChangingRef.current) {
      setBaseCustomization(customization);
      currentValuesRef.current = customization;
    }
  }, [customization]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  // Use base customization for display (only updates when not actively changing)
  const currentColors = useMemo(() => baseCustomization.colors[mode], [baseCustomization.colors, mode]);

  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={isCustomThemeEnabled}
            onChange={(e) => setCustomThemeEnabled(e.target.checked)}
          />
        }
        label={<FormattedMessage id="settings.enableCustomTheme" />}
        sx={{ mb: 2 }}
      />

      {isCustomThemeEnabled && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <FormattedMessage id="settings.customThemeWarning" />
        </Alert>
      )}

      {/* Show saving indicator */}
      {isSaving && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            💾 Saving theme changes...
          </Typography>
        </Alert>
      )}

      <Box sx={{ opacity: isCustomThemeEnabled ? 1 : 0.5, pointerEvents: isCustomThemeEnabled ? 'auto' : 'none' }}>
        <CollapsibleSection 
          title={<FormattedMessage id="settings.colors" />}
          defaultExpanded
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <FormattedMessage 
              id="settings.colorsDescription" 
              values={{ mode: mode === 'light' ? 'Light' : 'Dark' }}
            />
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
            <Box sx={{ flex: 1 }}>
              <ColorPicker
                label="Primary"
                value={currentColors.primary}
                onChange={(color) => handleColorChange('primary', color)}
                colorKey="primary"
              />
              <ColorPicker
                label="Secondary"
                value={currentColors.secondary}
                onChange={(color) => handleColorChange('secondary', color)}
                colorKey="secondary"
              />
              <ColorPicker
                label="Error"
                value={currentColors.error}
                onChange={(color) => handleColorChange('error', color)}
                colorKey="error"
              />
              <ColorPicker
                label="Warning"
                value={currentColors.warning}
                onChange={(color) => handleColorChange('warning', color)}
                colorKey="warning"
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <ColorPicker
                label="Info"
                value={currentColors.info}
                onChange={(color) => handleColorChange('info', color)}
                colorKey="info"
              />
              <ColorPicker
                label="Success"
                value={currentColors.success}
                onChange={(color) => handleColorChange('success', color)}
                colorKey="success"
              />
              <ColorPicker
                label="Background"
                value={currentColors.background}
                onChange={(color) => handleColorChange('background', color)}
                colorKey="background"
              />
              <ColorPicker
                label="Paper"
                value={currentColors.paper}
                onChange={(color) => handleColorChange('paper', color)}
                colorKey="paper"
              />
            </Box>
          </Box>
        </CollapsibleSection>

        <CollapsibleSection title={<FormattedMessage id="settings.typography" />}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <FormattedMessage id="settings.fontFamily" />
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={baseCustomization.typography.fontFamily}
              onChange={(e) => handleTypographyChange('fontFamily', e.target.value)}
              slotProps={{
                select: {
                  native: true
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 0, 0, 0.23)'
                  },
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(0, 0, 0, 0.23)'
                    }
                  }
                }
              }}
            >
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Source Sans Pro">Source Sans Pro</option>
              <option value="Noto Serif HK">Noto Serif HK</option>
              <option value="Space Mono">Space Mono</option>
              <option value="Space Grotesk">Space Grotesk</option>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
            </TextField>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <FormattedMessage id="settings.fontSize" />: {baseCustomization.typography.fontSize}px
            </Typography>
            <Slider
              value={baseCustomization.typography.fontSize}
              onChange={(_, value) => handleTypographyChange('fontSize', value as number)}
              min={10}
              max={20}
              step={1}
              marks
              valueLabelDisplay="auto"
              sx={{
                '& .MuiSlider-thumb': {
                  '&:hover': {
                    boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)'
                  },
                  '&:focus': {
                    boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)'
                  }
                },
                '& .MuiSlider-track': {
                  '&:hover': {
                    boxShadow: 'none'
                  }
                }
              }}
            />
          </Box>
        </CollapsibleSection>

        <CollapsibleSection title={<FormattedMessage id="settings.layout" />}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <FormattedMessage id="settings.borderRadius" />: {baseCustomization.borderRadius}px
            </Typography>
            <Slider
              value={baseCustomization.borderRadius}
              onChange={(_, value) => handleLayoutChange('borderRadius', value as number)}
              min={0}
              max={20}
              step={1}
              marks
              valueLabelDisplay="auto"
              sx={{
                '& .MuiSlider-thumb': {
                  '&:hover': {
                    boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)'
                  },
                  '&:focus': {
                    boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)'
                  }
                },
                '& .MuiSlider-track': {
                  '&:hover': {
                    boxShadow: 'none'
                  }
                }
              }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <FormattedMessage id="settings.spacing" />: {baseCustomization.spacing}px
            </Typography>
            <Slider
              value={baseCustomization.spacing}
              onChange={(_, value) => handleLayoutChange('spacing', value as number)}
              min={4}
              max={16}
              step={1}
              marks
              valueLabelDisplay="auto"
              sx={{
                '& .MuiSlider-thumb': {
                  '&:hover': {
                    boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)'
                  },
                  '&:focus': {
                    boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)'
                  }
                },
                '& .MuiSlider-track': {
                  '&:hover': {
                    boxShadow: 'none'
                  }
                }
              }}
            />
          </Box>
        </CollapsibleSection>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleReset}
            color="error"
            sx={{
              '&:hover': {
                backgroundColor: 'transparent',
                borderColor: 'error.main',
                boxShadow: 'none'
              },
              '&:focus': {
                boxShadow: 'none'
              }
            }}
          >
            <FormattedMessage id="settings.resetTheme" />
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ThemeCustomization; 