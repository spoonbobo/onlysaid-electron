import { Box, Typography, Alert } from "@mui/material";
import { useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";

function MeetingSummarizer() {
  const intl = useIntl();
  const { selectedContext } = useTopicStore();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          {intl.formatMessage({ id: "workspace.insights.services.meetingSummarizer", defaultMessage: "Meeting Summarizer" })}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {intl.formatMessage(
            { id: "workspace.insights.meetingSummarizer.description" },
            { name: selectedContext?.name }
          )}
        </Typography>
      </Box>

      <Alert severity="info">
        {intl.formatMessage({ 
          id: "workspace.insights.meetingSummarizer.comingSoon", 
          defaultMessage: "Meeting summarization and insights functionality coming soon..." 
        })}
      </Alert>
    </Box>
  );
}

export default MeetingSummarizer;

