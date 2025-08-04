import { Box, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import MenuListItem from "@/renderer/components/Navigation/MenuListItem";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";

export default function ResearchMenu() {
  const intl = useIntl();
  const { selectedContext } = useCurrentTopicContext();
  const selectedTopics = useTopicStore((state) => state.selectedTopics);
  const setSelectedTopic = useTopicStore((state) => state.setSelectedTopic);

  const workspaceId = selectedContext?.id || '';
  const section = selectedContext?.section || '';
  const selectedSubcategory = section ? selectedTopics[section] || '' : '';

  const handleSelectResearchType = (researchType: string) => {
    setSelectedTopic(section, researchType);
  };

  // Research helper types/categories
  const researchTypes = [
    {
      id: 'topic-exploration',
      label: intl.formatMessage({ id: "workspace.mypartner.research.topicExploration", defaultMessage: "Topic Exploration" }),
      disabled: false
    },
    {
      id: 'literature-search',
      label: intl.formatMessage({ id: "workspace.mypartner.research.literatureSearch", defaultMessage: "Literature Search" }),
      disabled: false
    },
    {
      id: 'source-evaluation',
      label: intl.formatMessage({ id: "workspace.mypartner.research.sourceEvaluation", defaultMessage: "Source Evaluation" }),
      disabled: false
    },
    {
      id: 'citation-help',
      label: intl.formatMessage({ id: "workspace.mypartner.research.citationHelp", defaultMessage: "Citation Help" }),
      disabled: false
    },
    {
      id: 'research-methodology',
      label: intl.formatMessage({ id: "workspace.mypartner.research.methodology", defaultMessage: "Research Methodology" }),
      disabled: false
    },
    {
      id: 'data-analysis',
      label: intl.formatMessage({ id: "workspace.mypartner.research.dataAnalysis", defaultMessage: "Data Analysis" }),
      disabled: true // Coming soon
    }
  ];

  // Get current selected research type
  const selectedResearchType = selectedTopics['research-type'] || '';

  try {
    return (
      <Box sx={{ mt: 2, px: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 'medium', 
            color: 'text.primary',
            display: 'flex',
            alignItems: 'center',
            mb: 2
          }}>
            <LibraryBooksIcon sx={{ mr: 1, fontSize: 20 }} />
            <FormattedMessage 
              id="workspace.mypartner.research.title" 
              defaultMessage="Research Helper" 
            />
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: 3.5 }}>
            <FormattedMessage 
              id="workspace.mypartner.research.description" 
              defaultMessage="Get support with research methods, source finding, and academic investigation." 
            />
          </Typography>
        </Box>

        <Box sx={{ mt: 2 }}>
          {researchTypes.length > 0 ? (
            researchTypes.map((type) => {
              const isTypeSelected = selectedResearchType === type.id;
              
              return (
                <MenuListItem
                  key={type.id}
                  label={
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      width: '100%',
                      pr: 1
                    }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isTypeSelected ? 'medium' : 'regular',
                          color: type.disabled 
                            ? 'text.disabled' 
                            : isTypeSelected 
                              ? 'primary.main' 
                              : 'text.primary',
                          fontSize: '0.875rem'
                        }}
                      >
                        {type.label}
                      </Typography>
                      {type.disabled && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            ml: 'auto', 
                            color: 'text.disabled',
                            fontSize: '0.75rem'
                          }}
                        >
                          <FormattedMessage 
                            id="common.comingSoon" 
                            defaultMessage="Coming Soon" 
                          />
                        </Typography>
                      )}
                    </Box>
                  }
                  isSelected={isTypeSelected}
                  onClick={() => !type.disabled && handleSelectResearchType(type.id)}
                  sx={{ 
                    pl: 4,
                    py: 1.5,
                    opacity: type.disabled ? 0.4 : 1,
                    cursor: type.disabled ? 'not-allowed' : 'pointer',
                    pointerEvents: type.disabled ? 'none' : 'auto',
                    '& .MuiListItemText-root': {
                      margin: 0,
                    },
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                    }
                  }}
                />
              );
            })
          ) : (
            <Box sx={{ pl: 4, py: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
              <FormattedMessage 
                id="workspace.mypartner.research.noTypes" 
                defaultMessage="No research types available" 
              />
            </Box>
          )}
        </Box>
      </Box>
    );
  } catch (error) {
    console.error("Error in ResearchMenu:", error);
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        <FormattedMessage 
          id="workspace.mypartner.research.error" 
          defaultMessage="An error occurred loading the research menu." 
        />
      </Box>
    );
  }
} 