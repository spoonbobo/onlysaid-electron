import { Box, Typography, Card, CardContent, Button, Chip } from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";

function AvatarVoice() {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        <VolumeUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Voice Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure voice settings and speech preferences
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Voice Profile
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {['natural', 'professional', 'friendly'].map((voice) => (
              <Button
                key={voice}
                variant={voice === 'natural' ? 'contained' : 'outlined'}
                size="small"
              >
                {voice.charAt(0).toUpperCase() + voice.slice(1)}
              </Button>
            ))}
          </Box>

          <Typography variant="h6" sx={{ mb: 2 }}>
            Language
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {[
              { code: 'en-US', name: 'English (US)' },
              { code: 'en-GB', name: 'English (UK)' },
              { code: 'ja-JP', name: 'Japanese' },
              { code: 'zh-HK', name: 'Chinese (Hong Kong)' }
            ].map((lang) => (
              <Chip
                key={lang.code}
                label={lang.name}
                variant={lang.code === 'en-US' ? 'filled' : 'outlined'}
                color={lang.code === 'en-US' ? 'primary' : 'default'}
                clickable
              />
            ))}
          </Box>

          <Typography variant="h6" sx={{ mb: 2 }}>
            Speech Settings
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Speed: Normal
            </Typography>
            <Box sx={{ height: 8, bgcolor: 'grey.200', borderRadius: 1, position: 'relative' }}>
              <Box sx={{ width: '60%', height: '100%', bgcolor: 'primary.main', borderRadius: 1 }} />
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Pitch: Medium
            </Typography>
            <Box sx={{ height: 8, bgcolor: 'grey.200', borderRadius: 1, position: 'relative' }}>
              <Box sx={{ width: '50%', height: '100%', bgcolor: 'primary.main', borderRadius: 1 }} />
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary">
            More voice options coming soon
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

export default AvatarVoice; 