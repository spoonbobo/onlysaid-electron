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
import { Assignment, MarkingScheme, KnowledgeBase, StudentSubmissionData } from './types';

interface Stats {
  totalStudents: number;
  submitted: number;
  pending: number;
  draft: number;
  graded: number;
  ungraded: number;
}

interface GradeStats {
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
}

interface AssignmentInfoProps {
  assignment?: Assignment;
  currentMarkingScheme?: MarkingScheme;
  knowledgeBases: KnowledgeBase[];
  stats?: Stats;
  studentData?: StudentSubmissionData[];
}

const calculateGradeStats = (studentData: StudentSubmissionData[]): GradeStats => {
  // Extract valid grades (non-empty, non-zero currentGrade values)
  const validGrades = studentData
    .map(data => {
      const grade = parseFloat(data.currentGrade);
      return isNaN(grade) || grade === 0 ? null : grade;
    })
    .filter((grade): grade is number => grade !== null);

  if (validGrades.length === 0) {
    return { min: null, max: null, mean: null, median: null };
  }

  // Calculate statistics
  const min = Math.min(...validGrades);
  const max = Math.max(...validGrades);
  const mean = validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length;
  
  // Calculate median
  const sortedGrades = [...validGrades].sort((a, b) => a - b);
  const median = sortedGrades.length % 2 === 0
    ? (sortedGrades[sortedGrades.length / 2 - 1] + sortedGrades[sortedGrades.length / 2]) / 2
    : sortedGrades[Math.floor(sortedGrades.length / 2)];

  return {
    min: Math.round(min * 10) / 10,
    max: Math.round(max * 10) / 10,
    mean: Math.round(mean * 10) / 10,
    median: Math.round(median * 10) / 10
  };
};

export default function AssignmentInfo({
  assignment,
  currentMarkingScheme,
  knowledgeBases,
  stats,
  studentData = []
}: AssignmentInfoProps) {
  const intl = useIntl();

  if (!assignment) return null;

  const gradeStats = calculateGradeStats(studentData);

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" color="text.primary">
            {assignment.name}
          </Typography>
          
          {/* Grade Statistics - Compact inline display */}
          {studentData.length > 0 && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                Stats:
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Min: {gradeStats.min !== null ? gradeStats.min : 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Max: {gradeStats.max !== null ? gradeStats.max : 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Mean: {gradeStats.mean !== null ? gradeStats.mean : 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Median: {gradeStats.median !== null ? gradeStats.median : 'N/A'}
              </Typography>
            </Box>
          )}
        </Box>
        
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