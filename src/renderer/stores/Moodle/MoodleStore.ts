import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useWorkspaceSettingsStore } from "@/renderer/stores/Workspace/WorkspaceSettingsStore";
import { toast } from "@/utils/toast";

interface MoodleCourse {
  id: string;
  fullname: string;
  shortname: string;
  categoryid: number;
  summary: string;
  startdate: number;
  enddate: number;
  visible: number;
  enrollmentmethods?: string[];
}

interface MoodleUser {
  id: string;
  username: string;
  firstname: string;
  lastname: string;
  fullname: string;
  email: string;
  department?: string;
  institution?: string;
}

interface MoodleActivity {
  id: string;
  name: string;
  modname: string;
  courseid: string;
  section: number;
  visible: number;
  url?: string;
  description?: string;
}

interface MoodleGrade {
  id: string;
  userid: string;
  itemname: string;
  grade: number;
  grademax: number;
  grademin: number;
  dategraded: number;
  feedback?: string;
}

interface MoodleInsight {
  workspaceId: string;
  courseId: string;
  course?: MoodleCourse;
  enrolledUsers: MoodleUser[];
  activities: MoodleActivity[];
  recentGrades: MoodleGrade[];
  lastSync: string;
  isLoading: boolean;
  error: string | null;
}

interface MoodleState {
  insights: Record<string, MoodleInsight>; // workspaceId -> insight
  availableCourses: MoodleCourse[];
  isLoading: boolean;
  error: string | null;
  
  // Tab state management - workspace-specific
  selectedTabs: Record<string, string>; // workspaceId -> selectedTab

  // CRUD operations
  getInsights: (workspaceId: string) => Promise<MoodleInsight | null>;
  refreshInsights: (workspaceId: string) => Promise<void>;
  clearInsights: (workspaceId: string) => void;
  clearAllInsights: () => void;
  
  // Course operations
  getAvailableCourses: (workspaceId: string) => Promise<MoodleCourse[]>;
  
  // Tab management
  setSelectedTab: (workspaceId: string, tab: string) => void;
  getSelectedTab: (workspaceId: string) => string;
  clearSelectedTab: (workspaceId: string) => void;

  // Test method
  testGetCourses: () => Promise<any>;
}

