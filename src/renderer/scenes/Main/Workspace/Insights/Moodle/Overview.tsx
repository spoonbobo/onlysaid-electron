import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Stack,
  Chip, 
  Button, 
  CircularProgress, 
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Avatar,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";
import { useState } from "react";
import { useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useMoodleStore } from "@/renderer/stores/Moodle/MoodleStore";
import { useWorkspaceSettingsStore } from "@/renderer/stores/Workspace/WorkspaceSettingsStore";
import RefreshIcon from "@mui/icons-material/Refresh";
import SchoolIcon from "@mui/icons-material/School";
import PeopleIcon from "@mui/icons-material/People";
import AssignmentIcon from "@mui/icons-material/Assignment";
import GradeIcon from "@mui/icons-material/Grade";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SettingsIcon from "@mui/icons-material/Settings";
import ListIcon from "@mui/icons-material/List";

interface MoodleOverviewProps {
  workspaceId: string;
}

export default function MoodleOverview({ workspaceId }: MoodleOverviewProps) {
  const intl = useIntl();
  const { selectedContext } = useTopicStore();

  const {
    insights,
    availableCourses,
    refreshInsights,
    getAvailableCourses,
    isLoading
  } = useMoodleStore();

  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const currentInsight = workspaceId ? insights[workspaceId] : null;

  const handleRefresh = async () => {
    if (!workspaceId) return;
    await refreshInsights(workspaceId);
  };

  const handleShowCourseSelector = async () => {
    if (!workspaceId) return;
    
    setLoadingCourses(true);
    setShowCourseSelector(true);
    
    try {
      await getAvailableCourses(workspaceId);
    } catch (error) {
      console.error("Error loading available courses:", error);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleCourseSelect = async (courseId: string) => {
    if (!workspaceId) return;
    
    // Update workspace settings with selected course
    const { updateSettings } = useWorkspaceSettingsStore.getState();
    const currentSettings = useWorkspaceSettingsStore.getState().getSettingsFromStore(workspaceId);
    await updateSettings(workspaceId, { 
      moodle_course_id: courseId,
      moodle_api_token: currentSettings?.moodle_api_token
    });
    
    // Reload insights
    const { getInsights } = useMoodleStore.getState();
    await getInsights(workspaceId);
    setShowCourseSelector(false);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getGradeColor = (grade: number, maxGrade: number) => {
    const percentage = (grade / maxGrade) * 100;
    if (percentage >= 85) return 'success';
    if (percentage >= 70) return 'warning';
    return 'error';
  };

  if (currentInsight?.error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {currentInsight.error}
        </Alert>
        
        {(currentInsight.error.includes('No Moodle course ID') || 
          currentInsight.error.includes('Course not found') ||
          currentInsight.error.includes('No Moodle API token')) && (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  {intl.formatMessage({ id: "workspace.insights.moodle.configureIntegration" })}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {currentInsight.error.includes('No Moodle API token') 
                  ? intl.formatMessage({ id: "workspace.insights.moodle.configureApiTokenDescription" })
                  : currentInsight.error.includes('Course not found') 
                  ? intl.formatMessage({ id: "workspace.insights.moodle.courseNotFound" })
                  : intl.formatMessage({ id: "workspace.insights.moodle.configureTokenAndCourse" })
                }
              </Typography>
              
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  onClick={() => {
                    // Navigate to workspace settings
                    const { setSelectedContext } = useTopicStore.getState();
                    setSelectedContext({
                      id: selectedContext?.id,
                      name: selectedContext?.name || 'workspace',
                      type: selectedContext?.type || 'workspace',
                      section: 'workspace:settings'
                    });
                  }}
                >
                  {currentInsight.error.includes('No Moodle API token') 
                    ? intl.formatMessage({ id: "workspace.insights.moodle.configureApiToken" })
                    : intl.formatMessage({ id: "workspace.insights.moodle.goToSettings" })
                  }
                </Button>
                
                {!currentInsight.error.includes('No Moodle API token') && (
                  <Button
                    variant="outlined"
                    startIcon={<ListIcon />}
                    onClick={handleShowCourseSelector}
                  >
                    {intl.formatMessage({ id: "workspace.insights.moodle.selectCourse" })}
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  }

  if (!currentInsight) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          {intl.formatMessage({ id: "workspace.insights.moodle.noInsightsAvailable" })}
        </Alert>
      </Box>
    );
  }

  const { course, enrolledUsers, activities, recentGrades, lastSync } = currentInsight;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            {intl.formatMessage({ id: "workspace.insights.moodle.overview.title", defaultMessage: "Course Overview" })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {intl.formatMessage(
              { id: "workspace.insights.moodle.courseInsightsFor" },
              { name: selectedContext?.name }
            )}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<ListIcon />}
            onClick={handleShowCourseSelector}
          >
            {intl.formatMessage({ id: "workspace.insights.moodle.changeCourse" })}
          </Button>
          <Button
            variant="outlined"
            startIcon={isLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading 
              ? intl.formatMessage({ id: "workspace.insights.moodle.refreshing" })
              : intl.formatMessage({ id: "workspace.insights.moodle.refresh" })
            }
          </Button>
        </Stack>
      </Box>

      {/* Course Overview */}
      {course && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SchoolIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">
                {intl.formatMessage({ id: "workspace.insights.moodle.courseOverview" })}
              </Typography>
            </Box>
            
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {course.fullname}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {course.summary}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={intl.formatMessage(
                      { id: "workspace.insights.moodle.courseId" }, 
                      { id: course.id }
                    )} 
                    size="small" 
                  />
                  <Chip label={course.shortname} size="small" variant="outlined" />
                  <Chip 
                    label={course.visible 
                      ? intl.formatMessage({ id: "workspace.insights.moodle.visible" })
                      : intl.formatMessage({ id: "workspace.insights.moodle.hidden" })
                    } 
                    size="small" 
                    color={course.visible ? "success" : "default"}
                  />
                </Box>
              </Box>
              <Box sx={{ textAlign: { xs: 'left', md: 'right' }, minWidth: 200 }}>
                <Typography variant="body2" color="text.secondary">
                  <CalendarTodayIcon sx={{ fontSize: 14, mr: 0.5 }} />
                  {intl.formatMessage(
                    { id: "workspace.insights.moodle.startDate" },
                    { date: formatDate(course.startdate) }
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <CalendarTodayIcon sx={{ fontSize: 14, mr: 0.5 }} />
                  {intl.formatMessage(
                    { id: "workspace.insights.moodle.endDate" },
                    { date: formatDate(course.enddate) }
                  )}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { 
          xs: '1fr', 
          sm: 'repeat(2, 1fr)', 
          md: 'repeat(4, 1fr)' 
        }, 
        gap: 3, 
        mb: 3 
      }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {enrolledUsers.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {intl.formatMessage({ id: "workspace.insights.moodle.enrolledStudents" })}
            </Typography>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <AssignmentIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {activities.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {intl.formatMessage({ id: "workspace.insights.moodle.courseActivities" })}
            </Typography>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <GradeIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {recentGrades.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {intl.formatMessage({ id: "workspace.insights.moodle.recentGrades" })}
            </Typography>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <VisibilityIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {activities.filter(a => a.visible).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {intl.formatMessage({ id: "workspace.insights.moodle.visibleActivities" })}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Recent Activities and Grades */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {intl.formatMessage({ id: "workspace.insights.moodle.recentActivities" })}
              </Typography>
              <List dense>
                {activities.slice(0, 5).map((activity, index) => (
                  <Box key={activity.id}>
                    <ListItem>
                      <ListItemIcon>
                        <AssignmentIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={activity.name}
                        secondary={intl.formatMessage(
                          { id: "workspace.insights.moodle.section" },
                          { section: activity.section }
                        ) + ` • ${activity.modname}`}
                      />
                    </ListItem>
                    {index < 4 && <Divider />}
                  </Box>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {intl.formatMessage({ id: "workspace.insights.moodle.recentGrades" })}
              </Typography>
              <List dense>
                {recentGrades.slice(0, 5).map((grade, index) => {
                  const user = enrolledUsers.find(u => u.id === grade.userid);
                  const percentage = Math.round((grade.grade / grade.grademax) * 100);
                  
                  return (
                    <Box key={grade.id}>
                      <ListItem>
                        <ListItemIcon>
                          <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                            {user?.firstname?.[0]}{user?.lastname?.[0]}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2">
                                {user?.fullname || intl.formatMessage({ id: "workspace.insights.moodle.unknownUser" })}
                              </Typography>
                              <Chip 
                                label={`${percentage}%`}
                                size="small"
                                color={getGradeColor(grade.grade, grade.grademax)}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                {grade.itemname}
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={percentage} 
                                sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                                color={getGradeColor(grade.grade, grade.grademax)}
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < 4 && <Divider />}
                    </Box>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Box>
      </Stack>

      {/* Last Sync Info */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          {intl.formatMessage(
            { id: "workspace.insights.moodle.lastUpdated" },
            { time: new Date(lastSync).toLocaleString() }
          )}
        </Typography>
      </Box>

      {/* Course Selector Dialog */}
      <Dialog 
        open={showCourseSelector} 
        onClose={() => setShowCourseSelector(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {intl.formatMessage({ id: "workspace.insights.moodle.courseSelector.title" })}
        </DialogTitle>
        <DialogContent>
          {loadingCourses ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : availableCourses.length > 0 ? (
            <List>
              {availableCourses.map((course) => (
                <ListItem 
                  key={course.id} 
                  component="button"
                  onClick={() => handleCourseSelect(course.id)}
                  sx={{ 
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <ListItemIcon>
                    <SchoolIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={course.fullname}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {intl.formatMessage(
                            { id: "workspace.insights.moodle.courseId" },
                            { id: course.id }
                          )} • {course.shortname}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {course.summary || intl.formatMessage({ id: "workspace.insights.moodle.noDescriptionAvailable" })}
                        </Typography>
                      </Box>
                    }
                  />
                  <Chip 
                    label={course.visible 
                      ? intl.formatMessage({ id: "workspace.insights.moodle.visible" })
                      : intl.formatMessage({ id: "workspace.insights.moodle.hidden" })
                    } 
                    size="small" 
                    color={course.visible ? "success" : "default"}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Alert severity="info">
              {intl.formatMessage({ id: "workspace.insights.moodle.courseSelector.noCourses" })}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCourseSelector(false)}>
            {intl.formatMessage({ id: "workspace.insights.moodle.courseSelector.cancel" })}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
