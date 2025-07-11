import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Divider
} from '@mui/material';
import {
  School,
  Assignment,
  Group,
  Event,
  Science,
  Business,
  Person
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { WorkflowTemplateGridProps } from './types';

export function WorkflowTemplateGrid({
  templates,
  activeCategory,
  onCategoryChange,
  onTemplateSelect,
  getPeriodTypeLabel,
  getCategoryLabel
}: WorkflowTemplateGridProps) {
  const intl = useIntl();

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

  const filteredTemplates = templates.filter(t => t.category === activeCategory);

  return (
    <Box>
      {/* Category Selection */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          {intl.formatMessage({ id: 'workflow.dialog.categories', defaultMessage: 'Categories' })}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {categories.map(category => {
            const hasTemplates = templates.some(t => t.category === category.id);
            return (
              <Chip
                key={category.id}
                label={category.label}
                icon={category.icon}
                onClick={hasTemplates ? () => onCategoryChange(category.id) : undefined}
                color={activeCategory === category.id ? 'primary' : 'default'}
                variant={activeCategory === category.id ? 'filled' : 'outlined'}
                disabled={!hasTemplates}
                sx={{ 
                  cursor: hasTemplates ? 'pointer' : 'not-allowed',
                  opacity: hasTemplates ? 1 : 0.5
                }}
              />
            );
          })}
        </Box>
      </Box>

      {/* Template Grid - Compact Layout */}
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {filteredTemplates.map((template, index) => (
          <Box key={template.id}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                width: '100%',
                boxShadow: 'none',
                border: 'none'
              }}
              onClick={() => onTemplateSelect(template)}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {/* Icon */}
                  <Box sx={{ 
                    color: 'primary.main', 
                    fontSize: '1.5rem',
                    minWidth: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {typeof template.icon === 'string' ? (
                      // Map string to actual icon
                      template.icon === 'School' ? <School /> : <Group />
                    ) : (
                      template.icon
                    )}
                  </Box>
                  
                  {/* Main Content */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'medium', color: 'text.primary' }}>
                        {template.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, ml: 2, flexShrink: 0 }}>
                        <Chip 
                          label={getCategoryLabel(template.category)}
                          size="small"
                          variant="filled"
                          color="secondary"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.3 }}>
                      {template.description}
                    </Typography>
                    
                  </Box>
                  
                  {/* Action Arrow */}
                  <Box sx={{ 
                    color: 'action.active',
                    display: 'flex',
                    alignItems: 'center',
                    ml: 1
                  }}>
                    <Typography variant="h6">→</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
            {/* Light separator - show for all items except the last one */}
            {index < filteredTemplates.length - 1 && (
              <Divider sx={{ mx: 2 }} />
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
} 