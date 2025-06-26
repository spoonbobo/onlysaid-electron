import { Box, List, ListItem, ListItemButton, ListItemText, ListItemIcon, Divider, Typography } from "@mui/material";
import { useState, useEffect } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BackupIcon from "@mui/icons-material/Backup";
import ArchitectureIcon from "@mui/icons-material/Architecture";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PublishIcon from "@mui/icons-material/Publish";

interface MoodleTabsProps {
  workspaceId: string;
  selectedTab: string;
  onTabChange: (tab: string) => void;
}

export default function MoodleTabs({ workspaceId, selectedTab, onTabChange }: MoodleTabsProps) {
  const intl = useIntl();

  // Array of disabled tab IDs
  const disabledTabs = [
    'deeptrend',
    'coursearchitect', 
    'semesterreport',
    'insightsreleaser',
    'safebackup'
  ];

  const tabs = [
    {
      id: 'overview',
      label: intl.formatMessage({ id: "workspace.insights.moodle.tabs.overview", defaultMessage: "Overview" }),
      keyWord: "OVERVIEW",
      icon: AnalyticsIcon,
      description: intl.formatMessage({ id: "workspace.insights.moodle.tabs.overview.description", defaultMessage: "Course summary and key metrics" })
    },
    {
      id: 'autograde',
      label: intl.formatMessage({ id: "workspace.insights.moodle.tabs.autograde", defaultMessage: "AutoGrade" }),
      keyWord: "AUTOGRADE",
      icon: AutoFixHighIcon,
      description: intl.formatMessage({ id: "workspace.insights.moodle.tabs.autograde.description", defaultMessage: "Automated grading and feedback" })
    },
    {
      id: 'deeptrend',
      label: intl.formatMessage({ id: "workspace.insights.moodle.tabs.deeptrend", defaultMessage: "DeepTrend" }),
      keyWord: "DEEPTREND",
      icon: TrendingUpIcon,
      description: intl.formatMessage({ id: "workspace.insights.moodle.tabs.deeptrend.description", defaultMessage: "Advanced analytics and trends" })
    },
    {
      id: 'coursearchitect',
      label: intl.formatMessage({ id: "workspace.insights.moodle.tabs.coursearchitect", defaultMessage: "CourseArchitect" }),
      keyWord: "ARCHITECT",
      icon: ArchitectureIcon,
      description: intl.formatMessage({ id: "workspace.insights.moodle.tabs.coursearchitect.description", defaultMessage: "Course design and structure management" })
    },
    {
      id: 'semesterreport',
      label: intl.formatMessage({ id: "workspace.insights.moodle.tabs.semesterreport", defaultMessage: "Semester Report" }),
      keyWord: "REPORT",
      icon: AssessmentIcon,
      description: intl.formatMessage({ id: "workspace.insights.moodle.tabs.semesterreport.description", defaultMessage: "Comprehensive semester reporting and analytics" })
    },
    {
      id: 'insightsreleaser',
      label: intl.formatMessage({ id: "workspace.insights.moodle.tabs.insightsreleaser", defaultMessage: "Insights Releaser" }),
      keyWord: "RELEASER",
      icon: PublishIcon,
      description: intl.formatMessage({ id: "workspace.insights.moodle.tabs.insightsreleaser.description", defaultMessage: "Release and publish academic results and insights" })
    },
    {
      id: 'safebackup',
      label: intl.formatMessage({ id: "workspace.insights.moodle.tabs.safebackup", defaultMessage: "SafeBackup" }),
      keyWord: "BACKUP",
      icon: BackupIcon,
      description: intl.formatMessage({ id: "workspace.insights.moodle.tabs.safebackup.description", defaultMessage: "Secure backup and restore functionality" })
    }
  ];

  // Custom render function for tab labels with colored keywords
  const renderTabLabel = (tab: any, isSelected: boolean, isDisabled: boolean) => {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: isSelected ? 'medium' : 'regular',
            color: isDisabled 
              ? 'text.disabled' 
              : isSelected 
                ? 'primary.contrastText' 
                : 'text.primary',
            fontSize: '0.875rem'
          }}
        >
          {tab.label}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: isSelected ? 'medium' : 'regular',
            color: isDisabled 
              ? 'text.disabled' 
              : isSelected 
                ? 'primary.contrastText' 
                : 'primary.main',
            fontSize: '0.875rem',
            letterSpacing: '0.5px'
          }}
        >
          {tab.keyWord}
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
      <List component="nav" dense>
        {tabs.map((tab, index) => {
          const IconComponent = tab.icon;
          const isSelected = selectedTab === tab.id;
          const isDisabled = disabledTabs.includes(tab.id);
          
          return (
            <Box key={tab.id}>
              <ListItem disablePadding>
                <ListItemButton
                  selected={isSelected}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && onTabChange(tab.id)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      }
                    },
                    '&:hover': {
                      bgcolor: isSelected ? 'primary.dark' : 'action.hover',
                    },
                    '&.Mui-disabled': {
                      opacity: 0.5,
                      '& .MuiListItemIcon-root': {
                        color: 'text.disabled',
                      }
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <IconComponent fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={renderTabLabel(tab, isSelected, isDisabled)}
                    secondary={!isSelected && !isDisabled ? tab.description : undefined}
                    slotProps={{
                      secondary: {
                        variant: 'caption',
                        sx: { 
                          fontSize: '0.7rem',
                          lineHeight: 1.2,
                          mt: 0.5,
                          color: isDisabled ? 'text.disabled' : 'text.secondary'
                        }
                      }
                    }}
                  />
                </ListItemButton>
              </ListItem>
              {index < tabs.length - 1 && <Divider />}
            </Box>
          );
        })}
      </List>
    </Box>
  );
}
