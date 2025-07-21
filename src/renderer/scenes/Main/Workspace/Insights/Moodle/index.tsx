import { Box, CircularProgress, Alert, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useMoodleStore } from "@/renderer/stores/Moodle/MoodleStore";
import MoodleOverview from "./Overview";
import AutoGrade from "./AutoGrade";
import DeepTrend from "./DeepTrend";

function MoodleInsights() {
  const intl = useIntl();
  const { selectedContext, selectedTopics } = useTopicStore();
  const workspaceId = selectedContext?.id;

  const {
    insights,
    getInsights,
    isLoading
  } = useMoodleStore();

  const [initialLoad, setInitialLoad] = useState(true);

  // Get current tab from selectedTopics, default to 'overview'
  const currentTab = selectedTopics['moodle-insights'] || 'overview';

  const currentInsight = workspaceId ? insights[workspaceId] : null;

  useEffect(() => {
    if (workspaceId) {
      loadInsights();
    }
  }, [workspaceId]);

  const loadInsights = async () => {
    if (!workspaceId) return;

    setInitialLoad(true);
    try {
      await getInsights(workspaceId);
    } catch (error) {
      console.error("Error loading Moodle insights:", error);
    } finally {
      setInitialLoad(false);
    }
  };

  if (!workspaceId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          {intl.formatMessage({ id: "workspace.insights.moodle.noWorkspaceSelected" })}
        </Alert>
      </Box>
    );
  }

  if (initialLoad) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            {intl.formatMessage({ id: "workspace.insights.moodle.loading" })}
          </Typography>
        </Box>
      </Box>
    );
  }

  const renderTabContent = () => {
    switch (currentTab) {
      case 'overview':
        return <MoodleOverview workspaceId={workspaceId} />;
      case 'autograde':
        return <AutoGrade workspaceId={workspaceId} />;
      case 'deeptrend':
        return <DeepTrend workspaceId={workspaceId} />;
      case 'coursearchitect':
        return (
          <Box sx={{ p: 3 }}>
            {/* Standardized Header */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {intl.formatMessage({ id: "workspace.insights.moodle.tabs.coursearchitect", defaultMessage: "CourseArchitect" })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {intl.formatMessage({ id: "workspace.insights.moodle.tabs.coursearchitect.description", defaultMessage: "Course design and structure management" })}
              </Typography>
            </Box>

            <Alert severity="info">
              {intl.formatMessage({ id: "workspace.insights.moodle.tabs.coursearchitect.comingSoon", defaultMessage: "Course design and structure management coming soon..." })}
            </Alert>
          </Box>
        );
      case 'semesterreport':
        return (
          <Box sx={{ p: 3 }}>
            {/* Standardized Header */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {intl.formatMessage({ id: "workspace.insights.moodle.tabs.semesterreport", defaultMessage: "Semester Report" })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {intl.formatMessage({ id: "workspace.insights.moodle.tabs.semesterreport.description", defaultMessage: "Comprehensive semester reporting and analytics" })}
              </Typography>
            </Box>

            <Alert severity="info">
              {intl.formatMessage({ id: "workspace.insights.moodle.tabs.semesterreport.comingSoon", defaultMessage: "Comprehensive semester reporting and analytics coming soon..." })}
            </Alert>
          </Box>
        );
      case 'insightsreleaser':
        return (
          <Box sx={{ p: 3 }}>
            {/* Standardized Header */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {intl.formatMessage({ id: "workspace.insights.moodle.tabs.insightsreleaser", defaultMessage: "Insights Releaser" })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {intl.formatMessage({ id: "workspace.insights.moodle.tabs.insightsreleaser.description", defaultMessage: "Release and publish academic results and insights" })}
              </Typography>
            </Box>

            <Alert severity="info">
              {intl.formatMessage({ id: "workspace.insights.moodle.tabs.insightsreleaser.comingSoon", defaultMessage: "Academic results release functionality coming soon..." })}
            </Alert>
          </Box>
        );
      case 'safebackup':
        return (
          <Box sx={{ p: 3 }}>
            {/* Standardized Header */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {intl.formatMessage({ id: "workspace.insights.moodle.tabs.safebackup", defaultMessage: "SafeBackup" })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {intl.formatMessage({ id: "workspace.insights.moodle.tabs.safebackup.description", defaultMessage: "Secure backup and restore functionality" })}
              </Typography>
            </Box>

            <Alert severity="info">
              {intl.formatMessage({ id: "workspace.insights.moodle.tabs.safebackup.comingSoon", defaultMessage: "Secure backup and restore functionality coming soon..." })}
            </Alert>
          </Box>
        );
      default:
        return <MoodleOverview workspaceId={workspaceId} />;
    }
  };

  return (
    <Box sx={{ 
      height: "100%",
      overflow: "auto",
      bgcolor: "background.default"
    }}>
      {renderTabContent()}
    </Box>
  );
}

export default MoodleInsights;
