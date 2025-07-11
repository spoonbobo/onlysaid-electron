import React from 'react';
import {
  Box,
  Typography,
  Alert,
  LinearProgress,
  Button
} from '@mui/material';
import {
  CheckCircle,
  Schedule,
  Add
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { WorkflowDialogHeaderProps, WorkflowDialogActionsProps } from './types';

// Combined props interface
interface WorkflowDialogHeaderAndActionsProps extends WorkflowDialogHeaderProps, WorkflowDialogActionsProps {
  // All props are inherited from both interfaces
}

export function WorkflowDialogHeader({
  selectedTemplate,
  isLoading,
  isCreating,
  error,
  n8nError,
  creationSuccess,
  apiUrl,
  apiKey,
  connected,
  hasValidSchedule,
  onClearError,
  onClose,
  onCreateWorkflow
}: WorkflowDialogHeaderAndActionsProps) {
  const intl = useIntl();

  const renderHeader = () => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">
          {selectedTemplate ? 
            intl.formatMessage({ id: 'workflow.dialog.configureWorkflow', defaultMessage: 'Configure Workflow' }) : 
            intl.formatMessage({ id: 'workflow.dialog.chooseTemplate', defaultMessage: 'Choose Workflow Template' })
          }
        </Typography>
      </Box>
      
      {/* Loading bar */}
      {(isLoading || isCreating) && (
        <LinearProgress sx={{ mt: 1 }} />
      )}

      {/* Error Alert */}
      {(error || n8nError) && (
        <Alert 
          severity="error" 
          sx={{ mt: 2 }}
          onClose={onClearError}
        >
          {error || n8nError}
        </Alert>
      )}

      {/* N8n Config Warning */}
      {(!apiUrl || !apiKey) && (
        <Alert 
          severity="warning" 
          sx={{ mt: 2 }}
        >
          {intl.formatMessage({ 
            id: 'workflow.dialog.n8nConfigRequired', 
            defaultMessage: 'N8n configuration required. Please configure N8n in your settings to create workflows.' 
          })}
        </Alert>
      )}

      {/* Success Alert */}
      {creationSuccess && (
        <Alert 
          severity="success" 
          sx={{ mt: 2 }}
          icon={<CheckCircle />}
        >
          {intl.formatMessage({ 
            id: 'workflow.dialog.creationSuccess', 
            defaultMessage: 'Workflow created successfully! It has been added to your N8n instance.' 
          })}
        </Alert>
      )}
    </Box>
  );

  const renderActions = () => {
    const isDisabled = isCreating || !apiUrl || !apiKey || !connected || !hasValidSchedule || !!error || !!n8nError;
    
    return (
      <>
        <Button onClick={onClose} disabled={isCreating}>
          {intl.formatMessage({ id: 'workflow.dialog.cancel', defaultMessage: 'Cancel' })}
        </Button>
        
        {selectedTemplate && (
          <Button 
            onClick={onCreateWorkflow}
            variant="contained"
            startIcon={isCreating ? <Schedule /> : <Add />}
            disabled={isDisabled}
          >
            {isCreating ? 
              intl.formatMessage({ id: 'workflow.dialog.creating', defaultMessage: 'Creating...' }) :
              intl.formatMessage({ id: 'workflow.dialog.createWorkflow', defaultMessage: 'Create Workflow' })
            }
          </Button>
        )}
      </>
    );
  };

  // Return an object with both render functions
  return {
    renderHeader,
    renderActions
  };
}

// Export individual components for backward compatibility if needed
export const WorkflowDialogHeaderOnly = ({ 
  selectedTemplate,
  isLoading,
  isCreating,
  error,
  n8nError,
  creationSuccess,
  apiUrl,
  apiKey,
  onClearError
}: WorkflowDialogHeaderProps) => {
  const { renderHeader } = WorkflowDialogHeader({
    selectedTemplate,
    isLoading,
    isCreating,
    error,
    n8nError,
    creationSuccess,
    apiUrl,
    apiKey,
    onClearError,
    // Dummy props for actions
    connected: false,
    hasValidSchedule: false,
    onClose: () => {},
    onCreateWorkflow: () => {}
  });
  
  return renderHeader();
};

export const WorkflowDialogActionsOnly = ({
  selectedTemplate,
  isCreating,
  apiUrl,
  apiKey,
  connected,
  error,
  n8nError,
  hasValidSchedule,
  onClose,
  onCreateWorkflow
}: WorkflowDialogActionsProps) => {
  const { renderActions } = WorkflowDialogHeader({
    selectedTemplate,
    isCreating,
    apiUrl,
    apiKey,
    connected,
    error,
    n8nError,
    hasValidSchedule,
    onClose,
    onCreateWorkflow,
    // Dummy props for header
    isLoading: false,
    creationSuccess: false,
    onClearError: () => {}
  });
  
  return <>{renderActions()}</>;
}; 