import React from 'react';
import { Box, Typography, Card, CardContent, Button, FormControl, InputLabel, Select, MenuItem, Slider, Switch, FormControlLabel, Grid } from "@mui/material";
import BrushIcon from "@mui/icons-material/Brush";
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
    setCameraSettings
  } = useThreeStore();
  
  const { setSelectedTopic, selectedContext } = useCurrentTopicContext();
  const currentModel = getModelById(selectedModel || 'alice-3d');
  
  const handleBackToSelection = () => {
    if (selectedContext?.section) {
      setSelectedTopic(selectedContext.section, '');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          variant="outlined" 
          onClick={handleBackToSelection}
          sx={{ mr: 2 }}
        >
          ← Back to Selection
        </Button>
        <Box>
          <Typography variant="h4" gutterBottom>
            Design Your Avatar
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Customize your 3D avatar's appearance and settings
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* 3D Avatar Preview */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: 500 }}>
            <CardContent sx={{ height: '100%', p: 1 }}>
              <Box sx={{ position: 'relative', height: '100%' }}>
                <Avatar3DRender 
                  width={undefined} 
                  height={480} 
                  showName={false} 
                  showPreviewText={false}
                  enableControls={true}
                  autoRotate={false}
                />
                {/* Live Edit Indicator */}
                <Box sx={{ 
                  position: 'absolute', 
                  top: 8, 
                  right: 8, 
                  bgcolor: 'success.main', 
                  color: 'white', 
                  px: 1, 
                  py: 0.5, 
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  ● LIVE
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Controls */}
        <Grid item xs={12} lg={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Appearance Settings */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  <BrushIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Appearance
                </Typography>
                
                {/* Skin Color */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Skin Color
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {['#F4C2A1', '#D4A574', '#C68642', '#8B4513', '#654321'].map((color) => (
                      <Box
                        key={color}
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: color,
                          cursor: 'pointer',
                          border: currentAppearance.skinColor === color ? 3 : 1,
                          borderColor: currentAppearance.skinColor === color ? 'primary.main' : 'grey.300',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => setAppearance({ skinColor: color })}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Hair Color */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Hair Color
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {['#8B4513', '#654321', '#FFD700', '#FF6347', '#000000'].map((color) => (
                      <Box
                        key={color}
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: color,
                          cursor: 'pointer',
                          border: currentAppearance.hairColor === color ? 3 : 1,
                          borderColor: currentAppearance.hairColor === color ? 'primary.main' : 'grey.300',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => setAppearance({ hairColor: color })}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Eye Color */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Eye Color
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {['#4A90E2', '#8B4513', '#228B22', '#808080', '#000000'].map((color) => (
                      <Box
                        key={color}
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: color,
                          cursor: 'pointer',
                          border: currentAppearance.eyeColor === color ? 3 : 1,
                          borderColor: currentAppearance.eyeColor === color ? 'primary.main' : 'grey.300',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => setAppearance({ eyeColor: color })}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Clothing Color */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Clothing Color
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {['#2E5BBA', '#228B22', '#DC143C', '#FF8C00', '#800080'].map((color) => (
                      <Box
                        key={color}
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: color,
                          cursor: 'pointer',
                          border: currentAppearance.clothingColor === color ? 3 : 1,
                          borderColor: currentAppearance.clothingColor === color ? 'primary.main' : 'grey.300',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => setAppearance({ clothingColor: color })}
                      />
                    ))}
                  </Box>
                </Box>

                <Button variant="outlined" onClick={resetAppearance} fullWidth>
                  Reset to Default
                </Button>
              </CardContent>
            </Card>

            {/* Animation Controls */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Animation
                </Typography>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Current Animation</InputLabel>
                  <Select
                    value={currentAnimation || ''}
                    onChange={(e) => setCurrentAnimation(e.target.value)}
                  >
                    {currentModel?.animations.map((anim) => (
                      <MenuItem key={anim} value={anim}>
                        {anim.charAt(0).toUpperCase() + anim.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography variant="body2" sx={{ mb: 1 }}>
                  Animation Speed: {animationSpeed.toFixed(1)}x
                </Typography>
                <Slider
                  value={animationSpeed}
                  onChange={(_, value) => setAnimationSpeed(value as number)}
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  sx={{ mb: 2 }}
                />
              </CardContent>
            </Card>

            {/* Rendering Settings */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Rendering Quality
                </Typography>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Quality</InputLabel>
                  <Select
                    value={renderQuality}
                    onChange={(e) => setRenderQuality(e.target.value as 'low' | 'medium' | 'high')}
                  >
                    <MenuItem value="low">Low (Better Performance)</MenuItem>
                    <MenuItem value="medium">Medium (Balanced)</MenuItem>
                    <MenuItem value="high">High (Best Quality)</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={enableShadows}
                      onChange={(e) => setEnableShadows(e.target.checked)}
                    />
                  }
                  label="Enable Shadows"
                  sx={{ mb: 1 }}
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
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AvatarDesign;
