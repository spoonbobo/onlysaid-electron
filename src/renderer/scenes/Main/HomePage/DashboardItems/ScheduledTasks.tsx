import { Box, Typography, Card, CardContent, List, ListItem, ListItemText, ListItemIcon, Checkbox, IconButton, Button, Chip, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Grid, Tooltip, SelectChangeEvent } from "@mui/material";
import { useIntl } from "react-intl";
import { useState, useEffect } from "react";
import { Add, CheckCircle, RadioButtonUnchecked, Event, AccountTree, OpenInNew, Schedule, School, Assignment, Group, Business, Science, Person, AccessTime, Repeat, DateRange, Edit, Delete, Notifications, Refresh, Settings } from "@mui/icons-material";
import { useUserTokenStore } from "@/renderer/stores/User/UserToken";
import { WorkflowDialog } from "@/renderer/components/Dialog/Schedule/Workflow";
import { WorkflowEdit } from "@/renderer/components/Dialog/Schedule/WorkflowEdit";

interface ScheduledItem {
  id: string;
  title: string;
  description?: string;
  type: 'workflow' | 'manual';
  active: boolean;
  category: 'classes' | 'student' | 'assessments' | 'meetings' | 'research' | 'admin';
  periodType: 'one-time' | 'recurring' | 'specific-dates';
  schedule?: {
    frequency?: 'daily' | 'weekly' | 'monthly';
    days?: string[];
    time?: string;
    duration?: number;
    dates?: string[];
  };
  nextExecution?: Date;
  lastExecution?: Date;
  metadata?: Record<string, any>;
  n8nWorkflowId?: string;
}

