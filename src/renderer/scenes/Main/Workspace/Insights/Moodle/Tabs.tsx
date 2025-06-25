import { Box, List, ListItem, ListItemButton, ListItemText, ListItemIcon, Divider } from "@mui/material";
import { useState, useEffect } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

interface MoodleTabsProps {
  workspaceId: string;
  selectedTab: string;
  onTabChange: (tab: string) => void;
}

export default function MoodleTabs({ workspaceId, selectedTab, onTabChange }: MoodleTabsProps) {
  const intl = useIntl();

  const tabs = [
    {
      id: 'overview',
      label: intl.formatMessage({ id: "workspace.insights.moodle.tabs.overview", defaultMessage: "Overview" }),
      icon: AnalyticsIcon,
      description: intl.formatMessage({ id: "workspace.insights.moodle.tabs.overview.description", defaultMessage: "Course summary and key metrics" })
    },
    {
      id: 'autograde',
      label: intl.formatMessage({ id: "workspace.insights.moodle.tabs.autograde", defaultMessage: "AutoGrade" }),
      icon: AutoFixHighIcon,
      description: intl.formatMessage({ id: "workspace.insights.moodle.tabs.autograde.description", defaultMessage: "Automated grading and feedback" })
    },
    {
      id: 'deeptrend',
      label: intl.formatMessage({ id: "workspace.insights.moodle.tabs.deeptrend", defaultMessage: "DeepTrend" }),
      icon: TrendingUpIcon,
      description: intl.formatMessage({ id: "workspace.insights.moodle.tabs.deeptrend.description", defaultMessage: "Advanced analytics and trends" })
    }
  ];

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
      <List component="nav" dense>
        {tabs.map((tab, index) => {
          const IconComponent = tab.icon;
          const isSelected = selectedTab === tab.id;
          
          return (
            <Box key={tab.id}>
              <ListItem disablePadding>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => onTabChange(tab.id)}
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
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <IconComponent fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={tab.label}
                    secondary={!isSelected ? tab.description : undefined}
                    slotProps={{
                      primary: {
                        variant: 'body2',
                        fontWeight: isSelected ? 'medium' : 'regular'
                      },
                      secondary: {
                        variant: 'caption',
                        sx: { 
                          fontSize: '0.7rem',
                          lineHeight: 1.2,
                          mt: 0.5
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
