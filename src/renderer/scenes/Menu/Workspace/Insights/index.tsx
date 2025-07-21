import { Box, Typography } from "@mui/material";
import { useState, useEffect } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import MenuListItem from "@/renderer/components/Navigation/MenuListItem";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import SchoolIcon from "@mui/icons-material/School";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import BackupIcon from "@mui/icons-material/Backup";
import ArchitectureIcon from "@mui/icons-material/Architecture";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PublishIcon from "@mui/icons-material/Publish";

export default function WorkspaceInsightsMenu() {
  const intl = useIntl();
  const { selectedContext } = useCurrentTopicContext();
  const selectedTopics = useTopicStore((state) => state.selectedTopics);
  const setSelectedTopic = useTopicStore((state) => state.setSelectedTopic);

  const workspaceId = selectedContext?.id || '';
  const section = selectedContext?.section || '';
  const selectedSubcategory = section ? selectedTopics[section] || '' : '';

  const handleSelectInsight = (insightType: string) => {
    setSelectedTopic(section, insightType);
  };

  const handleSelectMoodleTab = (tabId: string) => {
    setSelectedTopic('moodle-insights', tabId);
  };

  // Available insight services
  const insightServices = [
    {
      id: 'moodle',
      name: intl.formatMessage({ id: "workspace.insights.services.moodle", defaultMessage: "Moodle Learning Analytics" }),
      icon: SchoolIcon,
      disabled: false
    },
    {
      id: 'meeting-summarizer',
      name: intl.formatMessage({ id: "workspace.insights.services.meetingSummarizer", defaultMessage: "Meeting Summarizer" }),
      icon: AnalyticsIcon,
      disabled: false
    }
  ];

  // Moodle tabs configuration
  const moodleTabs = [
    {
      id: 'overview',
      label: intl.formatMessage({ id: "workspace.insights.moodle.tabs.overview", defaultMessage: "Overview" }),
      keyWord: "OVERVIEW",
      icon: AnalyticsIcon,
      disabled: false
    },
    {
      id: 'autograde',
      label: intl.formatMessage({ id: "workspace.insights.moodle.tabs.autograde", defaultMessage: "AutoGrade" }),
      keyWord: "AUTOGRADE",
      icon: AutoFixHighIcon,
      disabled: false
    },
    {
      id: 'deeptrend',
      label: intl.formatMessage({ id: "workspace.insights.moodle.tabs.deeptrend", defaultMessage: "DeepTrend" }),
      keyWord: "DEEPTREND",
      icon: TrendingUpIcon,
      disabled: true
    },
    {
      id: 'coursearchitect',
      label: intl.formatMessage({ id: "workspace.insights.moodle.tabs.coursearchitect", defaultMessage: "CourseArchitect" }),
      keyWord: "ARCHITECT",
      icon: ArchitectureIcon,
      disabled: true
    },
    {
      id: 'semesterreport',
      label: intl.formatMessage({ id: "workspace.insights.moodle.tabs.semesterreport", defaultMessage: "Semester Report" }),
      keyWord: "REPORT",
      icon: AssessmentIcon,
      disabled: true
    },
    {
      id: 'insightsreleaser',
      label: intl.formatMessage({ id: "workspace.insights.moodle.tabs.insightsreleaser", defaultMessage: "Insights Releaser" }),
      keyWord: "RELEASER",
      icon: PublishIcon,
      disabled: true
    },
    {
      id: 'safebackup',
      label: intl.formatMessage({ id: "workspace.insights.moodle.tabs.safebackup", defaultMessage: "SafeBackup" }),
      keyWord: "BACKUP",
      icon: BackupIcon,
      disabled: true
    }
  ];

  // Get current selected tab for moodle
  const selectedMoodleTab = selectedTopics['moodle-insights'] || 'overview';

  // Check if Moodle is selected
  const isMoodleSelected = selectedSubcategory === 'moodle';

  const renderMoodleTabLabel = (tab: any, isSelected: boolean, isDisabled: boolean) => {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: isSelected ? 'medium' : 'regular',
            color: isDisabled 
              ? 'text.disabled' 
              : isSelected 
                ? 'primary.main' 
                : 'text.primary',
            fontSize: '0.8rem'
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
                ? 'primary.main' 
                : 'text.secondary',
            fontSize: '0.75rem',
            letterSpacing: '0.5px'
          }}
        >
          {tab.keyWord}
        </Typography>
      </Box>
    );
  };

  try {
    return (
      <Box sx={{ mt: 2, px: 2 }}>
        <Box sx={{ mt: 2 }}>
          {insightServices.length > 0 ? (
            insightServices.map((service) => {
              const IconComponent = service.icon;
              const isServiceSelected = selectedSubcategory === service.id;
              
              return (
                <Box key={service.id}>
                  <MenuListItem
                    label={
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        width: '100%',
                        pr: 1
                      }}>
                        <IconComponent sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {service.name}
                        </Typography>
                      </Box>
                    }
                    isSelected={isServiceSelected}
                    onClick={() => !service.disabled && handleSelectInsight(service.id)}
                    sx={{ 
                      pl: 4,
                      py: 1.5,
                      opacity: service.disabled ? 0.5 : 1,
                      cursor: service.disabled ? 'not-allowed' : 'pointer',
                      pointerEvents: service.disabled ? 'none' : 'auto',
                      '& .MuiListItemText-root': {
                        margin: 0,
                      }
                    }}
                  />
                  
                  {/* Show Moodle tabs when Moodle is selected */}
                  {service.id === 'moodle' && isServiceSelected && (
                    <Box sx={{ ml: 2, mt: 1, mb: 1 }}>
                      {moodleTabs.map((tab) => {
                        const TabIconComponent = tab.icon;
                        const isTabSelected = selectedMoodleTab === tab.id;
                        
                        return (
                          <MenuListItem
                            key={tab.id}
                            label={
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                width: '100%',
                                pr: 1
                              }}>
                                <TabIconComponent sx={{ mr: 1, fontSize: 14, color: 'text.secondary' }} />
                                {renderMoodleTabLabel(tab, isTabSelected, tab.disabled)}
                              </Box>
                            }
                            isSelected={isTabSelected}
                            onClick={() => !tab.disabled && handleSelectMoodleTab(tab.id)}
                            sx={{ 
                              pl: 6,
                              py: 1,
                              opacity: tab.disabled ? 0.4 : 1,
                              cursor: tab.disabled ? 'not-allowed' : 'pointer',
                              pointerEvents: tab.disabled ? 'none' : 'auto',
                              '& .MuiListItemText-root': {
                                margin: 0,
                              },
                              '&.Mui-selected': {
                                bgcolor: 'action.selected',
                              }
                            }}
                          />
                        );
                      })}
                    </Box>
                  )}
                </Box>
              );
            })
          ) : (
            <Box sx={{ pl: 4, py: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
              <FormattedMessage id="workspace.insights.noServices" defaultMessage="No insight services available" />
            </Box>
          )}
        </Box>
      </Box>
    );
  } catch (error) {
    console.error("Error in WorkspaceInsightsMenu:", error);
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        An error occurred loading the insights menu.
      </Box>
    );
  }
}
