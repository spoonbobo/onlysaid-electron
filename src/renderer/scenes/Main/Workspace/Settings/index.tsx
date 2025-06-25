import { Typography, Box, Button, CircularProgress, Alert, TextField } from "@mui/material";
import SettingsSection from "@/renderer/components/Settings/SettingsSection";
import SettingsFormField from "@/renderer/components/Settings/SettingsFormField";
import TextFieldWithOptions from "@/renderer/components/Text/TextFieldWithOptions";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useWorkspaceSettingsStore } from "@/renderer/stores/Workspace/WorkspaceSettingsStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { toast } from "@/utils/toast";

function WorkspaceSettings() {
  const intl = useIntl();
  const { selectedContext } = useTopicStore();
  const workspaceId = selectedContext?.id;

  const {
    getSettings,
    createSettings,
    updateSettings,
    deleteSettings,
    getSettingsFromStore,
    isLoading,
    error,
    setError
  } = useWorkspaceSettingsStore();

  const [moodleCourseId, setMoodleCourseId] = useState<string>("");
  const [moodleApiToken, setMoodleApiToken] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Load settings when component mounts or workspace changes
  useEffect(() => {
    if (workspaceId) {
      loadSettings();
    }
  }, [workspaceId]);

  const loadSettings = async () => {
    if (!workspaceId) return;

    setInitialLoad(true);
    try {
      const settings = await getSettings(workspaceId);
      if (settings) {
        setMoodleCourseId(settings.moodle_course_id || "");
        setMoodleApiToken(settings.moodle_api_token || "");
      } else {
        setMoodleCourseId("");
        setMoodleApiToken("");
      }
      setHasChanges(false);
    } catch (error) {
      console.error("Error loading workspace settings:", error);
    } finally {
      setInitialLoad(false);
    }
  };

  const handleMoodleCourseIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMoodleCourseId(newValue);
    checkForChanges(newValue, moodleApiToken);
  };

  const handleMoodleApiTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMoodleApiToken(newValue);
    checkForChanges(moodleCourseId, newValue);
  };

  const checkForChanges = (courseId: string, apiToken: string) => {
    const currentSettings = getSettingsFromStore(workspaceId || "");
    const originalCourseId = currentSettings?.moodle_course_id || "";
    const originalApiToken = currentSettings?.moodle_api_token || "";
    setHasChanges(courseId !== originalCourseId || apiToken !== originalApiToken);
  };

  const handleClearMoodleCourseId = () => {
    setMoodleCourseId("");
    checkForChanges("", moodleApiToken);
  };

  const handleClearMoodleApiToken = () => {
    setMoodleApiToken("");
    checkForChanges(moodleCourseId, "");
  };

  const handleSaveSettings = async () => {
    if (!workspaceId) {
      toast.error(intl.formatMessage({ id: "workspace.settings.noWorkspaceSelected" }));
      return;
    }

    try {
      const currentSettings = getSettingsFromStore(workspaceId);
      const settingsData = { 
        moodle_course_id: moodleCourseId || undefined,
        moodle_api_token: moodleApiToken || undefined
      };

      if (currentSettings) {
        // Update existing settings
        await updateSettings(workspaceId, settingsData);
      } else {
        // Create new settings
        await createSettings(workspaceId, settingsData);
      }

      setHasChanges(false);
    } catch (error) {
      console.error("Error saving workspace settings:", error);
    }
  };

  const handleResetSettings = () => {
    const currentSettings = getSettingsFromStore(workspaceId || "");
    setMoodleCourseId(currentSettings?.moodle_course_id || "");
    setMoodleApiToken(currentSettings?.moodle_api_token || "");
    setHasChanges(false);
    setError(null);
  };

  const handleDeleteSettings = async () => {
    if (!workspaceId) {
      toast.error(intl.formatMessage({ id: "workspace.settings.noWorkspaceSelected" }));
      return;
    }

    const confirmMessage = intl.formatMessage({ id: "workspace.settings.deleteConfirmation" });
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await deleteSettings(workspaceId);
      setMoodleCourseId("");
      setMoodleApiToken("");
      setHasChanges(false);
    } catch (error) {
      console.error("Error deleting workspace settings:", error);
    }
  };

  if (!workspaceId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          {intl.formatMessage({ id: "workspace.settings.noWorkspaceSelectedWarning" })}
        </Alert>
      </Box>
    );
  }

  if (initialLoad) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        {intl.formatMessage({ id: "workspace.settings.title" })}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {intl.formatMessage(
          { id: "workspace.settings.description" },
          { workspaceName: selectedContext?.name }
        )}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Moodle Integration Section */}
      <SettingsSection title={intl.formatMessage({ id: "workspace.settings.moodle.title" })} sx={{ mb: 4 }}>
        <Box sx={{ py: 2 }}>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {intl.formatMessage({ id: "workspace.settings.moodle.description" })}
          </Typography>

          <SettingsFormField label={intl.formatMessage({ id: "workspace.settings.moodle.apiToken" })}>
            <TextFieldWithOptions
              fullWidth
              size="small"
              isPassword={true}
              value={moodleApiToken}
              onChange={handleMoodleApiTokenChange}
              onClear={handleClearMoodleApiToken}
              placeholder={intl.formatMessage({ id: "workspace.settings.moodle.apiTokenPlaceholder" })}
              helperText={intl.formatMessage({ id: "workspace.settings.moodle.apiTokenHelperText" })}
            />
          </SettingsFormField>

          <SettingsFormField label={intl.formatMessage({ id: "workspace.settings.moodle.courseId" })}>
            <TextFieldWithOptions
              fullWidth
              size="small"
              value={moodleCourseId}
              onChange={handleMoodleCourseIdChange}
              onClear={handleClearMoodleCourseId}
              placeholder={intl.formatMessage({ id: "workspace.settings.moodle.courseIdPlaceholder" })}
              helperText={intl.formatMessage({ id: "workspace.settings.moodle.courseIdHelperText" })}
            />
          </SettingsFormField>

          {hasChanges && (
            <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
              {intl.formatMessage({ id: "workspace.settings.unsavedChanges" })}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={handleSaveSettings}
              disabled={isLoading || !hasChanges}
              startIcon={isLoading ? <CircularProgress size={16} /> : null}
            >
              {isLoading 
                ? intl.formatMessage({ id: "workspace.settings.saving" })
                : intl.formatMessage({ id: "workspace.settings.saveSettings" })
              }
            </Button>

            <Button
              variant="outlined"
              onClick={handleResetSettings}
              disabled={isLoading || !hasChanges}
            >
              {intl.formatMessage({ id: "workspace.settings.resetChanges" })}
            </Button>

            <Button
              variant="outlined"
              color="error"
              onClick={handleDeleteSettings}
              disabled={isLoading}
              sx={{ ml: 'auto' }}
            >
              {intl.formatMessage({ id: "workspace.settings.deleteAllSettings" })}
            </Button>
          </Box>
        </Box>
      </SettingsSection>

      {/* Future Settings Sections */}
      <SettingsSection title={intl.formatMessage({ id: "workspace.settings.additional.title" })} sx={{ mb: 4 }}>
        <Box sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {intl.formatMessage({ id: "workspace.settings.additional.description" })}
          </Typography>
        </Box>
      </SettingsSection>
    </Box>
  );
}

export default WorkspaceSettings;
