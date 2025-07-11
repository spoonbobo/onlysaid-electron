import React from 'react';
import { Box, Button, Typography, Card, CardContent, Grid } from "@mui/material";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import { useThreeStore } from "@/renderer/stores/Avatar/ThreeStore";
import Avatar3DRender from "../3DRender";

function AvatarSelection() {
  const { setSelectedTopic, selectedContext } = useCurrentTopicContext();
  const { selectedModel, setSelectedModel, avatar3DModels } = useThreeStore();
  
  const handleCustomizeAppearance = () => {
    if (selectedContext?.section) {
      setSelectedTopic(selectedContext.section, 'design:appearance');
    }
  };
  
  const handleTestAnimations = () => {
    // TODO: Implement animation testing
    console.log('Test animations clicked');
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
  };

  return (
    <Box sx={{ height: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom align="center">
        Choose Your Avatar
      </Typography>
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        Select and customize your 3D avatar
      </Typography>

      <Grid container spacing={3}>
        {/* Avatar Preview */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>
                Preview
              </Typography>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Avatar3DRender 
                  width={350} 
                  height={350} 
                  enableControls={true}
                  autoRotate={true}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Avatar Selection */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Avatar Models
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                {avatar3DModels.map((model) => (
                  <Button
                    key={model.id}
                    variant={selectedModel === model.id ? 'contained' : 'outlined'}
                    onClick={() => handleModelSelect(model.id)}
                    sx={{ 
                      p: 2, 
                      justifyContent: 'flex-start',
                      textTransform: 'none'
                    }}
                  >
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="subtitle1">
                        {model.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {model.animations.length} animations available
                      </Typography>
                    </Box>
                  </Button>
                ))}
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button 
                  variant="contained" 
                  onClick={handleCustomizeAppearance} 
                  size="large"
                  fullWidth
                >
                  Customize Appearance
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={handleTestAnimations} 
                  size="large"
                  fullWidth
                >
                  Test Animations
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AvatarSelection; 