export const useMoodleStore = create<MoodleState>()(
  persist(
    (set, get) => ({
      insights: {},
      availableCourses: [],
      isLoading: false,
      error: null,
      selectedTabs: {},

      getInsights: async (workspaceId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // Load settings first
          await useWorkspaceSettingsStore.getState().getSettings(workspaceId);
          const workspaceSettings = useWorkspaceSettingsStore.getState().getSettingsFromStore(workspaceId);
          const courseId = workspaceSettings?.moodle_course_id;
          const apiToken = workspaceSettings?.moodle_api_token;

          if (!courseId) {
            set((state) => ({
              insights: {
                ...state.insights,
                [workspaceId]: {
                  workspaceId,
                  courseId: '',
                  enrolledUsers: [],
                  activities: [],
                  recentGrades: [],
                  lastSync: new Date().toISOString(),
                  isLoading: false,
                  error: 'No Moodle course ID configured for this workspace'
                }
              },
              isLoading: false,
              error: 'No Moodle course ID configured for this workspace'
            }));
            return null;
          }

          if (!apiToken) {
            set((state) => ({
              insights: {
                ...state.insights,
                [workspaceId]: {
                  workspaceId,
                  courseId,
                  enrolledUsers: [],
                  activities: [],
                  recentGrades: [],
                  lastSync: new Date().toISOString(),
                  isLoading: false,
                  error: 'No Moodle API token configured for this workspace'
                }
              },
              isLoading: false,
              error: 'No Moodle API token configured for this workspace'
            }));
            return null;
          }

          // Get Moodle preset URL
          const presetUrlResponse = await window.electron.moodleAuth.getPresetUrl();
          if (!presetUrlResponse.success) {
            throw new Error('Failed to get Moodle configuration');
          }

          const moodleBaseUrl = presetUrlResponse.url;

          // Use the workspace API token for all API calls
          const [courseResponse, usersResponse, activitiesResponse, gradesResponse] = await Promise.all([
            window.electron.moodleApi.getCourse({ baseUrl: moodleBaseUrl, apiKey: apiToken, courseId }),
            window.electron.moodleApi.getEnrolledUsers({ baseUrl: moodleBaseUrl, apiKey: apiToken, courseId }),
            window.electron.moodleApi.getCourseContents({ baseUrl: moodleBaseUrl, apiKey: apiToken, courseId }),
            window.electron.moodleApi.getGrades({ baseUrl: moodleBaseUrl, apiKey: apiToken, courseId })
          ]);

          // Check if course response is successful and has data
          if (!courseResponse.success || !courseResponse.data) {
            throw new Error(courseResponse.error || 'Failed to fetch course information');
          }

          // Process the course data with proper error checking
          const course: MoodleCourse = {
            id: courseResponse.data.id?.toString() || courseId,
            fullname: courseResponse.data.fullname || 'Unknown Course',
            shortname: courseResponse.data.shortname || 'Unknown',
            categoryid: courseResponse.data.categoryid || 0,
            summary: courseResponse.data.summary || '',
            startdate: (courseResponse.data.startdate || 0) * 1000, // Convert to milliseconds
            enddate: (courseResponse.data.enddate || 0) * 1000,
            visible: courseResponse.data.visible || 0,
            enrollmentmethods: courseResponse.data.enrollmentmethods || []
          };

          const enrolledUsers: MoodleUser[] = usersResponse.success && usersResponse.data ? 
            usersResponse.data.map((user: any) => ({
              id: user.id?.toString() || '',
              username: user.username || '',
              firstname: user.firstname || '',
              lastname: user.lastname || '',
              fullname: user.fullname || `${user.firstname || ''} ${user.lastname || ''}`.trim(),
              email: user.email || '',
              department: user.department || '',
              institution: user.institution || ''
            })) : [];

          const activities: MoodleActivity[] = activitiesResponse.success && activitiesResponse.data ? 
            activitiesResponse.data : [];

          const recentGrades: MoodleGrade[] = gradesResponse.success && gradesResponse.data ? 
            (Array.isArray(gradesResponse.data) ? gradesResponse.data : []) : [];

          const insight: MoodleInsight = {
            workspaceId,
            courseId,
            course,
            enrolledUsers,
            activities,
            recentGrades,
            lastSync: new Date().toISOString(),
            isLoading: false,
            error: null
          };

          set((state) => ({
            insights: {
              ...state.insights,
              [workspaceId]: insight
            },
            isLoading: false,
            error: null
          }));

          return insight;
        } catch (error: any) {
          // Get workspaceSettings again in catch block
          const workspaceSettings = useWorkspaceSettingsStore.getState().getSettingsFromStore(workspaceId);
          const errorMessage = error.message || 'Failed to fetch Moodle insights';
          
          console.error('[MoodleStore] Error in getInsights:', error);
          
          set((state) => ({
            insights: {
              ...state.insights,
              [workspaceId]: {
                workspaceId,
                courseId: workspaceSettings?.moodle_course_id || '',
                enrolledUsers: [],
                activities: [],
                recentGrades: [],
                lastSync: new Date().toISOString(),
                isLoading: false,
                error: errorMessage
              }
            },
            isLoading: false,
            error: errorMessage
          }));
          
          toast.error(`Failed to load Moodle insights: ${errorMessage}`);
          return null;
        }
      },

      refreshInsights: async (workspaceId: string) => {
        // Clear existing insights and reload
        set((state) => {
          const newInsights = { ...state.insights };
          delete newInsights[workspaceId];
          return { insights: newInsights };
        });
        
        await get().getInsights(workspaceId);
        toast.success('Moodle insights refreshed');
      },

      clearInsights: (workspaceId: string) => {
        set((state) => {
          const newInsights = { ...state.insights };
          delete newInsights[workspaceId];
          return { insights: newInsights };
        });
      },

      clearAllInsights: () => {
        set({ insights: {}, error: null, selectedTabs: {} });
      },

      getAvailableCourses: async (workspaceId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('[MoodleStore] Starting getAvailableCourses for workspace:', workspaceId);
          
          // Get workspace settings (which now includes moodle_api_token)
          await useWorkspaceSettingsStore.getState().getSettings(workspaceId);
          const workspaceSettings = useWorkspaceSettingsStore.getState().getSettingsFromStore(workspaceId);

          console.log('[MoodleStore] Workspace settings:', {
            hasCourseId: !!workspaceSettings?.moodle_course_id,
            hasApiToken: !!workspaceSettings?.moodle_api_token
          });

          if (!workspaceSettings?.moodle_api_token) {
            throw new Error('No Moodle API token configured for this workspace. Please add it in workspace settings.');
          }

          // Get Moodle preset URL
          const presetUrlResponse = await window.electron.moodleAuth.getPresetUrl();
          console.log('[MoodleStore] Preset URL response:', presetUrlResponse);
          
          if (!presetUrlResponse.success) {
            throw new Error('Failed to get Moodle configuration');
          }

          const moodleBaseUrl = presetUrlResponse.url;

          console.log('[MoodleStore] Making API call with workspace token');

          // Fetch available courses with the workspace API token
          const coursesResponse = await window.electron.moodleApi.getCourses({
            baseUrl: moodleBaseUrl,
            apiKey: workspaceSettings.moodle_api_token
          });

          console.log('[MoodleStore] Courses response:', coursesResponse);

          if (!coursesResponse.success) {
            throw new Error(coursesResponse.error || 'Failed to fetch courses');
          }

          const courses = coursesResponse.data || [];
          
          set({ 
            availableCourses: courses,
            isLoading: false, 
            error: null 
          });

          console.log('[MoodleStore] Successfully loaded', courses.length, 'courses');
          return courses;
        } catch (error: any) {
          console.error('[MoodleStore] Error in getAvailableCourses:', error);
          const errorMessage = error.message || 'Failed to fetch available courses';
          set({ 
            availableCourses: [],
            isLoading: false, 
            error: errorMessage 
          });
          
          toast.error(`Failed to load courses: ${errorMessage}`);
          return [];
        }
      },

      // Tab management methods
      setSelectedTab: (workspaceId: string, tab: string) => {
        set((state) => ({
          selectedTabs: {
            ...state.selectedTabs,
            [workspaceId]: tab
          }
        }));
      },

      getSelectedTab: (workspaceId: string) => {
        return get().selectedTabs[workspaceId] || 'overview';
      },

      clearSelectedTab: (workspaceId: string) => {
        set((state) => {
          const newSelectedTabs = { ...state.selectedTabs };
          delete newSelectedTabs[workspaceId];
          return { selectedTabs: newSelectedTabs };
        });
      },

      // Test method to see the logs
      testGetCourses: async () => {
        console.log('[MoodleStore] Testing course API call...');
        
        try {
          // Get Moodle preset URL
          const presetUrlResponse = await window.electron.moodleAuth.getPresetUrl();
          console.log('[MoodleStore] Preset URL response:', presetUrlResponse);
          
          if (!presetUrlResponse.success) {
            throw new Error('Failed to get Moodle configuration');
          }

          const moodleBaseUrl = presetUrlResponse.url;
          
          // Test with placeholder token to see the main process logs
          console.log('[MoodleStore] Testing API call with placeholder token...');
          const coursesResponse = await window.electron.moodleApi.getCourses({
            baseUrl: moodleBaseUrl,
            apiKey: 'test-token-12345'
          });

          console.log('[MoodleStore] Test response:', coursesResponse);
          return coursesResponse;
        } catch (error: any) {
          console.error('[MoodleStore] Test error:', error);
          return { success: false, error: error.message };
        }
      },
    }),
    {
      name: "moodle-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        insights: state.insights,
        availableCourses: state.availableCourses,
        selectedTabs: state.selectedTabs, // Persist tab selections
      }),
      version: 1,
    }
  )
);
