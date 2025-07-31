import { Box, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import MenuListItem from "@/renderer/components/Navigation/MenuListItem";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import QuizIcon from "@mui/icons-material/Quiz";

export default function QuizHelperMenu() {
  const intl = useIntl();
  const { selectedContext } = useCurrentTopicContext();
  const selectedTopics = useTopicStore((state) => state.selectedTopics);
  const setSelectedTopic = useTopicStore((state) => state.setSelectedTopic);

  const workspaceId = selectedContext?.id || '';
  const section = selectedContext?.section || '';
  const selectedSubcategory = section ? selectedTopics[section] || '' : '';

  const handleSelectQuizType = (quizType: string) => {
    setSelectedTopic(section, quizType);
  };

  // Quiz helper types/categories
  const quizTypes = [
    {
      id: 'multiple-choice',
      label: intl.formatMessage({ id: "workspace.mypartner.quiz.multipleChoice", defaultMessage: "Multiple Choice" }),
      disabled: false
    },
    {
      id: 'true-false',
      label: intl.formatMessage({ id: "workspace.mypartner.quiz.trueFalse", defaultMessage: "True/False" }),
      disabled: false
    },
    {
      id: 'short-answer',
      label: intl.formatMessage({ id: "workspace.mypartner.quiz.shortAnswer", defaultMessage: "Short Answer" }),
      disabled: false
    },
    {
      id: 'essay-questions',
      label: intl.formatMessage({ id: "workspace.mypartner.quiz.essayQuestions", defaultMessage: "Essay Questions" }),
      disabled: false
    },
    {
      id: 'problem-solving',
      label: intl.formatMessage({ id: "workspace.mypartner.quiz.problemSolving", defaultMessage: "Problem Solving" }),
      disabled: false
    },
    {
      id: 'study-guide',
      label: intl.formatMessage({ id: "workspace.mypartner.quiz.studyGuide", defaultMessage: "Study Guide Creation" }),
      disabled: false
    }
  ];

  // Get current selected quiz type
  const selectedQuizType = selectedTopics['quiz-type'] || '';

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
            <QuizIcon sx={{ mr: 1, fontSize: 20 }} />
            <FormattedMessage 
              id="workspace.mypartner.quiz.title" 
              defaultMessage="Quiz Helper" 
            />
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pl: 3.5 }}>
            <FormattedMessage 
              id="workspace.mypartner.quiz.description" 
              defaultMessage="Get assistance with quiz preparation, practice questions, and study materials." 
            />
          </Typography>
        </Box>

        <Box sx={{ mt: 2 }}>
          {quizTypes.length > 0 ? (
            quizTypes.map((type) => {
              const isTypeSelected = selectedQuizType === type.id;
              
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
                  onClick={() => !type.disabled && handleSelectQuizType(type.id)}
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
                id="workspace.mypartner.quiz.noTypes" 
                defaultMessage="No quiz types available" 
              />
            </Box>
          )}
        </Box>
      </Box>
    );
  } catch (error) {
    console.error("Error in QuizHelperMenu:", error);
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        <FormattedMessage 
          id="workspace.mypartner.quiz.error" 
          defaultMessage="An error occurred loading the quiz helper menu." 
        />
      </Box>
    );
  }
} 