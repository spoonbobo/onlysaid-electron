import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useIntl } from 'react-intl';

interface FeedbackDetailProps {
  open: boolean;
  onClose: () => void;
  studentName: string;
  assignmentName?: string;
  feedback: string;
  aiGrade?: string;
  currentGrade?: string;
  maxGrade?: number | string;
}

export default function FeedbackDetail({
  open,
  onClose,
  studentName,
  assignmentName,
  feedback,
  aiGrade,
  currentGrade,
  maxGrade
}: FeedbackDetailProps) {
  const intl = useIntl();

  // Helper function to format scores to 1 decimal place
  const formatScore = (score: string | number | undefined | null): string => {
    if (score === undefined || score === null || score === '') return '';
    const numScore = typeof score === 'string' ? parseFloat(score) : score;
    if (isNaN(numScore) || numScore < 0) return ''; // Handle -1 and other negative values
    return numScore.toFixed(1);
  };

  // Helper function to check if a grade is valid
  const isValidGrade = (score: string | number | undefined | null): boolean => {
    if (score === undefined || score === null || score === '') return false;
    const numScore = typeof score === 'string' ? parseFloat(score) : score;
    return !isNaN(numScore) && numScore >= 0;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '400px',
          maxHeight: '80vh',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Typography variant="h6" component="div">
          {intl.formatMessage(
            { id: 'workspace.insights.moodle.autograde.feedbackDetail.title', defaultMessage: 'Feedback Details' }
          )}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: 'grey.500' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 2 }}>
        {/* Student and Assignment Info */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="subtitle1" fontWeight="medium">
              {studentName}
            </Typography>
          </Box>
          
          {assignmentName && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AssignmentIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="subtitle2" color="text.secondary">
                {assignmentName}
              </Typography>
            </Box>
          )}

          {/* Grade Information */}
          {(aiGrade || currentGrade) && (
            <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
              {aiGrade && isValidGrade(aiGrade) && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.table.aiGrade', defaultMessage: 'AI Grade' })}
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" color="secondary.main">
                    {formatScore(aiGrade)}{isValidGrade(maxGrade) ? ` / ${formatScore(maxGrade)}` : ''}
                  </Typography>
                </Box>
              )}
              
              {currentGrade && isValidGrade(currentGrade) && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.table.currentGrade', defaultMessage: 'Current Grade' })}
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" color="primary.main">
                    {formatScore(currentGrade)}{isValidGrade(maxGrade) ? ` / ${formatScore(maxGrade)}` : ''}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Feedback Content */}
        <Box>
          <Typography variant="subtitle2" gutterBottom color="text.primary">
            {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.table.feedback', defaultMessage: 'Feedback' })}
          </Typography>
          
          <Box sx={{ 
            bgcolor: 'action.hover', 
            p: 2, 
            borderRadius: 1,
            minHeight: '200px',
            maxHeight: '400px',
            overflow: 'auto'
          }}>
            {feedback ? (
              <Typography 
                variant="body2" 
                component="div"
                sx={{ 
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                  color: 'text.primary'
                }}
              >
                {feedback}
              </Typography>
            ) : (
              <Typography 
                variant="body2" 
                color="text.secondary"
                fontStyle="italic"
              >
                {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.noFeedback', defaultMessage: 'No feedback' })}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Character count */}
        {feedback && (
          <Box sx={{ mt: 1, textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">
              {intl.formatMessage(
                { 
                  id: 'workspace.insights.moodle.autograde.feedbackDetail.characterCount', 
                  defaultMessage: '{count} characters' 
                },
                { count: feedback.length }
              )}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained">
          {intl.formatMessage({ id: 'common.close', defaultMessage: 'Close' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
