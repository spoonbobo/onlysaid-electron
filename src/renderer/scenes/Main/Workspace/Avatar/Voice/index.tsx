import React, { useState, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Divider,
  IconButton,
  LinearProgress,
  Alert
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DeleteIcon from "@mui/icons-material/Delete";

function AvatarVoice() {
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [recordingProgress, setRecordingProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const languages = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'zh-HK', name: 'Chinese (Hong Kong)' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'es-ES', name: 'Spanish' }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
    }
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingProgress(0);
    
    // Simulate recording progress
    const interval = setInterval(() => {
      setRecordingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRecording(false);
          return 100;
        }
        return prev + 2;
      });
    }, 100);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setRecordingProgress(0);
    // TODO: Handle actual recording stop and save
  };

  const handlePlayAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const handleDeleteAudio = () => {
    setAudioFile(null);
    setAudioUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          <VolumeUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Voice Setup
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure your avatar's voice by uploading audio or recording live
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        {/* Audio Setup Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              1. Setup Audio
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              {/* Upload Audio Button */}
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => fileInputRef.current?.click()}
                fullWidth
                sx={{ py: 2 }}
              >
                Upload WAV File
              </Button>
              
              {/* Record Audio Button */}
              <Button
                variant={isRecording ? "contained" : "outlined"}
                startIcon={isRecording ? <StopIcon /> : <MicIcon />}
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                fullWidth
                sx={{ py: 2 }}
                color={isRecording ? "error" : "primary"}
              >
                {isRecording ? "Stop Recording" : "Live Record"}
              </Button>
            </Box>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/wav,audio/wave"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            {/* Recording Progress */}
            {isRecording && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Recording... {Math.round(recordingProgress)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={recordingProgress} 
                  sx={{ height: 8, borderRadius: 1 }}
                />
              </Box>
            )}

            {/* Audio File Display */}
            {audioFile && (
              <Alert 
                severity="success" 
                sx={{ mb: 2 }}
                action={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton 
                      size="small" 
                      onClick={handlePlayAudio}
                      color="inherit"
                    >
                      <PlayArrowIcon />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={handleDeleteAudio}
                      color="inherit"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
              >
                <Typography variant="body2">
                  <strong>Audio ready:</strong> {audioFile.name}
                </Typography>
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary">
              Upload a WAV file or record your voice directly. The audio will be used to clone your avatar's voice.
            </Typography>
          </CardContent>
        </Card>

        <Divider sx={{ my: 3 }} />

        {/* Language Selection Section */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              2. Language Selection
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Primary Language</InputLabel>
              <Select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                label="Primary Language"
              >
                {languages.map((lang) => (
                  <MenuItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="body2" color="text.secondary">
              Select the primary language for your avatar's voice. This will affect pronunciation and speech patterns.
            </Typography>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button 
            variant="contained" 
            fullWidth
            size="large"
            disabled={!audioFile}
            sx={{ py: 1.5 }}
          >
            Generate Voice Profile
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default AvatarVoice; 