function ScheduledTasks() {
  const intl = useIntl();
  const { n8nConnected, n8nApiUrl, n8nApiKey } = useUserTokenStore();
  
  // State management
  const [scheduledItems, setScheduledItems] = useState<ScheduledItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduledItem | null>(null);

  // Load scheduled items
  useEffect(() => {
    loadScheduledItems();
  }, [n8nConnected]);

  const loadScheduledItems = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load N8n workflows if connected
      let n8nWorkflows: any[] = [];
      if (n8nConnected && n8nApiUrl && n8nApiKey) {
        const result = await (window as any).electron?.n8nApi?.getWorkflows({
          apiUrl: n8nApiUrl,
          apiKey: n8nApiKey
        });
        
        if (result?.success) {
          n8nWorkflows = result.workflows || [];
        }
      }

      // Convert N8n workflows to scheduled items
      const workflowItems: ScheduledItem[] = n8nWorkflows.map(workflow => ({
        id: `n8n-${workflow.id}`,
        title: workflow.name,
        type: 'workflow',
        active: workflow.active,
        category: determineWorkflowCategory(workflow.name),
        periodType: 'recurring', // Most N8n workflows are recurring
        nextExecution: workflow.nextExecution,
        lastExecution: workflow.lastExecution,
        n8nWorkflowId: workflow.id
      }));

      // TODO: Load manual tasks from local storage or database
      const manualItems: ScheduledItem[] = [
        // Placeholder manual items - these would come from storage
      ];

      setScheduledItems([...workflowItems, ...manualItems]);
    } catch (error) {
      console.error('Error loading scheduled items:', error);
      setError('Failed to load scheduled items');
    } finally {
      setLoading(false);
    }
  };

  const determineWorkflowCategory = (workflowName: string): ScheduledItem['category'] => {
    const name = workflowName.toLowerCase();
    if (name.includes('lecture') || name.includes('class') || name.includes('lab')) return 'classes';
    if (name.includes('student') || name.includes('office') || name.includes('thesis')) return 'student';
    if (name.includes('assignment') || name.includes('exam') || name.includes('grade')) return 'assessments';
    if (name.includes('meeting') || name.includes('committee')) return 'meetings';
    if (name.includes('research') || name.includes('grant') || name.includes('paper')) return 'research';
    return 'admin';
  };

  const handleItemToggle = async (itemId: string) => {
    const item = scheduledItems.find(i => i.id === itemId);
    if (!item) return;

    if (item.type === 'workflow' && item.n8nWorkflowId && n8nApiUrl && n8nApiKey) {
      try {
        const result = await (window as any).electron?.n8nApi?.toggleWorkflow({
          apiUrl: n8nApiUrl,
          apiKey: n8nApiKey,
          workflowId: item.n8nWorkflowId,
          active: !item.active
        });
        
        if (result?.success) {
          setScheduledItems(prev => 
            prev.map(i => 
              i.id === itemId 
                ? { ...i, active: !i.active }
                : i
            )
          );
        }
      } catch (error) {
        console.error('Error toggling workflow:', error);
      }
    } else {
      // Handle manual task toggle
      setScheduledItems(prev => 
        prev.map(i => 
          i.id === itemId 
            ? { ...i, active: !i.active }
            : i
        )
      );
    }
  };

  const handleEditItem = (item: ScheduledItem) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = (updatedItem: ScheduledItem) => {
    setScheduledItems(prev => 
      prev.map(i => 
        i.id === updatedItem.id 
          ? updatedItem
          : i
      )
    );
    setEditDialogOpen(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      setScheduledItems(prev => prev.filter(i => i.id !== itemId));
    }
  };

  const handleCreateWorkflow = (template: any, data: any) => {
    // TODO: Implement workflow creation logic
    console.log('Creating workflow:', template, data);
    
    // For now, create a local scheduled item
    const newItem: ScheduledItem = {
      id: `manual-${Date.now()}`,
      title: data.courseName || data.assignmentTitle || data.meetingType || template.name,
      description: template.description,
      type: 'manual',
      active: false,
      category: template.category,
      periodType: template.periodType,
      metadata: data
    };

    setScheduledItems(prev => [...prev, newItem]);
    setWorkflowDialogOpen(false);
  };

  const handleOpenN8n = () => {
    if (n8nApiUrl) {
      const webUrl = n8nApiUrl.replace('/api/v1', '');
      (window as any).electron?.shell?.openExternal(webUrl);
    }
  };

  const categories = [
    { id: 'all', label: intl.formatMessage({ id: 'homepage.scheduledTasks.category.all', defaultMessage: 'All Items' }), icon: <Schedule /> },
    { id: 'classes', label: intl.formatMessage({ id: 'homepage.scheduledTasks.category.classes', defaultMessage: 'Classes & Lectures' }), icon: <School /> },
    { id: 'student', label: intl.formatMessage({ id: 'homepage.scheduledTasks.category.student', defaultMessage: 'Student-Related' }), icon: <Person /> },
    { id: 'assessments', label: intl.formatMessage({ id: 'homepage.scheduledTasks.category.assessments', defaultMessage: 'Assessments' }), icon: <Assignment /> },
    { id: 'meetings', label: intl.formatMessage({ id: 'homepage.scheduledTasks.category.meetings', defaultMessage: 'Meetings' }), icon: <Business /> },
    { id: 'research', label: intl.formatMessage({ id: 'homepage.scheduledTasks.category.research', defaultMessage: 'Research' }), icon: <Science /> },
    { id: 'admin', label: intl.formatMessage({ id: 'homepage.scheduledTasks.category.admin', defaultMessage: 'Administrative' }), icon: <Event /> }
  ];

  const getFilteredItems = () => {
    if (selectedCategory === 'all') return scheduledItems;
    return scheduledItems.filter(item => item.category === selectedCategory);
  };

  const filteredItems = getFilteredItems();
  const activeCount = filteredItems.filter(item => item.active).length;

  const getCategoryIcon = (category: string) => {
    const categoryMap: Record<string, React.ReactNode> = {
      classes: <School />,
      student: <Person />,
      assessments: <Assignment />,
      meetings: <Business />,
      research: <Science />,
      admin: <Event />
    };
    return categoryMap[category] || <Schedule />;
  };

  const getPeriodTypeChip = (periodType: string) => {
    const colors: Record<string, any> = {
      'one-time': 'info',
      'recurring': 'success',
      'specific-dates': 'warning'
    };
    return (
      <Chip
        label={periodType.replace('-', ' ')}
        size="small"
        color={colors[periodType] || 'default'}
        variant="outlined"
        sx={{ fontSize: '0.7rem', height: 18 }}
      />
    );
  };

  const formatExecutionTime = (date?: Date) => {
    if (!date) return null;
    return new Intl.DateTimeFormat('en', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography 
          variant="h6" 
          component="h2" 
          sx={{ 
            color: 'text.primary',
            fontWeight: 'medium'
          }}
        >
          {intl.formatMessage({ 
            id: 'homepage.scheduledTasks', 
            defaultMessage: 'Scheduled Tasks & Automation' 
          })}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={intl.formatMessage({ id: "common.refresh", defaultMessage: "Refresh" })}>
            <IconButton
              size="small"
              color="info"
              onClick={loadScheduledItems}
              disabled={loading}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={intl.formatMessage({ id: "homepage.scheduledTasks.addTask", defaultMessage: "Add Task" })}>
            <IconButton
              size="small"
              color="primary"
              onClick={() => setWorkflowDialogOpen(true)}
            >
              <Add />
            </IconButton>
          </Tooltip>
          
          {/* Hidden for now */}
          {/* {n8nConnected && (
            <Tooltip title={intl.formatMessage({ id: "homepage.scheduledTasks.manage", defaultMessage: "Manage" })}>
              <IconButton
                size="small"
                color="secondary"
                onClick={handleOpenN8n}
              >
                <Settings />
              </IconButton>
            </Tooltip>
          )} */}
        </Box>
      </Box>

      {/* Category Filter */}
      <Box sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="category-select-label">
            {intl.formatMessage({ id: "homepage.scheduledTasks.filterByCategory", defaultMessage: "Filter by Category" })}
          </InputLabel>
          <Select
            labelId="category-select-label"
            value={selectedCategory}
            onChange={(event: SelectChangeEvent) => setSelectedCategory(event.target.value)}
            label={intl.formatMessage({ id: "homepage.scheduledTasks.filterByCategory", defaultMessage: "Filter by Category" })}
            size="small"
          >
            {categories.map(category => (
              <MenuItem key={category.id} value={category.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {category.icon}
                  {category.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* N8n Connection Status */}
      {!n8nConnected && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          action={
            <Button 
              size="small" 
              onClick={() => window.location.hash = '#/settings/userAPIKeys'}
            >
              Connect N8n
            </Button>
          }
        >
          Connect N8n to enable workflow automation and advanced scheduling features.
        </Alert>
      )}

      {/* Summary */}
      {filteredItems.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {activeCount} of {filteredItems.length} items active
          </Typography>
        </Box>
      )}

      {/* Items List */}
      <Box sx={{ 
        height: 300, 
        overflow: 'auto',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.default'
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="error">
              {error}
            </Typography>
            <Button size="small" onClick={loadScheduledItems} sx={{ mt: 1 }}>
              Retry
            </Button>
          </Box>
        ) : filteredItems.length === 0 ? (
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            p: 3,
            textAlign: 'center'
          }}>
            <Schedule sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" sx={{ mb: 1, color: 'text.secondary' }}>
              {intl.formatMessage({ 
                id: 'homepage.scheduledTasks.noTasksYet', 
                defaultMessage: 'No scheduled tasks yet' 
              })}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              {intl.formatMessage({ 
                id: 'homepage.scheduledTasks.createWorkflowsDescription', 
                defaultMessage: 'Create academic workflows to automate your schedule' 
              })}
            </Typography>
            <Button 
              variant="outlined" 
              size="small" 
              startIcon={<Add />}
              onClick={() => setWorkflowDialogOpen(true)}
            >
              {intl.formatMessage({ 
                id: 'homepage.scheduledTasks.createTask', 
                defaultMessage: 'Create Task' 
              })}
            </Button>
          </Box>
        ) : (
          <List dense sx={{ p: 1 }}>
            {filteredItems.map((item) => (
              <ListItem 
                key={item.id}
                sx={{ 
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: 'background.paper',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {getCategoryIcon(item.category)}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">
                        {item.title}
                      </Typography>
                      <Chip
                        label={item.active ? 'Active' : 'Inactive'}
                        size="small"
                        color={item.active ? 'success' : 'default'}
                        sx={{ fontSize: '0.7rem', height: 18 }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      {getPeriodTypeChip(item.periodType)}
                      {item.nextExecution && (
                        <Chip
                          label={`Next: ${formatExecutionTime(item.nextExecution)}`}
                          size="small"
                          variant="outlined"
                          color="primary"
                          icon={<Schedule sx={{ fontSize: '0.8rem !important' }} />}
                          sx={{ fontSize: '0.65rem', height: 18 }}
                        />
                      )}
                      {item.lastExecution && (
                        <Chip
                          label={`Last: ${formatExecutionTime(item.lastExecution)}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem', height: 18 }}
                        />
                      )}
                    </Box>
                  }
                  disableTypography
                />
                
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton 
                    size="small"
                    onClick={() => handleEditItem(item)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Delete />
                  </IconButton>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Workflow Creation Dialog */}
      <WorkflowDialog
        open={workflowDialogOpen}
        onClose={() => setWorkflowDialogOpen(false)}
        onCreateWorkflow={handleCreateWorkflow}
      />

      {/* Edit Dialog */}
      <WorkflowEdit
        open={editDialogOpen}
        item={editingItem}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveEdit}
      />
    </Box>
  );
}

export default ScheduledTasks;
