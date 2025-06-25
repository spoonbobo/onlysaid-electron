import { Box, Typography } from "@mui/material";
import { useState, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import MenuListItem from "@/renderer/components/Navigation/MenuListItem";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import SchoolIcon from "@mui/icons-material/School";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

export default function WorkspaceInsightsMenu() {
  const { selectedContext } = useCurrentTopicContext();
  const selectedTopics = useTopicStore((state) => state.selectedTopics);
  const setSelectedTopic = useTopicStore((state) => state.setSelectedTopic);

  const workspaceId = selectedContext?.id || '';
  const section = selectedContext?.section || '';
  const selectedSubcategory = section ? selectedTopics[section] || '' : '';

  const handleSelectInsight = (insightType: string) => {
    setSelectedTopic(section, insightType);
  };

  // Available insight services
  const insightServices = [
    {
      id: 'moodle',
      name: 'Moodle Learning Analytics',
      icon: SchoolIcon,
      description: 'Course progress and student performance insights',
      disabled: false
    }
  ];

  try {
    return (
      <Box sx={{ mt: 2, px: 2 }}>
        <Box sx={{ mt: 2 }}>
          {insightServices.length > 0 ? (
            insightServices.map((service) => {
              const IconComponent = service.icon;
              
              return (
                <MenuListItem
                  key={service.id}
                  label={
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      width: '100%',
                      pr: 1
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <IconComponent sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {service.name}
                        </Typography>
                      </Box>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'text.secondary', 
                          ml: 3, 
                          fontSize: '0.7rem',
                          lineHeight: 1.2
                        }}
                      >
                        {service.description}
                      </Typography>
                    </Box>
                  }
                  isSelected={selectedSubcategory === service.id}
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
