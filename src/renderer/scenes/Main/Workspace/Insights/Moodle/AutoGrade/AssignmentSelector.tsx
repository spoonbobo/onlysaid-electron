import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useIntl } from 'react-intl';
import { Assignment, KnowledgeBase } from './types';

interface AssignmentSelectorProps {
  assignments: Assignment[];
  selectedAssignment: string;
  onAssignmentChange: (assignmentId: string) => void;
  knowledgeBases: KnowledgeBase[];
  selectedKbId: string;
  onKbChange: (kbId: string) => void;
  loadingKBs: boolean;
}

export default function AssignmentSelector({
  assignments,
  selectedAssignment,
  onAssignmentChange,
  knowledgeBases,
  selectedKbId,
  onKbChange,
  loadingKBs
}: AssignmentSelectorProps) {
  const intl = useIntl();

  // Ensure the selected values are valid or empty
  const validSelectedAssignment = assignments.find(a => a.id === selectedAssignment) ? selectedAssignment : '';
  const validSelectedKbId = knowledgeBases.find(kb => kb.id === selectedKbId) ? selectedKbId : '';

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <FormControl fullWidth sx={{ flex: 1 }}>
        <InputLabel sx={{ color: 'text.primary' }}>
          {intl.formatMessage({ id: "workspace.insights.moodle.autograde.selectAssignment", defaultMessage: "Select Assignment" })}
        </InputLabel>
        <Select
          value={validSelectedAssignment}
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
          value={validSelectedKbId}
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
  );
} 