import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Switch
} from '@mui/material';
import {
  ExpandMore,
  School,
  Assignment,
  Group,
  Event,
  Notifications,
  Science,
  Business,
  Schedule,
  Add,
  Edit,
  PlayArrow,
  Pause,
  Delete,
  AccessTime,
  Repeat,
  DateRange,
  Person,
  Place,
  Description
} from '@mui/icons-material';
import { useIntl } from 'react-intl';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'classes' | 'student' | 'assessments' | 'meetings' | 'research' | 'admin';
  icon: React.ReactNode;
  periodType: 'one-time' | 'recurring' | 'specific-dates';
  defaultSchedule?: {
    frequency?: 'daily' | 'weekly' | 'monthly';
    days?: string[];
    time?: string;
    duration?: number; // minutes
  };
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'time' | 'date' | 'select' | 'multiselect' | 'textarea';
    options?: string[];
    required?: boolean;
    defaultValue?: any;
  }>;
}

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // Classes & Lectures
  {
    id: 'regular-lecture',
    name: 'Regular Lecture',
    description: 'Recurring lecture sessions (e.g., MWF 10-11 AM)',
    category: 'classes',
    icon: <School />,
    periodType: 'recurring',
    defaultSchedule: {
      frequency: 'weekly',
      days: ['Monday', 'Wednesday', 'Friday'],
      time: '10:00',
      duration: 60
    },
    fields: [
      { key: 'courseName', label: 'Course Name', type: 'text', required: true },
      { key: 'courseCode', label: 'Course Code', type: 'text', required: true },
      { key: 'room', label: 'Room/Location', type: 'text', required: true },
      { key: 'days', label: 'Days', type: 'multiselect', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], required: true },
      { key: 'time', label: 'Start Time', type: 'time', required: true },
      { key: 'duration', label: 'Duration (minutes)', type: 'text', defaultValue: '60' },
      { key: 'semester', label: 'Semester', type: 'select', options: ['Fall 2024', 'Spring 2025', 'Summer 2025'] }
    ]
  },
  {
    id: 'lab-session',
    name: 'Lab Session',
    description: 'Laboratory or practical sessions',
    category: 'classes',
    icon: <Science />,
    periodType: 'recurring',
    fields: [
      { key: 'labName', label: 'Lab Name', type: 'text', required: true },
      { key: 'courseCode', label: 'Course Code', type: 'text', required: true },
      { key: 'labRoom', label: 'Lab Room', type: 'text', required: true },
      { key: 'section', label: 'Section', type: 'text' },
      { key: 'days', label: 'Days', type: 'multiselect', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
      { key: 'time', label: 'Start Time', type: 'time', required: true },
      { key: 'duration', label: 'Duration (minutes)', type: 'text', defaultValue: '120' }
    ]
  },
  {
    id: 'tutorial-session',
    name: 'Tutorial/Discussion Section',
    description: 'Tutorial or discussion sections for courses',
    category: 'classes',
    icon: <Group />,
    periodType: 'recurring',
    fields: [
      { key: 'courseCode', label: 'Course Code', type: 'text', required: true },
      { key: 'sectionNumber', label: 'Section Number', type: 'text', required: true },
      { key: 'room', label: 'Room', type: 'text', required: true },
      { key: 'days', label: 'Days', type: 'multiselect', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
      { key: 'time', label: 'Time', type: 'time', required: true },
      { key: 'duration', label: 'Duration (minutes)', type: 'text', defaultValue: '50' }
    ]
  },
  {
    id: 'guest-lecture',
    name: 'Guest Lecturer Session',
    description: 'Special guest lecturer sessions',
    category: 'classes',
    icon: <Event />,
    periodType: 'one-time',
    fields: [
      { key: 'courseCode', label: 'Course Code', type: 'text', required: true },
      { key: 'guestName', label: 'Guest Lecturer Name', type: 'text', required: true },
      { key: 'topic', label: 'Topic/Title', type: 'text', required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'time', label: 'Time', type: 'time', required: true },
      { key: 'duration', label: 'Duration (minutes)', type: 'text', defaultValue: '60' },
      { key: 'room', label: 'Room', type: 'text', required: true }
    ]
  },
  
  // Student-Related
  {
    id: 'office-hours',
    name: 'Office Hours',
    description: 'Regular office hours for student consultations',
    category: 'student',
    icon: <Person />,
    periodType: 'recurring',
    defaultSchedule: {
      frequency: 'weekly',
      days: ['Tuesday', 'Thursday'],
      time: '14:00',
      duration: 120
    },
    fields: [
      { key: 'days', label: 'Days', type: 'multiselect', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], required: true },
      { key: 'time', label: 'Start Time', type: 'time', required: true },
      { key: 'duration', label: 'Duration (minutes)', type: 'text', defaultValue: '120' },
      { key: 'location', label: 'Location/Office', type: 'text', required: true },
      { key: 'mode', label: 'Mode', type: 'select', options: ['In-person', 'Online', 'Hybrid'] },
      { key: 'bookingRequired', label: 'Requires Booking', type: 'select', options: ['Yes', 'No'] }
    ]
  },
  {
    id: 'thesis-meeting',
    name: 'Thesis/Dissertation Meeting',
    description: 'Individual meetings with thesis students',
    category: 'student',
    icon: <Assignment />,
    periodType: 'specific-dates',
    fields: [
      { key: 'studentName', label: 'Student Name', type: 'text', required: true },
      { key: 'thesisTitle', label: 'Thesis Title', type: 'text' },
      { key: 'meetingType', label: 'Meeting Type', type: 'select', options: ['Progress Review', 'Proposal Defense', 'Final Defense', 'Regular Check-in'] },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'time', label: 'Time', type: 'time', required: true },
      { key: 'duration', label: 'Duration (minutes)', type: 'text', defaultValue: '60' },
      { key: 'location', label: 'Location', type: 'text' }
    ]
  },
  {
    id: 'advising-appointment',
    name: 'Academic Advising',
    description: 'Academic advising appointments with students',
    category: 'student',
    icon: <School />,
    periodType: 'specific-dates',
    fields: [
      { key: 'studentName', label: 'Student Name', type: 'text', required: true },
      { key: 'advisingType', label: 'Advising Type', type: 'select', options: ['Course Selection', 'Degree Planning', 'Career Guidance', 'Academic Issues'] },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'time', label: 'Time', type: 'time', required: true },
      { key: 'duration', label: 'Duration (minutes)', type: 'text', defaultValue: '30' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },

  // Assessments & Deadlines
  {
    id: 'assignment-deadline',
    name: 'Assignment Deadline',
    description: 'Assignment and project due dates',
    category: 'assessments',
    icon: <Assignment />,
    periodType: 'one-time',
    fields: [
      { key: 'assignmentTitle', label: 'Assignment Title', type: 'text', required: true },
      { key: 'courseCode', label: 'Course Code', type: 'text', required: true },
      { key: 'dueDate', label: 'Due Date', type: 'date', required: true },
      { key: 'dueTime', label: 'Due Time', type: 'time', defaultValue: '23:59' },
      { key: 'submissionMethod', label: 'Submission Method', type: 'select', options: ['LMS Upload', 'Email', 'Physical Submission', 'Online Platform'] },
      { key: 'reminderDays', label: 'Reminder (days before)', type: 'text', defaultValue: '3' },
      { key: 'description', label: 'Description', type: 'textarea' }
    ]
  },
  {
    id: 'exam-schedule',
    name: 'Exam Schedule',
    description: 'Midterm and final examinations',
    category: 'assessments',
    icon: <Event />,
    periodType: 'specific-dates',
    fields: [
      { key: 'examType', label: 'Exam Type', type: 'select', options: ['Midterm', 'Final', 'Quiz', 'Practical Exam'], required: true },
      { key: 'courseCode', label: 'Course Code', type: 'text', required: true },
      { key: 'examDate', label: 'Exam Date', type: 'date', required: true },
      { key: 'startTime', label: 'Start Time', type: 'time', required: true },
      { key: 'duration', label: 'Duration (minutes)', type: 'text', required: true },
      { key: 'room', label: 'Exam Room', type: 'text', required: true },
      { key: 'proctors', label: 'Proctors', type: 'text' },
      { key: 'instructions', label: 'Special Instructions', type: 'textarea' }
    ]
  },
  {
    id: 'grade-deadline',
    name: 'Grade Submission Deadline',
    description: 'Deadlines for submitting grades',
    category: 'assessments',
    icon: <Schedule />,
    periodType: 'one-time',
    fields: [
      { key: 'courseCode', label: 'Course Code', type: 'text', required: true },
      { key: 'gradeType', label: 'Grade Type', type: 'select', options: ['Midterm Grades', 'Final Grades', 'Assignment Grades', 'Participation Grades'] },
      { key: 'deadline', label: 'Submission Deadline', type: 'date', required: true },
      { key: 'time', label: 'Time', type: 'time', defaultValue: '17:00' },
      { key: 'platform', label: 'Submission Platform', type: 'select', options: ['Student Information System', 'LMS', 'Registrar Portal'] },
      { key: 'reminderDays', label: 'Reminder (days before)', type: 'text', defaultValue: '2' }
    ]
  },

  // Administrative Tasks & Meetings
  {
    id: 'department-meeting',
    name: 'Department Meeting',
    description: 'Regular department or faculty meetings',
    category: 'meetings',
    icon: <Business />,
    periodType: 'recurring',
    fields: [
      { key: 'meetingType', label: 'Meeting Type', type: 'select', options: ['Department Meeting', 'Faculty Senate', 'Committee Meeting', 'Research Group'], required: true },
      { key: 'frequency', label: 'Frequency', type: 'select', options: ['Weekly', 'Bi-weekly', 'Monthly'], required: true },
      { key: 'day', label: 'Day of Week', type: 'select', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], required: true },
      { key: 'time', label: 'Time', type: 'time', required: true },
      { key: 'duration', label: 'Duration (minutes)', type: 'text', defaultValue: '90' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'chairperson', label: 'Chairperson', type: 'text' }
    ]
  },
  {
    id: 'committee-meeting',
    name: 'Committee Meeting',
    description: 'Curriculum, hiring, or other committee meetings',
    category: 'meetings',
    icon: <Group />,
    periodType: 'recurring',
    fields: [
      { key: 'committeeName', label: 'Committee Name', type: 'text', required: true },
      { key: 'committeeType', label: 'Committee Type', type: 'select', options: ['Curriculum Committee', 'Hiring Committee', 'Graduate Committee', 'Research Committee', 'Faculty Development'] },
      { key: 'frequency', label: 'Frequency', type: 'select', options: ['Weekly', 'Bi-weekly', 'Monthly', 'As Needed'] },
      { key: 'day', label: 'Day of Week', type: 'select', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
      { key: 'time', label: 'Time', type: 'time', required: true },
      { key: 'duration', label: 'Duration (minutes)', type: 'text', defaultValue: '120' },
      { key: 'location', label: 'Location', type: 'text' }
    ]
  },
  {
    id: 'syllabus-deadline',
    name: 'Course Syllabus Submission',
    description: 'Deadline for submitting course syllabi',
    category: 'admin',
    icon: <Description />,
    periodType: 'one-time',
    fields: [
      { key: 'courseCode', label: 'Course Code', type: 'text', required: true },
      { key: 'semester', label: 'Semester', type: 'select', options: ['Fall 2024', 'Spring 2025', 'Summer 2025'] },
      { key: 'deadline', label: 'Submission Deadline', type: 'date', required: true },
      { key: 'submissionMethod', label: 'Submission Method', type: 'select', options: ['Email to Department', 'Online Portal', 'Physical Copy'] },
      { key: 'reminderDays', label: 'Reminder (days before)', type: 'text', defaultValue: '5' }
    ]
  },

  // Research Activities
  {
    id: 'research-deadline',
    name: 'Research Deadline',
    description: 'Grant applications, paper submissions, conference deadlines',
    category: 'research',
    icon: <Science />,
    periodType: 'one-time',
    fields: [
      { key: 'deadlineType', label: 'Deadline Type', type: 'select', options: ['Grant Application', 'Paper Submission', 'Conference Abstract', 'Journal Review', 'Report Submission'], required: true },
      { key: 'title', label: 'Title/Name', type: 'text', required: true },
      { key: 'organization', label: 'Organization/Journal', type: 'text' },
      { key: 'deadline', label: 'Deadline', type: 'date', required: true },
      { key: 'time', label: 'Time', type: 'time', defaultValue: '23:59' },
      { key: 'reminderDays', label: 'Reminder (days before)', type: 'text', defaultValue: '7' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  {
    id: 'conference-attendance',
    name: 'Conference Attendance',
    description: 'Academic conferences and presentations',
    category: 'research',
    icon: <Event />,
    periodType: 'specific-dates',
    fields: [
      { key: 'conferenceName', label: 'Conference Name', type: 'text', required: true },
      { key: 'location', label: 'Location', type: 'text', required: true },
      { key: 'startDate', label: 'Start Date', type: 'date', required: true },
      { key: 'endDate', label: 'End Date', type: 'date', required: true },
      { key: 'participationType', label: 'Participation', type: 'select', options: ['Presenter', 'Attendee', 'Keynote Speaker', 'Panel Member'] },
      { key: 'presentationTitle', label: 'Presentation Title', type: 'text' },
      { key: 'travelRequired', label: 'Travel Required', type: 'select', options: ['Yes', 'No'] }
    ]
  },
  {
    id: 'lab-schedule',
    name: 'Research Lab Schedule',
    description: 'Regular research lab time and experiments',
    category: 'research',
    icon: <Science />,
    periodType: 'recurring',
    fields: [
      { key: 'labActivity', label: 'Lab Activity', type: 'text', required: true },
      { key: 'labLocation', label: 'Lab Location', type: 'text', required: true },
      { key: 'days', label: 'Days', type: 'multiselect', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
      { key: 'time', label: 'Start Time', type: 'time', required: true },
      { key: 'duration', label: 'Duration (hours)', type: 'text', defaultValue: '4' },
      { key: 'equipment', label: 'Required Equipment', type: 'textarea' }
    ]
  }
];

interface WorkflowDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateWorkflow: (template: WorkflowTemplate, data: any) => void;
}

export function WorkflowDialog({ open, onClose, onCreateWorkflow }: WorkflowDialogProps) {
  const intl = useIntl();
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activeCategory, setActiveCategory] = useState<string>('classes');

  const categories = [
    { 
      id: 'classes', 
      label: intl.formatMessage({ 
        id: 'homepage.scheduledTasks.category.classes', 
        defaultMessage: 'Classes & Lectures' 
      }), 
      icon: <School /> 
    },
    { 
      id: 'student', 
      label: intl.formatMessage({ 
        id: 'homepage.scheduledTasks.category.student', 
        defaultMessage: 'Student-Related' 
      }), 
      icon: <Person /> 
    },
    { 
      id: 'assessments', 
      label: intl.formatMessage({ 
        id: 'homepage.scheduledTasks.category.assessments', 
        defaultMessage: 'Assessments & Deadlines' 
      }), 
      icon: <Assignment /> 
    },
    { 
      id: 'meetings', 
      label: intl.formatMessage({ 
        id: 'homepage.scheduledTasks.category.meetings', 
        defaultMessage: 'Meetings' 
      }), 
      icon: <Business /> 
    },
    { 
      id: 'research', 
      label: intl.formatMessage({ 
        id: 'homepage.scheduledTasks.category.research', 
        defaultMessage: 'Research Activities' 
      }), 
      icon: <Science /> 
    },
    { 
      id: 'admin', 
      label: intl.formatMessage({ 
        id: 'homepage.scheduledTasks.category.admin', 
        defaultMessage: 'Administrative Tasks' 
      }), 
      icon: <Event /> 
    }
  ];

  const handleTemplateSelect = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    // Initialize form data with default values
    const initialData: Record<string, any> = {};
    template.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        initialData[field.key] = field.defaultValue;
      }
    });
    setFormData(initialData);
  };

  const handleFieldChange = (fieldKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const handleCreateWorkflow = () => {
    if (selectedTemplate) {
      onCreateWorkflow(selectedTemplate, formData);
      onClose();
      setSelectedTemplate(null);
      setFormData({});
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedTemplate(null);
    setFormData({});
  };

  const renderField = (field: any) => {
    const value = formData[field.key] || '';

    switch (field.type) {
      case 'text':
        return (
          <TextField
            fullWidth
            label={field.label}
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            required={field.required}
            size="small"
          />
        );
      case 'textarea':
        return (
          <TextField
            fullWidth
            label={field.label}
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            multiline
            rows={3}
            size="small"
          />
        );
      case 'time':
        return (
          <TextField
            fullWidth
            label={field.label}
            type="time"
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            required={field.required}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        );
      case 'date':
        return (
          <TextField
            fullWidth
            label={field.label}
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            required={field.required}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        );
      case 'select':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              label={field.label}
            >
              {field.options?.map((option: string) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 'multiselect':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{field.label}</InputLabel>
            <Select
              multiple
              value={Array.isArray(value) ? value : []}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              label={field.label}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((val) => (
                    <Chip key={val} label={val} size="small" />
                  ))}
                </Box>
              )}
            >
              {field.options?.map((option: string) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      default:
        return null;
    }
  };

  const filteredTemplates = WORKFLOW_TEMPLATES.filter(t => t.category === activeCategory);

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { minHeight: '70vh' } }}
    >
      <DialogTitle>
        {selectedTemplate ? 
          intl.formatMessage({ id: 'workflow.dialog.configureWorkflow', defaultMessage: 'Configure Workflow' }) : 
          intl.formatMessage({ id: 'workflow.dialog.chooseTemplate', defaultMessage: 'Choose Workflow Template' })
        }
      </DialogTitle>
      
      <DialogContent>
        {!selectedTemplate ? (
          <Box>
            {/* Category Selection */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                {intl.formatMessage({ id: 'workflow.dialog.categories', defaultMessage: 'Categories' })}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {categories.map(category => (
                  <Chip
                    key={category.id}
                    label={category.label}
                    icon={category.icon}
                    onClick={() => setActiveCategory(category.id)}
                    color={activeCategory === category.id ? 'primary' : 'default'}
                    variant={activeCategory === category.id ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Box>

            {/* Template Grid - Full Row Layout */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filteredTemplates.map(template => (
                <Card 
                  key={template.id}
                  sx={{ 
                    cursor: 'pointer',
                    width: '100%',
                    '&:hover': { 
                      boxShadow: 3,
                      transform: 'translateY(-1px)',
                      transition: 'all 0.2s ease-in-out'
                    }
                  }}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                      {/* Icon */}
                      <Box sx={{ 
                        color: 'primary.main', 
                        mt: 0.5,
                        fontSize: '2rem',
                        minWidth: 48,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {template.icon}
                      </Box>
                      
                      {/* Main Content */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 'medium', color: 'text.primary' }}>
                            {template.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, ml: 2, flexShrink: 0 }}>
                            <Chip 
                              label={template.periodType.replace('-', ' ')}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                            <Chip 
                              label={template.category}
                              size="small"
                              variant="filled"
                              color="secondary"
                              sx={{ textTransform: 'capitalize' }}
                            />
                          </Box>
                        </Box>
                        
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5 }}>
                          {template.description}
                        </Typography>
                        
                        {/* Schedule Preview */}
                        {template.defaultSchedule && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 2, 
                            p: 1.5, 
                            bgcolor: 'action.hover', 
                            borderRadius: 1,
                            mb: 2
                          }}>
                            <Schedule sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
                            <Typography variant="body2" color="text.secondary">
                              {template.defaultSchedule.frequency && (
                                <>
                                  {template.defaultSchedule.frequency === 'weekly' && template.defaultSchedule.days ? 
                                    `${template.defaultSchedule.days.join(', ')} at ${template.defaultSchedule.time}` :
                                    `${template.defaultSchedule.frequency} at ${template.defaultSchedule.time}`
                                  }
                                  {template.defaultSchedule.duration && ` (${template.defaultSchedule.duration} min)`}
                                </>
                              )}
                            </Typography>
                          </Box>
                        )}
                        
                        {/* Field Count */}
                        <Typography variant="caption" color="text.secondary">
                          {template.fields.length} {intl.formatMessage({ 
                            id: template.fields.length === 1 ? 'workflow.dialog.configurationFields' : 'workflow.dialog.configurationFieldsPlural', 
                            defaultMessage: template.fields.length === 1 ? 'configuration field' : 'configuration fields' 
                          })}
                        </Typography>
                      </Box>
                      
                      {/* Action Arrow */}
                      <Box sx={{ 
                        color: 'action.active',
                        display: 'flex',
                        alignItems: 'center',
                        ml: 1
                      }}>
                        <Typography variant="h5">→</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        ) : (
          <Box>
            {/* Selected Template Form */}
            <Box sx={{ mb: 3 }}>
              <Button 
                onClick={() => setSelectedTemplate(null)}
                sx={{ mb: 2 }}
              >
                {intl.formatMessage({ id: 'workflow.dialog.backToTemplates', defaultMessage: '← Back to Templates' })}
              </Button>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {selectedTemplate.icon}
                <Box>
                  <Typography variant="h6">{selectedTemplate.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedTemplate.description}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Form Fields */}
            <Grid container spacing={2}>
              {selectedTemplate.fields.map(field => (
                <Grid size={{ xs: 12, md: 6 }} key={field.key}>
                  {renderField(field)}
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          {intl.formatMessage({ id: 'workflow.dialog.cancel', defaultMessage: 'Cancel' })}
        </Button>
        {selectedTemplate && (
          <Button 
            onClick={handleCreateWorkflow}
            variant="contained"
            startIcon={<Add />}
          >
            {intl.formatMessage({ id: 'workflow.dialog.createWorkflow', defaultMessage: 'Create Workflow' })}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default WorkflowDialog;
