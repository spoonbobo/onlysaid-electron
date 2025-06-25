import React from 'react';
import {
  Box,
  Paper,
  Typography,
} from '@mui/material';
import {
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { Assignment, MarkingScheme, KnowledgeBase } from './types';

interface Stats {
  totalStudents: number;
  submitted: number;
  pending: number;
  draft: number;
  graded: number;
  ungraded: number;
}

interface AssignmentInfoProps {
  assignment?: Assignment;
  currentMarkingScheme?: MarkingScheme;
  knowledgeBases: KnowledgeBase[];
  stats?: Stats;
}

export default function AssignmentInfo({
  assignment,
  currentMarkingScheme,
  knowledgeBases,
  stats
}: AssignmentInfoProps) {
  const intl = useIntl();

  if (!assignment) return null;

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="h6" gutterBottom color="text.primary">
          {assignment.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
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
      </Box>
      
      {currentMarkingScheme && (
        <Box 
          sx={{ 
            mt: 2, 
            p: 1.5, 
            bgcolor: 'action.hover', 
            borderRadius: 1,
            border: 1,
            borderColor: 'divider'
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <DescriptionIcon color="primary" fontSize="small" />
            <Box>
              <Typography variant="body2" fontWeight="medium" color="text.primary">
                {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.currentMarkingScheme', defaultMessage: 'Marking Scheme' })}: {currentMarkingScheme.fileName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {currentMarkingScheme.kbId 
                  ? `KB: ${knowledgeBases.find(kb => kb.id === currentMarkingScheme.kbId)?.name || 'Unknown'}`
                  : `${Math.round((currentMarkingScheme.fileSize || 0) / 1024)} KB`
                }
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
} 