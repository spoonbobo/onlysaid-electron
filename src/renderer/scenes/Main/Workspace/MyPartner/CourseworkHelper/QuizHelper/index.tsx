import { Box, Typography, Card, CardContent, Alert } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import QuizIcon from "@mui/icons-material/Quiz";

interface QuizHelperProps {
  workspaceId: string;
}

function QuizHelper({ workspaceId }: QuizHelperProps) {
  const intl = useIntl();

  return (
    <Box sx={{ p: 3, pt: 0 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <QuizIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">
              <FormattedMessage 
                id="workspace.mypartner.coursework.quizHelp.title" 
                defaultMessage="Quiz Helper"
              />
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            <FormattedMessage 
              id="workspace.mypartner.coursework.quizHelp.description" 
              defaultMessage="Practice quizzes, study questions, and exam preparation assistance."
            />
          </Typography>
          
          <Alert severity="info">
            <Typography variant="body2">
              <FormattedMessage 
                id="workspace.mypartner.coursework.quizHelp.comingSoon" 
                defaultMessage="Practice question generation, study guides, and exam strategies coming soon..."
              />
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
}

export default QuizHelper;