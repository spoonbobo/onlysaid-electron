import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
} from '@mui/material';
import { useIntl } from 'react-intl';
import { Assignment, KnowledgeBase } from './types';

interface SubmissionStats {
  totalStudents: number;
  submitted: number;
  pending: number;
  draft: number;
}

interface AssignmentSelectorProps {
  assignments: Assignment[];
  selectedAssignment: string;
  onAssignmentChange: (assignmentId: string) => void;
  knowledgeBases: KnowledgeBase[];
  selectedKbId: string;
  onKbChange: (kbId: string) => void;
  loadingKBs: boolean;
  submissionStats?: SubmissionStats;
}

export default function AssignmentSelector({
  assignments,
  selectedAssignment,
  onAssignmentChange,
  knowledgeBases,
  selectedKbId,
  onKbChange,
  loadingKBs,
  submissionStats
}: AssignmentSelectorProps) {
  const intl = useIntl();

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <FormControl fullWidth sx={{ flex: 1 }}>
          <InputLabel sx={{ color: 'text.primary' }}>
            {intl.formatMessage({ id: "workspace.insights.moodle.autograde.selectAssignment", defaultMessage: "Select Assignment" })}
          </InputLabel>
          <Select
            value={selectedAssignment}
            onChange={(e) => onAssignmentChange(e.target.value)}
            label="Select Assignment"
            sx={{ 
              '& .MuiSelect-select': { 
                color: 'text.primary' 
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'divider'
              }
            }}
          >
            {assignments.map((assignment) => (
              <MenuItem 
                key={assignment.id} 
                value={assignment.id}
                sx={{ 
                  color: 'text.primary',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                {assignment.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl fullWidth sx={{ flex: 1 }}>
          <InputLabel sx={{ color: 'text.primary' }}>
            {intl.formatMessage({ id: "workspace.insights.moodle.autograde.selectKB", defaultMessage: "Select Knowledge Base" })}
          </InputLabel>
          <Select
            value={selectedKbId}
            onChange={(e) => onKbChange(e.target.value)}
            label="Select Knowledge Base"
            disabled={loadingKBs}
            sx={{ 
              '& .MuiSelect-select': { 
                color: 'text.primary' 
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'divider'
              }
            }}
          >
            {knowledgeBases.map((kb) => (
              <MenuItem 
                key={kb.id} 
                value={kb.id}
                sx={{ 
                  color: 'text.primary',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                {kb.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Submission Statistics */}
      {submissionStats && submissionStats.totalStudents > 0 && (
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          alignItems: 'center', 
          flexWrap: 'wrap',
          p: 2,
          bgcolor: 'action.hover',
          borderRadius: 1,
          border: 1,
          borderColor: 'divider'
        }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            {intl.formatMessage({ id: "workspace.insights.moodle.autograde.submissionStats", defaultMessage: "Submission Status:" })}
          </Typography>
          
          <Chip
            label={intl.formatMessage(
              { id: "workspace.insights.moodle.autograde.totalStudents", defaultMessage: "Total: {count}" },
              { count: submissionStats.totalStudents }
            )}
            size="small"
            variant="outlined"
            color="default"
          />
          
          <Chip
            label={intl.formatMessage(
              { id: "workspace.insights.moodle.autograde.submittedCount", defaultMessage: "Submitted: {count}" },
              { count: submissionStats.submitted }
            )}
            size="small"
            color="success"
            variant="outlined"
          />
          
          <Chip
            label={intl.formatMessage(
              { id: "workspace.insights.moodle.autograde.pendingCount", defaultMessage: "Pending: {count}" },
              { count: submissionStats.pending }
            )}
            size="small"
            color="warning"
            variant="outlined"
          />
          
          {submissionStats.draft > 0 && (
            <Chip
              label={intl.formatMessage(
                { id: "workspace.insights.moodle.autograde.draftCount", defaultMessage: "Draft: {count}" },
                { count: submissionStats.draft }
              )}
              size="small"
              color="info"
              variant="outlined"
            />
          )}
        </Box>
      )}
    </Box>
  );
} 