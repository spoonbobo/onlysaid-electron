import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Description as DescriptionIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { Assignment, MarkingScheme, KnowledgeBase } from './types';

interface SubmissionStats {
  totalStudents: number;
  submitted: number;
  pending: number;
  draft: number;
}

interface AssignmentInfoProps {
  assignment?: Assignment;
  currentMarkingScheme?: MarkingScheme;
  knowledgeBases: KnowledgeBase[];
  submissionStats?: SubmissionStats;
}

export default function AssignmentInfo({
  assignment,
  currentMarkingScheme,
  knowledgeBases,
  submissionStats
}: AssignmentInfoProps) {
  const intl = useIntl();

  if (!assignment) return null;

  const submissionProgress = submissionStats ? 
    (submissionStats.submitted / submissionStats.totalStudents) * 100 : 0;

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom color="text.primary">
        {assignment.name}
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">
          {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.due', defaultMessage: 'Due' })}: {
            assignment.duedate 
              ? new Date(assignment.duedate * 1000).toLocaleDateString() 
              : intl.formatMessage({ id: 'workspace.insights.moodle.autograde.noDueDate', defaultMessage: 'No due date' })
          }
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.maxGrade', defaultMessage: 'Max Grade' })}: {
            assignment.grade || intl.formatMessage({ id: 'workspace.insights.moodle.autograde.notSet', defaultMessage: 'Not set' })
          }
        </Typography>
      </Box>

      {/* Submission Progress */}
      {submissionStats && submissionStats.totalStudents > 0 && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <PeopleIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" color="text.primary">
              {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.submissionProgress', defaultMessage: 'Submission Progress' })}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <LinearProgress 
              variant="determinate" 
              value={submissionProgress} 
              sx={{ 
                flex: 1, 
                height: 8, 
                borderRadius: 4,
                backgroundColor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                }
              }} 
            />
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 50 }}>
              {Math.round(submissionProgress)}%
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              icon={<CheckCircleIcon />}
              label={intl.formatMessage(
                { id: 'workspace.insights.moodle.autograde.submittedCount', defaultMessage: 'Submitted: {count}' },
                { count: submissionStats.submitted }
              )}
              size="small"
              color="success"
              variant="outlined"
            />
            <Chip
              icon={<ScheduleIcon />}
              label={intl.formatMessage(
                { id: 'workspace.insights.moodle.autograde.pendingCount', defaultMessage: 'Pending: {count}' },
                { count: submissionStats.pending }
              )}
              size="small"
              color="warning"
              variant="outlined"
            />
            {submissionStats.draft > 0 && (
              <Chip
                icon={<EditIcon />}
                label={intl.formatMessage(
                  { id: 'workspace.insights.moodle.autograde.draftCount', defaultMessage: 'Draft: {count}' },
                  { count: submissionStats.draft }
                )}
                size="small"
                color="info"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      )}
      
      {currentMarkingScheme && (
        <Box 
          sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: 'action.hover', 
            borderRadius: 1,
            border: 1,
            borderColor: 'divider'
          }}
        >
          <Typography variant="subtitle2" gutterBottom color="text.primary">
            {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.currentMarkingScheme', defaultMessage: 'Current Marking Scheme' })}
          </Typography>
          
          <Box display="flex" alignItems="center" gap={2}>
            <DescriptionIcon color="primary" />
            <Box>
              <Typography variant="body2" fontWeight="medium" color="text.primary">
                {currentMarkingScheme.fileName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {currentMarkingScheme.kbId 
                  ? `Knowledge Base: ${knowledgeBases.find(kb => kb.id === currentMarkingScheme.kbId)?.name || 'Unknown'}`
                  : `File Size: ${Math.round((currentMarkingScheme.fileSize || 0) / 1024)} KB`
                }
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
} 