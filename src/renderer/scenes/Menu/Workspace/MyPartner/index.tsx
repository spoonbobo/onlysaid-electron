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

  // Available partner services - now separate modules
  const partnerServices = [
    {
      id: 'assignment',
      name: intl.formatMessage({ id: "workspace.mypartner.services.assignment", defaultMessage: "Assignment Helper" }),
      icon: AssignmentIcon,
      disabled: false
    },
    {
      id: 'quiz-helper',
      name: intl.formatMessage({ id: "workspace.mypartner.services.quizHelper", defaultMessage: "Quiz Helper" }),
      icon: QuizIcon,
      disabled: false
    },
    {
      id: 'research',
      name: intl.formatMessage({ id: "workspace.mypartner.services.research", defaultMessage: "Research Helper" }),
      icon: LibraryBooksIcon,
      disabled: false
    }
  ];

  try {
    return (
      <Box sx={{ mt: 2, px: 2 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 'medium', 
            color: 'text.primary',
            display: 'flex',
            alignItems: 'center',
            mb: 1
          }}>
            <SchoolIcon sx={{ mr: 1, fontSize: 20 }} />
            <FormattedMessage 
              id="workspace.mypartner.title" 
              defaultMessage="My Partner" 
            />
          </Typography>
        </Box>

        {/* Service Selection */}
        <Box sx={{ mt: 2 }}>
          {partnerServices.length > 0 ? (
            partnerServices.map((service) => {
              const IconComponent = service.icon;
              const isServiceSelected = selectedSubcategory === service.id;
              
              return (
                <MenuListItem
                  key={service.id}
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
        <FormattedMessage 
          id="workspace.mypartner.error" 
          defaultMessage="An error occurred loading the partner menu." 
        />
      </Box>
    );
  }
}
