import React from 'react';
import { Box, Typography, Card, CardContent, Button, FormControl, InputLabel, Select, MenuItem, Slider, Switch, FormControlLabel, Stack, Chip, Divider } from "@mui/material";
import BrushIcon from "@mui/icons-material/Brush";
import AnimationIcon from "@mui/icons-material/Animation";
import SettingsIcon from "@mui/icons-material/Settings";
import WallpaperIcon from "@mui/icons-material/Wallpaper";
import { useThreeStore } from "@/renderer/stores/Avatar/ThreeStore";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import Avatar3DRender from "../3DRender";

function AvatarDesign() {
  const { 
    currentAppearance, 
    setAppearance,
    resetAppearance,
    selectedModel,
    getModelById,
    currentAnimation,
    setCurrentAnimation,
    animationSpeed,
    setAnimationSpeed,
    renderQuality,
    setRenderQuality,
    enableShadows,
    setEnableShadows,
    enableAntialiasing,
    setEnableAntialiasing,
    cameraSettings,
    setCameraSettings,
    sceneSettings,
    setSceneSettings
  } = useThreeStore();
  
  const currentModel = getModelById(selectedModel || 'alice-3d');

  const colorSections = [
    {
      title: 'Skin Color',
      colors: ['#F4C2A1', '#D4A574', '#C68642', '#8B4513', '#654321'],
      currentColor: currentAppearance.skinColor,
      onChange: (color: string) => setAppearance({ skinColor: color })
    },
    {
      title: 'Hair Color',
      colors: ['#8B4513', '#654321', '#FFD700', '#FF6347', '#000000'],
      currentColor: currentAppearance.hairColor,
      onChange: (color: string) => setAppearance({ hairColor: color })
    },
    {
      title: 'Eye Color',
      colors: ['#4A90E2', '#8B4513', '#228B22', '#808080', '#000000'],
      currentColor: currentAppearance.eyeColor,
      onChange: (color: string) => setAppearance({ eyeColor: color })
    },
    {
      title: 'Clothing Color',
      colors: ['#2E5BBA', '#228B22', '#DC143C', '#FF8C00', '#800080'],
      currentColor: currentAppearance.clothingColor,
      onChange: (color: string) => setAppearance({ clothingColor: color })
    }
  ];

  const backgroundPresets = [
    { value: 'city', label: 'City' },
    { value: 'dawn', label: 'Dawn' },
    { value: 'forest', label: 'Forest' },
    { value: 'lobby', label: 'Lobby' },
    { value: 'night', label: 'Night' },
    { value: 'park', label: 'Park' },
    { value: 'studio', label: 'Studio' },
    { value: 'sunset', label: 'Sunset' },
    { value: 'warehouse', label: 'Warehouse' }
  ];

  const gradientColors = [
    { start: '#e3f2fd', end: '#bbdefb', name: 'Sky Blue' },
    { start: '#f3e5f5', end: '#e1bee7', name: 'Lavender' },
    { start: '#e8f5e8', end: '#c8e6c9', name: 'Mint Green' },
    { start: '#fff3e0', end: '#ffcc80', name: 'Sunset Orange' },
    { start: '#fce4ec', end: '#f8bbd9', name: 'Pink Blush' },
    { start: '#f1f8e9', end: '#dcedc8', name: 'Nature Green' },
    { start: '#e0f2f1', end: '#b2dfdb', name: 'Ocean Teal' },
    { start: '#f9fbe7', end: '#f0f4c3', name: 'Warm Yellow' }
  ];

  const solidColors = [
    '#ffffff', '#f5f5f5', '#eeeeee', '#e0e0e0',
    '#bbdefb', '#c8e6c9', '#ffcc80', '#f8bbd9',
    '#b39ddb', '#80cbc4', '#fff176', '#ffab91'
  ];

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Design Your Avatar
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Customize your 3D avatar's appearance and environment
        </Typography>
      </Box>

      {/* Main Content */}
      <Box sx={{ 
        display: 'flex', 
        gap: 3, 
        flexDirection: { xs: 'column', lg: 'row' },
        height: 'calc(100% - 100px)'
      }}>
        {/* 3D Avatar Preview */}
        <Box sx={{ 
          flex: { xs: 'none', lg: '1 1 45%' },
          minHeight: { xs: 400, lg: 'auto' }
        }}>
          <Card sx={{ 
            height: '100%',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <CardContent sx={{ height: '100%', p: 1, position: 'relative' }}>
              <Avatar3DRender 
                width={undefined} 
                height={undefined}
                showName={false} 
                showPreviewText={false}
                enableControls={true}
                autoRotate={false}
              />
              {/* Live Edit Indicator */}
              <Chip
                label="LIVE PREVIEW"
                size="small"
                color="success"
                sx={{ 
                  position: 'absolute', 
                  top: 16, 
                  right: 16,
                  fontWeight: 'bold',
                  '& .MuiChip-label': {
                    px: 1
                  }
                }}
              />
            </CardContent>
          </Card>
        </Box>

        {/* Controls Panel */}
        <Box sx={{ 
          flex: { xs: 'none', lg: '1 1 55%' },
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflow: 'auto'
        }}>
          {/* Background Settings */}
          <Card sx={{ 
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 2
          }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                <WallpaperIcon color="primary" />
                <Typography variant="h6">
                  Background & Environment
                </Typography>
              </Stack>
              
              <Stack spacing={3}>
                <FormControl fullWidth>
                  <InputLabel>Background Type</InputLabel>
                  <Select
                    value={sceneSettings.backgroundType}
                    onChange={(e) => setSceneSettings({ backgroundType: e.target.value as any })}
                    label="Background Type"
                  >
                    <MenuItem value="solid">Solid Color</MenuItem>
                    <MenuItem value="gradient">Gradient</MenuItem>
                    <MenuItem value="environment">3D Environment</MenuItem>
                  </Select>
                </FormControl>

                {sceneSettings.backgroundType === 'solid' && (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                      Background Color
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {solidColors.map((color) => (
                        <Box
                          key={color}
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1,
                            bgcolor: color,
                            cursor: 'pointer',
                            border: sceneSettings.backgroundColor === color ? 3 : 1,
                            borderColor: sceneSettings.backgroundColor === color ? 'primary.main' : 'grey.300',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              transform: 'scale(1.1)',
                              boxShadow: 2
                            }
                          }}
                          onClick={() => setSceneSettings({ backgroundColor: color })}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                {sceneSettings.backgroundType === 'gradient' && (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                      Gradient Presets
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {gradientColors.map((gradient) => (
                        <Box
                          key={gradient.name}
                          sx={{
                            width: 60,
                            height: 40,
                            borderRadius: 1,
                            background: `linear-gradient(135deg, ${gradient.start} 0%, ${gradient.end} 100%)`,
                            cursor: 'pointer',
                            border: sceneSettings.gradientColors?.start === gradient.start ? 3 : 1,
                            borderColor: sceneSettings.gradientColors?.start === gradient.start ? 'primary.main' : 'grey.300',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              transform: 'scale(1.05)',
                              boxShadow: 2
                            }
                          }}
                          onClick={() => setSceneSettings({ 
                            gradientColors: { 
                              start: gradient.start, 
                              end: gradient.end, 
                              direction: 'vertical' 
                            } 
                          })}
                        />
                      ))}
                    </Stack>
                    
                    <FormControl fullWidth sx={{ mt: 2 }}>
                      <InputLabel>Gradient Direction</InputLabel>
                      <Select
                        value={sceneSettings.gradientColors?.direction || 'vertical'}
                        onChange={(e) => setSceneSettings({ 
                          gradientColors: { 
                            ...sceneSettings.gradientColors!, 
                            direction: e.target.value as any 
                          } 
                        })}
                        label="Gradient Direction"
                      >
                        <MenuItem value="vertical">Vertical</MenuItem>
                        <MenuItem value="horizontal">Horizontal</MenuItem>
                        <MenuItem value="diagonal">Diagonal</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                )}

                {sceneSettings.backgroundType === 'environment' && (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                      Environment Preset
                    </Typography>
                    <FormControl fullWidth>
                      <Select
                        value={sceneSettings.environmentPreset || 'city'}
                        onChange={(e) => setSceneSettings({ environmentPreset: e.target.value as any })}
                        displayEmpty
                      >
                        {backgroundPresets.map((preset) => (
                          <MenuItem key={preset.value} value={preset.value}>
                            {preset.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                )}

                <Divider />

                {/* Grid Settings */}
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={sceneSettings.grid?.enabled || false}
                        onChange={(e) => setSceneSettings({ 
                          grid: { 
                            ...sceneSettings.grid!, 
                            enabled: e.target.checked 
                          } 
                        })}
                      />
                    }
                    label="Show Floor Grid"
                  />
                  
                  {sceneSettings.grid?.enabled && (
                    <Stack spacing={2} sx={{ mt: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                          Grid Size: {sceneSettings.grid.size}
                        </Typography>
                        <Slider
                          value={sceneSettings.grid.size}
                          onChange={(_, value) => setSceneSettings({ 
                            grid: { 
                              ...sceneSettings.grid!, 
                              size: value as number 
                            } 
                          })}
                          min={5}
                          max={50}
                          step={5}
                          valueLabelDisplay="auto"
                        />
                      </Box>
                    </Stack>
                  )}
                </Box>

                {/* Fog Settings */}
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!sceneSettings.fog}
                        onChange={(e) => setSceneSettings({ 
                          fog: e.target.checked ? { 
                            color: '#f0f0f0', 
                            near: 10, 
                            far: 50 
                          } : undefined 
                        })}
                      />
                    }
                    label="Enable Atmospheric Fog"
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card sx={{ 
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 2
          }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                <BrushIcon color="primary" />
                <Typography variant="h6">
                  Appearance
                </Typography>
              </Stack>
              
              <Stack spacing={3}>
                {colorSections.map((section) => (
                  <Box key={section.title}>
                    <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                      {section.title}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      {section.colors.map((color) => (
                        <Box
                          key={color}
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2,
                            bgcolor: color,
                            cursor: 'pointer',
                            border: section.currentColor === color ? 3 : 2,
                            borderColor: section.currentColor === color ? 'primary.main' : 'grey.300',
                            transition: 'all 0.2s ease-in-out',
                            boxShadow: section.currentColor === color ? 2 : 1,
                            '&:hover': {
                              transform: 'scale(1.1)',
                              boxShadow: 3
                            }
                          }}
                          onClick={() => section.onChange(color)}
                        />
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>

              <Button 
                variant="outlined" 
                onClick={resetAppearance} 
                fullWidth
                sx={{ mt: 3 }}
              >
                Reset to Default
              </Button>
            </CardContent>
          </Card>

          {/* Animation Controls */}
          <Card sx={{ 
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 2
          }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                <AnimationIcon color="primary" />
                <Typography variant="h6">
                  Animation
                </Typography>
              </Stack>
              
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Current Animation</InputLabel>
                  <Select
                    value={currentAnimation || ''}
                    onChange={(e) => setCurrentAnimation(e.target.value)}
                    label="Current Animation"
                  >
                    {currentModel?.animations.map((anim) => (
                      <MenuItem key={anim} value={anim}>
                        {anim.charAt(0).toUpperCase() + anim.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    Animation Speed: {animationSpeed.toFixed(1)}x
                  </Typography>
                  <Slider
                    value={animationSpeed}
                    onChange={(_, value) => setAnimationSpeed(value as number)}
                    min={0.1}
                    max={3.0}
                    step={0.1}
                    valueLabelDisplay="auto"
                    sx={{ 
                      '& .MuiSlider-thumb': {
                        width: 20,
                        height: 20
                      }
                    }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Rendering Settings */}
          <Card sx={{ 
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 2
          }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                <SettingsIcon color="primary" />
                <Typography variant="h6">
                  Rendering Quality
                </Typography>
              </Stack>
              
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Quality Level</InputLabel>
                  <Select
                    value={renderQuality}
                    onChange={(e) => setRenderQuality(e.target.value as 'low' | 'medium' | 'high')}
                    label="Quality Level"
                  >
                    <MenuItem value="low">Low (Better Performance)</MenuItem>
                    <MenuItem value="medium">Medium (Balanced)</MenuItem>
                    <MenuItem value="high">High (Best Quality)</MenuItem>
                  </Select>
                </FormControl>

                <Stack spacing={1}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={enableShadows}
                        onChange={(e) => setEnableShadows(e.target.checked)}
                      />
                    }
                    label="Enable Shadows"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={enableAntialiasing}
                        onChange={(e) => setEnableAntialiasing(e.target.checked)}
                      />
                    }
                    label="Enable Antialiasing"
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}

export default AvatarDesign;
