import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { WorkflowFormFieldsProps } from './types';
import { useWorkspaceStore } from '@/renderer/stores/Workspace/WorkspaceStore';
import { workflowRegistry } from './Registry/WorkflowRegistry';

export function WorkflowFormFields({
  selectedTemplate,
  formData,
  onFieldChange,
  onBack
}: WorkflowFormFieldsProps) {
  const intl = useIntl();
  const workspaces = useWorkspaceStore((state) => state.workspaces);

  // Get the workflow module from registry
  const workflowModule = selectedTemplate ? workflowRegistry.get(selectedTemplate.id) : null;

  // Handle workspace selection with auto-population
  const handleWorkspaceChange = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      // Always store both workspace ID and name
      onFieldChange('workspace', workspaceId);
      onFieldChange('workspaceName', workspace.name);
      
      // Also apply auto-population if available
      if (workflowModule?.autoPopulateFromWorkspace) {
        const autoPopulatedData = workflowModule.autoPopulateFromWorkspace(workspace.id, workspace.name);
        Object.entries(autoPopulatedData).forEach(([key, value]) => {
          onFieldChange(key, value);
        });
      }
    }
  };

  const renderField = (field: any) => {
    const value = formData[field.key] || '';

    switch (field.type) {
      case 'workspace-select':
        return (
          <FormControl fullWidth>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleWorkspaceChange(e.target.value)}
              label={field.label}
            >
              {workspaces.map((workspace) => (
                <MenuItem key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'text':
        return (
          <TextField
            fullWidth
            label={field.label}
            value={value}
            onChange={(e) => onFieldChange(field.key, e.target.value)}
            required={field.required}
            helperText={field.description}
          />
        );

      case 'textarea':
        return (
          <TextField
            fullWidth
            multiline
            rows={3}
            label={field.label}
            value={value}
            onChange={(e) => onFieldChange(field.key, e.target.value)}
            required={field.required}
            helperText={field.description}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value}
              onChange={(e) => onFieldChange(field.key, e.target.value)}
              label={field.label}
              required={field.required}
            >
              {field.options?.map((option: string) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      default:
        return null;
    }
  };

  if (!selectedTemplate || !workflowModule) {
    return null;
  }

  const fields = workflowModule.getFormFields();

  return (
    <Box>
      {/* Template header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          startIcon={<Edit />} 
          onClick={onBack}
          sx={{ mr: 2 }}
        >
          {intl.formatMessage({ id: 'workflow.dialog.changeTemplate', defaultMessage: 'Change Template' })}
        </Button>
        <Box>
          <Typography variant="h6">{selectedTemplate.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedTemplate.description}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h6" sx={{ mb: 2 }}>
        {intl.formatMessage({ id: 'workflow.dialog.basicInformation', defaultMessage: 'Basic Information' })}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {fields.map((field) => (
          <Box key={field.key}>
            {renderField(field)}
          </Box>
        ))}
      </Box>
    </Box>
  );
}