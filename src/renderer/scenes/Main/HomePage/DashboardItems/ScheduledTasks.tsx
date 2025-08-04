import { Box, Typography, Card, CardContent, List, ListItem, ListItemText, ListItemIcon, Checkbox, IconButton, Button, Chip, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Grid, Tooltip, SelectChangeEvent } from "@mui/material";
import { useIntl } from "react-intl";
import { useState, useEffect } from "react";
import { Add, CheckCircle, RadioButtonUnchecked, Event, AccountTree, OpenInNew, Schedule, School, Assignment, Group, Business, Science, Person, AccessTime, Repeat, DateRange, Edit, Delete, Notifications, Refresh, Settings } from "@mui/icons-material";
import { useUserTokenStore } from "@/renderer/stores/User/UserToken";
import { WorkflowDialog } from "@/renderer/components/Dialog/Schedule/Workflow";
import { WorkflowEdit } from "@/renderer/components/Dialog/Schedule/WorkflowEdit";
import { useScheduleActions } from '@/renderer/stores/Workflow/WorkflowActions';
import { useWorkflowStore } from '@/renderer/stores/Workflow/WorkflowStore';

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
  
  // ✅ ADD: Get the proper workflow actions
  const { deleteWorkflow } = useScheduleActions();
  const { deleteWorkflowFromN8n, syncN8nWorkflows } = useWorkflowStore();
  
  // State management
  const [scheduledItems, setScheduledItems] = useState<ScheduledItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduledItem | null>(null);

  // ✅ ADD: Auto-load scheduled items on component mount
  useEffect(() => {
    loadScheduledItems();
  }, []);

  // ✅ ADD: Reload when n8n connection status changes
  useEffect(() => {
    if (n8nConnected && n8nApiUrl && n8nApiKey) {
      loadScheduledItems();
    }
  }, [n8nConnected, n8nApiUrl, n8nApiKey]);

  // ✅ ENHANCED: Better getDaysUntil function with minutes/hours support
  const getDaysUntil = (date: Date | string) => {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    
    const diffMs = targetDate.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMs < 0) {
      return intl.formatMessage({ id: 'workflow.preview.overdue', defaultMessage: 'Overdue' });
    } else if (diffMinutes < 60) {
      return intl.formatMessage({ 
        id: 'workflow.preview.inMinutes', 
        defaultMessage: '{minutes}m' 
      }, { minutes: Math.max(1, diffMinutes) });
    } else if (diffHours < 24) {
      return intl.formatMessage({ 
        id: 'workflow.preview.inHours', 
        defaultMessage: '{hours}h' 
      }, { hours: diffHours });
    } else if (diffDays === 1) {
      return intl.formatMessage({ id: 'workflow.preview.tomorrow', defaultMessage: 'Tomorrow' });
    } else {
      return intl.formatMessage({ 
        id: 'workflow.preview.inDays', 
        defaultMessage: '{days}d' 
      }, { days: diffDays });
    }
  };

  // ✅ ENHANCED: Better calculateNextExecution with debugging and fallback
  const calculateNextExecution = (item: ScheduledItem): Date | null => {
    console.log('[ScheduledTasks] Calculating next execution for:', item.title, {
      periodType: item.periodType,
      schedule: item.schedule,
      metadata: item.metadata
    });
    
    // Try to get schedule from metadata if main schedule is empty
    const schedule = item.schedule || item.metadata?.originalScheduleData;
    
    if (!schedule) {
      console.log('[ScheduledTasks] No schedule data found for:', item.title);
      // ✅ FALLBACK: Create a default next execution (1 hour from now) for demo purposes
      const fallbackDate = new Date();
      fallbackDate.setHours(fallbackDate.getHours() + 1);
      fallbackDate.setMinutes(0, 0, 0);
      console.log('[ScheduledTasks] Using fallback next execution:', fallbackDate);
      return fallbackDate;
    }
    
    const now = new Date();
    
    if (item.periodType === 'one-time') {
      if (schedule.date && schedule.time) {
        const [hours, minutes] = schedule.time.split(':');
        const date = new Date(schedule.date);
        date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        console.log('[ScheduledTasks] One-time execution calculated:', date);
        return date > now ? date : null;
      }
    } else if (item.periodType === 'recurring') {
      if (schedule.frequency && schedule.time) {
        const [hours, minutes] = schedule.time.split(':');
        
        if (schedule.frequency === 'daily') {
          const nextDate = new Date(now);
          nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          // If time has passed today, schedule for tomorrow
          if (nextDate <= now) {
            nextDate.setDate(nextDate.getDate() + 1);
          }
          console.log('[ScheduledTasks] Daily execution calculated:', nextDate);
          return nextDate;
        } else if (schedule.frequency === 'weekly' && schedule.days?.length > 0) {
          const selectedDays = schedule.days;
          const dayMap: Record<string, number> = {
            'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
            'Thursday': 4, 'Friday': 5, 'Saturday': 6
          };
          
          // Find next occurrence
          for (let i = 0; i < 14; i++) { // Check next 14 days
            const checkDate = new Date(now);
            checkDate.setDate(now.getDate() + i);
            checkDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' });
            if (selectedDays?.includes(dayName) && checkDate > now) {
              console.log('[ScheduledTasks] Weekly execution calculated:', checkDate);
              return checkDate;
            }
          }
        } else if (schedule.frequency === 'monthly') {
          const nextDate = new Date(now);
          nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          // If time has passed this month, schedule for next month
          if (nextDate <= now) {
            nextDate.setMonth(nextDate.getMonth() + 1);
          }
          console.log('[ScheduledTasks] Monthly execution calculated:', nextDate);
          return nextDate;
        }
      }
    } else if (item.periodType === 'specific-dates' && schedule.dates?.length > 0) {
      // Find the next date from specific dates
      const futureDates = schedule.dates
        .map((dateStr: string) => new Date(dateStr))
        .filter((date: Date) => date > now)
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());
      
      console.log('[ScheduledTasks] Specific dates execution calculated:', futureDates[0]);
      return futureDates.length > 0 ? futureDates[0] : null;
    }
    
    console.log('[ScheduledTasks] Could not calculate next execution for:', item.title);
    return null;
  };

  // ✅ ENHANCED: Better parseN8nWorkflowSchedule with more detailed parsing
  const parseN8nWorkflowSchedule = (workflow: any): { periodType: 'one-time' | 'recurring' | 'specific-dates'; schedule?: any } => {
    console.log('[ScheduledTasks] Parsing N8n workflow schedule for:', workflow.name, {
      nodes: workflow.nodes?.length || 0,
      active: workflow.active
    });
    
    if (!workflow.nodes) {
      console.log('[ScheduledTasks] No nodes found in workflow');
      return { periodType: 'recurring' }; // Default fallback
    }
    
    const triggerNode = workflow.nodes.find((node: any) => 
      node.type === 'n8n-nodes-base.scheduleTrigger'
    );
    
    if (!triggerNode?.parameters?.triggerRules) {
      console.log('[ScheduledTasks] No schedule trigger found, creating default schedule');
      // ✅ FALLBACK: Create a default schedule for workflows without proper triggers
      const now = new Date();
      const nextHour = now.getHours() + 1;
      const hour = nextHour >= 24 ? 0 : nextHour;
      
      return { 
        periodType: 'recurring',
        schedule: {
          frequency: 'daily',
          time: `${hour.toString().padStart(2, '0')}:00`,
          duration: 60
        }
      };
    }
    
    const rule = triggerNode.parameters.triggerRules[0];
    if (!rule) {
      console.log('[ScheduledTasks] No trigger rule found');
      return { periodType: 'recurring' };
    }
    
    console.log('[ScheduledTasks] Found trigger rule:', rule);
    
    const parsedData: { periodType: 'one-time' | 'recurring' | 'specific-dates'; schedule?: any } = {
      periodType: 'recurring' // Default
    };
    
    if (rule.interval === 'cronExpression') {
      parsedData.periodType = 'one-time';
      parsedData.schedule = {
        date: getCurrentDate(), // Could parse from cron if needed
        time: getCurrentTime(),
        duration: 60
      };
    } else if (rule.interval === 'days') {
      parsedData.periodType = 'recurring';
      parsedData.schedule = {
        frequency: 'daily' as const,
        time: `${rule.triggerAtHour?.toString().padStart(2, '0') || '00'}:${rule.triggerAtMinute?.toString().padStart(2, '0') || '00'}`,
        duration: 60
      };
    } else if (rule.interval === 'weeks') {
      parsedData.periodType = 'recurring';
      const days = rule.triggerOnWeekdays?.map((day: string) => 
        day.charAt(0).toUpperCase() + day.slice(1)
      ) || [];
      
      parsedData.schedule = {
        frequency: 'weekly' as const,
        days: days,
        time: `${rule.triggerAtHour?.toString().padStart(2, '0') || '00'}:${rule.triggerAtMinute?.toString().padStart(2, '0') || '00'}`,
        duration: 60
      };
    }
    
    console.log('[ScheduledTasks] Parsed schedule data:', parsedData);
    return parsedData;
  };

  // ✅ HELPER: Get current time and date (similar to WorkflowEdit.tsx)
  const getCurrentTime = () => {
    const now = new Date();
    const nextHour = now.getHours() + 1;
    const hour = nextHour >= 24 ? 0 : nextHour;
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const loadScheduledItems = async () => {
    setLoading(true);
    setError(null);

    try {
      // ✅ NEW: Sync N8n workflows first (if using the sync approach)
      if (n8nConnected && n8nApiUrl && n8nApiKey) {
        console.log('[ScheduledTasks] Syncing N8n workflows to WorkflowStore');
        const { syncN8nWorkflows } = useWorkflowStore.getState();
        await syncN8nWorkflows();
      }

      // Load N8n workflows if connected
      let n8nWorkflows: any[] = [];
      if (n8nConnected && n8nApiUrl && n8nApiKey) {
        const result = await (window as any).electron?.n8nApi?.getWorkflows({
          apiUrl: n8nApiUrl,
          apiKey: n8nApiKey
        });
        
        if (result?.success) {
          n8nWorkflows = result.workflows || [];
          console.log('[ScheduledTasks] Loaded N8n workflows:', n8nWorkflows);
        }
      }

      // ✅ FIXED: Convert N8n workflows to scheduled items with proper schedule parsing
      const workflowItems: ScheduledItem[] = await Promise.all(
        n8nWorkflows.map(async (workflow) => {
          console.log('[ScheduledTasks] Processing workflow:', workflow.name, workflow.id);
          
          // Get detailed workflow data to parse schedule
          let detailedWorkflow = workflow;
          if (workflow.id && n8nApiUrl && n8nApiKey) {
            try {
              const detailResult = await (window as any).electron?.n8nApi?.getWorkflow({
                apiUrl: n8nApiUrl,
                apiKey: n8nApiKey,
                workflowId: workflow.id
              });
              
              if (detailResult?.success && detailResult.workflow) {
                detailedWorkflow = detailResult.workflow;
                console.log('[ScheduledTasks] Got detailed workflow data for:', workflow.name);
              }
            } catch (error) {
              console.warn('[ScheduledTasks] Failed to get detailed workflow data:', error);
            }
          }

          // Parse the schedule from the detailed workflow
          const parsedSchedule = parseN8nWorkflowSchedule(detailedWorkflow);
          console.log('[ScheduledTasks] Parsed schedule for', workflow.name, ':', parsedSchedule);

          const item: ScheduledItem = {
            id: `n8n-${workflow.id}`,
            title: workflow.name,
            type: 'workflow' as const,
            active: workflow.active,
            category: determineWorkflowCategory(workflow.name),
            periodType: parsedSchedule.periodType,
            schedule: parsedSchedule.schedule,
            nextExecution: undefined, // Will be calculated below
            lastExecution: workflow.lastExecution,
            n8nWorkflowId: workflow.id,
            metadata: {
              originalWorkflow: detailedWorkflow,
              workflowType: determineWorkflowType(workflow.name)
            }
          };

          // ✅ CALCULATE: Next execution from schedule data
          const nextExecution = calculateNextExecution(item);
          if (nextExecution) {
            item.nextExecution = nextExecution;
          }

          return item;
        })
      );

      console.log('[ScheduledTasks] Final workflow items:', workflowItems);

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

  // ✅ NEW: Helper to determine workflow type for deletion
  const determineWorkflowType = (workflowName: string): string => {
    const name = workflowName.toLowerCase();
    if (name.includes('discussion')) return 'class-discussion';
    if (name.includes('lecture')) return 'lecture';
    if (name.includes('assignment')) return 'assignment';
    if (name.includes('exam')) return 'exam-schedule';
    if (name.includes('office')) return 'office-hours';
    return 'unknown';
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

  // ✅ ENHANCED: Better delete handler with workflow type from metadata
  const handleDeleteItem = async (item: ScheduledItem) => {
    console.log('[ScheduledTasks] Delete requested for item:', item);
    
    if (!confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      return;
    }

    try {
      if (item.type === 'workflow' && item.n8nWorkflowId) {
        console.log('[ScheduledTasks] Deleting N8n workflow:', item.n8nWorkflowId);
        
        let result: { success: boolean; error?: string } = { success: false };
        
        // Try WorkflowStore first using metadata workflow type
        const workflowType = item.metadata?.workflowType || 'class-discussion';
        console.log('[ScheduledTasks] Using workflow type from metadata:', workflowType);
        
        const { deleteWorkflowFromN8n } = useWorkflowStore.getState();
        result = await deleteWorkflowFromN8n(workflowType);
        
        // ✅ Fallback to direct API if WorkflowStore fails
        if (!result.success && result.error?.includes('not found or not deployed')) {
          console.log('[ScheduledTasks] Workflow not tracked in WorkflowStore, calling N8n API directly');
          result = await window.electron.n8nApi.deleteWorkflow({
            apiUrl: n8nApiUrl!,
            apiKey: n8nApiKey!,
            workflowId: item.n8nWorkflowId
          });
          console.log('[ScheduledTasks] Direct N8n API delete result:', result);
        }
        
        if (result.success) {
          console.log('[ScheduledTasks] Workflow deleted successfully from N8n');
          // Remove from local state
          setScheduledItems(prev => prev.filter(i => i.id !== item.id));
          
          // Reload the list to ensure consistency
          await loadScheduledItems();
        } else {
          console.error('[ScheduledTasks] Failed to delete workflow:', result.error);
          alert(`Failed to delete workflow: ${result.error}`);
        }
      } else {
        // Handle manual task deletion
        console.log('[ScheduledTasks] Deleting manual task:', item.id);
        setScheduledItems(prev => prev.filter(i => i.id !== item.id));
      }
    } catch (error) {
      console.error('[ScheduledTasks] Error during deletion:', error);
      alert(`Error deleting workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  // ✅ REMOVE: const activeCount = filteredItems.filter(item => item.active).length;

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
            <span>
              <IconButton
                size="small"
                color="info"
                onClick={loadScheduledItems}
                disabled={loading}
              >
                <Refresh />
              </IconButton>
            </span>
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

      {/* ✅ REMOVE: Summary section with active count */}
      {/* Summary */}
      {/* {filteredItems.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {activeCount} of {filteredItems.length} items active
          </Typography>
        </Box>
      )} */}

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
            {filteredItems.map((item) => {
              // ✅ CALCULATE: Next execution for display
              const nextExecution = item.nextExecution || calculateNextExecution(item);
              
              return (
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {item.title}
                        </Typography>
                        {/* ✅ ADD: Show next execution right after title */}
                        {nextExecution && (
                          <Chip
                            label={getDaysUntil(nextExecution)}
                            size="small"
                            color="primary"
                            variant="outlined"
                            icon={<Schedule sx={{ fontSize: '0.7rem !important' }} />}
                            sx={{ 
                              fontSize: '0.65rem', 
                              height: 16,
                              fontWeight: 'medium',
                              '& .MuiChip-icon': {
                                marginLeft: '4px',
                                marginRight: '-2px'
                              }
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        {getPeriodTypeChip(item.periodType)}
                        {/* ✅ KEEP: Last execution for reference */}
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
                      onClick={() => handleDeleteItem(item)}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </ListItem>
              );
            })}
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
        onDelete={handleDeleteItem}
      />
    </Box>
  );
}

export default ScheduledTasks;
