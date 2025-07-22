import { Box, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import MenuListItem from "@/renderer/components/Navigation/MenuListItem";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import SchoolIcon from "@mui/icons-material/School";
import QuizIcon from "@mui/icons-material/Quiz";
import AssignmentIcon from "@mui/icons-material/Assignment";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";

export default function MyPartnerMenu() {
  const intl = useIntl();
  const { selectedContext } = useCurrentTopicContext();
  const selectedTopics = useTopicStore((state) => state.selectedTopics);
  const setSelectedTopic = useTopicStore((state) => state.setSelectedTopic);

  const workspaceId = selectedContext?.id || '';
  const section = selectedContext?.section || '';
  const selectedSubcategory = section ? selectedTopics[section] || '' : '';

  const handleSelectPartner = (partnerType: string) => {
    setSelectedTopic(section, partnerType);
  };

  const handleSelectCourseworkTab = (tabId: string) => {
    setSelectedTopic('coursework-helper-tabs', tabId);
  };

  // Available partner services
  const partnerServices = [
    {
      id: 'coursework-helper',
      name: intl.formatMessage({ id: "workspace.mypartner.services.courseworkHelper", defaultMessage: "Coursework Helper" }),
      icon: SchoolIcon,
      disabled: false
    }
  ];

  // Coursework Helper tabs configuration
  const courseworkTabs = [
    {
      id: 'assignments',
      label: intl.formatMessage({ id: "workspace.mypartner.coursework.tabs.assignments", defaultMessage: "Assignments" }),
      icon: AssignmentIcon,
      disabled: false
    },
    {
      id: 'quiz-help',
      label: intl.formatMessage({ id: "workspace.mypartner.coursework.tabs.quizHelp", defaultMessage: "Quiz Help" }),
      icon: QuizIcon,
      disabled: false
    },
    {
      id: 'research',
      label: intl.formatMessage({ id: "workspace.mypartner.coursework.tabs.research", defaultMessage: "Research" }),
      icon: LibraryBooksIcon,
      disabled: true
    }
  ];

  // Get current selected tab for coursework helper
  const selectedCourseworkTab = selectedTopics['coursework-helper-tabs'] || 'assignments';

  // Check if Coursework Helper is selected
  const isCourseworkSelected = selectedSubcategory === 'coursework-helper';

  try {
    return (
      <Box sx={{ mt: 2, px: 2 }}>
        <Box sx={{ mt: 2 }}>
          {partnerServices.length > 0 ? (
            partnerServices.map((service) => {
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
                    onClick={() => !service.disabled && handleSelectPartner(service.id)}
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
                  
                  {/* Show Coursework tabs when Coursework Helper is selected */}
                  {service.id === 'coursework-helper' && isServiceSelected && (
                    <Box sx={{ ml: 2, mt: 1, mb: 1 }}>
                      {courseworkTabs.map((tab) => {
                        const TabIconComponent = tab.icon;
                        const isTabSelected = selectedCourseworkTab === tab.id;
                        
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
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: isTabSelected ? 'medium' : 'regular',
                                    color: tab.disabled 
                                      ? 'text.disabled' 
                                      : isTabSelected 
                                        ? 'primary.main' 
                                        : 'text.primary',
                                    fontSize: '0.8rem'
                                  }}
                                >
                                  {tab.label}
                                </Typography>
                              </Box>
                            }
                            isSelected={isTabSelected}
                            onClick={() => !tab.disabled && handleSelectCourseworkTab(tab.id)}
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
              <FormattedMessage id="workspace.mypartner.noServices" defaultMessage="No partner services available" />
            </Box>
          )}
        </Box>
      </Box>
    );
  } catch (error) {
    console.error("Error in MyPartnerMenu:", error);
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        An error occurred loading the partner menu.
      </Box>
    );
  }
}
