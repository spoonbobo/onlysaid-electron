import { Box, CircularProgress, Alert, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useMoodleStore } from "@/renderer/stores/Moodle/MoodleStore";
import MoodleTabs from "./Tabs";
import MoodleOverview from "./Overview";
import AutoGrade from "./AutoGrade";

function MoodleInsights() {
  const intl = useIntl();
  const { selectedContext, selectedTopics, setSelectedTopic } = useTopicStore();
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

  const handleTabChange = (tab: string) => {
    setSelectedTopic('moodle-insights', tab);
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
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 2 }}>
              {intl.formatMessage({ id: "workspace.insights.moodle.tabs.deeptrend", defaultMessage: "DeepTrend" })}
            </Typography>
            <Alert severity="info">
              {intl.formatMessage({ id: "workspace.insights.moodle.tabs.deeptrend.comingSoon", defaultMessage: "Advanced analytics and trend analysis coming soon..." })}
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
      display: "flex",
      overflow: "hidden"
    }}>
      {/* Side Tabs */}
      <Box sx={{ 
        width: 280,
        minWidth: 280,
        borderRight: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflow: "auto"
      }}>
        <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {intl.formatMessage({ id: "workspace.insights.moodle.title" })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {intl.formatMessage(
              { id: "workspace.insights.moodle.courseInsightsFor" },
              { name: selectedContext?.name }
            )}
          </Typography>
        </Box>
        <MoodleTabs 
          workspaceId={workspaceId}
          selectedTab={currentTab}
          onTabChange={handleTabChange}
        />
      </Box>

      {/* Main Content */}
      <Box sx={{ 
        flex: 1,
        overflow: "auto",
        bgcolor: "background.default"
      }}>
        {renderTabContent()}
      </Box>
    </Box>
  );
}

export default MoodleInsights;
