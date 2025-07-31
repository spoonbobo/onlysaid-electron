import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Card,
  Button
} from '@mui/material';
import { FormattedMessage } from 'react-intl';
import QuizIcon from '@mui/icons-material/Quiz';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LightbulbIcon from '@mui/icons-material/Lightbulb';

interface QuizHelperFunctionalityDialogProps {
  open: boolean;
  onClose: () => void;
}

const QuizHelperFunctionalityDialog: React.FC<QuizHelperFunctionalityDialogProps> = ({
  open,
  onClose
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <QuizIcon sx={{ mr: 2, color: 'primary.main', fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            <FormattedMessage 
              id="quizHelper.dialog.title" 
              defaultMessage="Quiz Helper - Intelligent Practice Question Generator"
            />
          </Typography>
        </Box>
        <IconButton 
          onClick={onClose}
          sx={{ color: 'text.secondary' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {/* Main Description */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
            <FormattedMessage 
              id="quizHelper.dialog.overview.title" 
              defaultMessage="🎯 Overview"
            />
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
            <FormattedMessage 
              id="quizHelper.dialog.overview.description" 
              defaultMessage="Transform your knowledge base into interactive practice sessions. Generate contextual questions based on your documents and get AI-powered feedback on your answers."
            />
          </Typography>
        </Box>

        {/* Key Features */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 3, color: 'secondary.main', fontWeight: 600 }}>
            <FormattedMessage 
              id="quizHelper.dialog.features.title" 
              defaultMessage="✨ Key Features"
            />
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
            {/* Feature 1: Knowledge Base Integration */}
            <Card sx={{ p: 2, bgcolor: 'primary.lighter', border: '1px solid', borderColor: 'primary.light' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AutoAwesomeIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  <FormattedMessage 
                    id="quizHelper.dialog.feature.kbIntegration.title" 
                    defaultMessage="Knowledge Base Integration"
                  />
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                <FormattedMessage 
                  id="quizHelper.dialog.feature.kbIntegration.description" 
                  defaultMessage="Automatically generates questions from your uploaded documents using LightRAG technology for contextual understanding."
                />
              </Typography>
            </Card>

            {/* Feature 2: Multiple Question Types */}
            <Card sx={{ p: 2, bgcolor: 'secondary.lighter', border: '1px solid', borderColor: 'secondary.light' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <QuizIcon sx={{ mr: 1, color: 'secondary.main' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  <FormattedMessage 
                    id="quizHelper.dialog.feature.questionTypes.title" 
                    defaultMessage="Multiple Question Types"
                  />
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                <FormattedMessage 
                  id="quizHelper.dialog.feature.questionTypes.description" 
                  defaultMessage="Multiple choice, true/false, short answer, and mixed question formats with customizable difficulty levels."
                />
              </Typography>
            </Card>

            {/* Feature 3: AI-Powered Evaluation */}
            <Card sx={{ p: 2, bgcolor: 'success.lighter', border: '1px solid', borderColor: 'success.light' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  <FormattedMessage 
                    id="quizHelper.dialog.feature.aiEvaluation.title" 
                    defaultMessage="AI-Powered Evaluation"
                  />
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                <FormattedMessage 
                  id="quizHelper.dialog.feature.aiEvaluation.description" 
                  defaultMessage="Intelligent answer analysis with detailed feedback, scoring, and personalized explanations for wrong answers."
                />
              </Typography>
            </Card>

            {/* Feature 4: Advanced Processing */}
            <Card sx={{ p: 2, bgcolor: 'warning.lighter', border: '1px solid', borderColor: 'warning.light' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <LightbulbIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  <FormattedMessage 
                    id="quizHelper.dialog.feature.advancedProcessing.title" 
                    defaultMessage="Advanced Processing"
                  />
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                <FormattedMessage 
                  id="quizHelper.dialog.feature.advancedProcessing.description" 
                  defaultMessage="Parallel AI processing, intelligent retry logic, real-time progress tracking, and optimized performance."
                />
              </Typography>
            </Card>
          </Box>
        </Box>

        {/* How It Works */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 3, color: 'info.main', fontWeight: 600 }}>
            <FormattedMessage 
              id="quizHelper.dialog.howItWorks.title" 
              defaultMessage="🔄 How It Works"
            />
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              {
                step: 1,
                titleId: "quizHelper.dialog.step1.title",
                titleDefault: "Select Knowledge Bases",
                descId: "quizHelper.dialog.step1.description",
                descDefault: "Choose which knowledge bases to use for question generation. The system will analyze your documents to understand the content."
              },
              {
                step: 2,
                titleId: "quizHelper.dialog.step2.title",
                titleDefault: "Configure Questions",
                descId: "quizHelper.dialog.step2.description",
                descDefault: "Set the number of questions, question types (multiple choice, true/false, short answer), and difficulty level."
              },
              {
                step: 3,
                titleId: "quizHelper.dialog.step3.title",
                titleDefault: "Generate & Practice",
                descId: "quizHelper.dialog.step3.description",
                descDefault: "AI generates contextual questions from your content. Answer them to test your understanding and receive instant feedback."
              },
              {
                step: 4,
                titleId: "quizHelper.dialog.step4.title",
                titleDefault: "Review & Learn",
                descId: "quizHelper.dialog.step4.description",
                descDefault: "Get detailed explanations for incorrect answers, scoring for short answers, and insights to improve your knowledge."
              }
            ].map((step, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ 
                  minWidth: 32, 
                  height: 32, 
                  borderRadius: '50%', 
                  bgcolor: 'primary.main', 
                  color: 'primary.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}>
                  {step.step}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    <FormattedMessage 
                      id={step.titleId}
                      defaultMessage={step.titleDefault}
                    />
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <FormattedMessage 
                      id={step.descId}
                      defaultMessage={step.descDefault}
                    />
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Benefits */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 3, color: 'success.main', fontWeight: 600 }}>
            <FormattedMessage 
              id="quizHelper.dialog.benefits.title" 
              defaultMessage="🚀 Benefits"
            />
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.5 }}>
            {[
              { id: "quizHelper.dialog.benefit1", default: "📚 Personalized Learning" },
              { id: "quizHelper.dialog.benefit2", default: "🎯 Content-Specific Questions" },
              { id: "quizHelper.dialog.benefit3", default: "🤖 Intelligent Feedback" },
              { id: "quizHelper.dialog.benefit4", default: "⚡ Fast Processing" },
              { id: "quizHelper.dialog.benefit5", default: "📊 Progress Tracking" },
              { id: "quizHelper.dialog.benefit6", default: "🔄 Adaptive Difficulty" }
            ].map((benefit, index) => (
              <Box key={index} sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 1.5, 
                bgcolor: 'success.lighter', 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'success.light'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  <FormattedMessage 
                    id={benefit.id}
                    defaultMessage={benefit.default}
                  />
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={onClose}
          variant="contained"
          sx={{ minWidth: 120 }}
        >
          <FormattedMessage 
            id="quizHelper.dialog.getStarted" 
            defaultMessage="Get Started"
          />
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuizHelperFunctionalityDialog; 