import { Box, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import MenuListItem from "@/renderer/components/Navigation/MenuListItem";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import AssignmentIcon from "@mui/icons-material/Assignment";

export default function AssignmentMenu() {
  const intl = useIntl();
  const { selectedContext } = useCurrentTopicContext();
  const selectedTopics = useTopicStore((state) => state.selectedTopics);
  const setSelectedTopic = useTopicStore((state) => state.setSelectedTopic);

  const workspaceId = selectedContext?.id || '';
  const section = selectedContext?.section || '';
  const selectedSubcategory = section ? selectedTopics[section] || '' : '';

  const handleSelectAssignment = (assignmentType: string) => {
    setSelectedTopic(section, assignmentType);
  };

  // Assignment types/categories
  const assignmentTypes = [
    {
      id: 'essay-writing',
      label: intl.formatMessage({ id: "workspace.mypartner.assignment.essayWriting", defaultMessage: "Essay Writing" }),
      disabled: false
    },
    {
      id: 'research-paper',
      label: intl.formatMessage({ id: "workspace.mypartner.assignment.researchPaper", defaultMessage: "Research Paper" }),
      disabled: false
    },
    {
      id: 'project-proposal',
      label: intl.formatMessage({ id: "workspace.mypartner.assignment.projectProposal", defaultMessage: "Project Proposal" }),
      disabled: false
    },
    {
      id: 'literature-review',
      label: intl.formatMessage({ id: "workspace.mypartner.assignment.literatureReview", defaultMessage: "Literature Review" }),
      disabled: false
    },
    {
      id: 'case-study',
      label: intl.formatMessage({ id: "workspace.mypartner.assignment.caseStudy", defaultMessage: "Case Study" }),
      disabled: false
    }
  ];

  // Get current selected assignment type
  const selectedAssignmentType = selectedTopics['assignment-type'] || '';

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
            <AssignmentIcon sx={{ mr: 1, fontSize: 20 }} />
            <FormattedMessage 
              id="workspace.mypartner.assignment.title" 
              defaultMessage="Assignment Helper" 
            />
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: 3.5 }}>
            <FormattedMessage 
              id="workspace.mypartner.assignment.description" 
              defaultMessage="Get help with various types of assignments and academic writing tasks." 
            />
          </Typography>
        </Box>

        <Box sx={{ mt: 2 }}>
          {assignmentTypes.length > 0 ? (
            assignmentTypes.map((type) => {
              const isTypeSelected = selectedAssignmentType === type.id;
              
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
                    </Box>
                  }
                  isSelected={isTypeSelected}
                  onClick={() => !type.disabled && handleSelectAssignment(type.id)}
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
                id="workspace.mypartner.assignment.noTypes" 
                defaultMessage="No assignment types available" 
              />
            </Box>
          )}
        </Box>
      </Box>
    );
  } catch (error) {
    console.error("Error in AssignmentMenu:", error);
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        <FormattedMessage 
          id="workspace.mypartner.assignment.error" 
          defaultMessage="An error occurred loading the assignment menu." 
        />
      </Box>
    );
  }
} 