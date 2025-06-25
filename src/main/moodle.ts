import { ipcMain } from 'electron';
import axios from 'axios';

// Simplified Moodle configuration - just the base URL
const MOODLE_BASE_URL = (process.env.MOODLE_BASE_URL || 'https://moodle.onlysaid.com').replace(/\/+$/, '');

// Simplified main setup function - only API handlers
export function setupMoodleHandlers() {
  // Get preset Moodle URL handler (still useful for configuration)
  ipcMain.handle('moodle:get-preset-url', async () => {
    return {
      success: true,
      url: MOODLE_BASE_URL,
      configured: true
    };
  });

  // Add API handlers only
  setupMoodleApiHandlers();
}

// Keep only the API handlers, remove all OAuth2 handlers
export function setupMoodleApiHandlers() {
  // Test connection to Moodle
  ipcMain.handle('moodle:test-connection', async (event, args: { baseUrl: string; apiKey: string }) => {
    console.log('[Moodle API] Testing connection with args:', { 
      baseUrl: args.baseUrl, 
      apiKey: args.apiKey ? `${args.apiKey.substring(0, 10)}...` : 'undefined' 
    });

    try {
      const response = await axios.get(`${args.baseUrl}/webservice/rest/server.php`, {
        params: {
          wstoken: args.apiKey,
          wsfunction: 'core_webservice_get_site_info',
          moodlewsrestformat: 'json'
        }
      });

      console.log('[Moodle API] Test connection response:', response.data);

      if (response.data && !response.data.exception) {
        return {
          success: true,
          data: response.data
        };
      } else {
        return {
          success: false,
          error: response.data?.message || 'Invalid API response'
        };
      }
    } catch (error: any) {
      console.error('[Moodle API] Test connection error:', error);
      return {
        success: false,
        error: error.message || 'Connection failed'
      };
    }
  });

  // Get available courses for user
  ipcMain.handle('moodle:get-courses', async (event, args: { baseUrl: string; apiKey: string }) => {
    console.log('[Moodle API] Getting courses with args:', { 
      baseUrl: args.baseUrl, 
      apiKey: args.apiKey ? `${args.apiKey.substring(0, 10)}...` : 'undefined' 
    });

    try {
      // First, get the current user info to get the userid
      const userInfoResponse = await axios.get(`${args.baseUrl}/webservice/rest/server.php`, {
        params: {
          wstoken: args.apiKey,
          wsfunction: 'core_webservice_get_site_info',
          moodlewsrestformat: 'json'
        }
      });

      console.log('[Moodle API] User info response:', userInfoResponse.data);

      if (!userInfoResponse.data || userInfoResponse.data.exception) {
        throw new Error(userInfoResponse.data?.message || 'Failed to get user information');
      }

      const userId = userInfoResponse.data.userid;
      console.log('[Moodle API] Using userid:', userId);

      // Now get courses for this specific user
      const requestUrl = `${args.baseUrl}/webservice/rest/server.php`;
      const params = {
        wstoken: args.apiKey,
        wsfunction: 'core_enrol_get_users_courses',
        moodlewsrestformat: 'json',
        userid: userId
      };

      console.log('[Moodle API] Request URL:', requestUrl);
      console.log('[Moodle API] Request params:', { 
        ...params, 
        wstoken: params.wstoken ? `${params.wstoken.substring(0, 10)}...` : 'undefined' 
      });

      const response = await axios.get(requestUrl, { params });

      console.log('[Moodle API] Response status:', response.status);
      console.log('[Moodle API] Response data:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.exception) {
        throw new Error(response.data.message || 'Moodle API error');
      }

      if (response.data && Array.isArray(response.data)) {
        const courses = response.data.map((course: any) => ({
          id: course.id.toString(),
          fullname: course.fullname,
          shortname: course.shortname,
          categoryid: course.categoryid,
          summary: course.summary,
          startdate: course.startdate * 1000,
          enddate: course.enddate * 1000,
          visible: course.visible,
          enrollmentmethods: course.enrollmentmethods
        }));

        console.log('[Moodle API] Processed courses:', courses.length, 'courses found');
        
        return {
          success: true,
          data: courses
        };
      } else {
        console.log('[Moodle API] Unexpected response format:', typeof response.data, response.data);
        return {
          success: false,
          error: response.data?.message || 'Failed to get courses - unexpected response format'
        };
      }
    } catch (error: any) {
      console.error('[Moodle API] Error getting courses:', error);
      console.error('[Moodle API] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      return {
        success: false,
        error: error.message || 'Failed to fetch courses'
      };
    }
  });

  // Get course information
  ipcMain.handle('moodle:get-course', async (event, args: { baseUrl: string; apiKey: string; courseId: string }) => {
    try {
      const response = await axios.get(`${args.baseUrl}/webservice/rest/server.php`, {
        params: {
          wstoken: args.apiKey,
          wsfunction: 'core_course_get_courses_by_field',
          moodlewsrestformat: 'json',
          field: 'id',
          value: args.courseId
        }
      });

      if (response.data && response.data.courses && response.data.courses.length > 0) {
        return {
          success: true,
          data: response.data.courses[0]
        };
      } else {
        return {
          success: false,
          error: 'Course not found'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch course'
      };
    }
  });

  // Get enrolled users in course
  ipcMain.handle('moodle:get-enrolled-users', async (event, args: { baseUrl: string; apiKey: string; courseId: string }) => {
    try {
      const response = await axios.get(`${args.baseUrl}/webservice/rest/server.php`, {
        params: {
          wstoken: args.apiKey,
          wsfunction: 'core_enrol_get_enrolled_users',
          moodlewsrestformat: 'json',
          courseid: args.courseId
        }
      });

      if (response.data && Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data
        };
      } else {
        return {
          success: false,
          error: response.data?.message || 'Failed to get enrolled users'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch enrolled users'
      };
    }
  });

  // Get course activities
  ipcMain.handle('moodle:get-course-contents', async (event, args: { baseUrl: string; apiKey: string; courseId: string }) => {
    try {
      const response = await axios.get(`${args.baseUrl}/webservice/rest/server.php`, {
        params: {
          wstoken: args.apiKey,
          wsfunction: 'core_course_get_contents',
          moodlewsrestformat: 'json',
          courseid: args.courseId
        }
      });

      if (response.data && Array.isArray(response.data)) {
        // Flatten activities from all sections
        const activities = response.data.flatMap(section => 
          // @ts-ignore
          section.modules?.map(module => ({
            id: module.id,
            name: module.name,
            modname: module.modname,
            courseid: args.courseId,
            section: section.section,
            visible: module.visible,
            url: module.url,
            description: module.description
          })) || []
        );

        return {
          success: true,
          data: activities
        };
      } else {
        return {
          success: false,
          error: response.data?.message || 'Failed to get course contents'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch course contents'
      };
    }
  });

  // Get grades for course
  ipcMain.handle('moodle:get-grades', async (event, args: { baseUrl: string; apiKey: string; courseId: string }) => {
    try {
      const response = await axios.get(`${args.baseUrl}/webservice/rest/server.php`, {
        params: {
          wstoken: args.apiKey,
          wsfunction: 'gradereport_user_get_grades_table',
          moodlewsrestformat: 'json',
          courseid: args.courseId
        }
      });

      if (response.data) {
        return {
          success: true,
          data: response.data
        };
      } else {
        return {
          success: false,
          error: 'Failed to get grades'
        };
      }
    } catch (error: any) {
      // If this function doesn't exist, try alternative
      try {
        const altResponse = await axios.get(`${args.baseUrl}/webservice/rest/server.php`, {
          params: {
            wstoken: args.apiKey,
            wsfunction: 'core_grades_get_grades',
            moodlewsrestformat: 'json',
            courseid: args.courseId
          }
        });

        return {
          success: true,
          data: altResponse.data || []
        };
      } catch (altError: any) {
        return {
          success: false,
          error: altError.message || 'Failed to fetch grades'
        };
      }
    }
  });

  // Get user info
  ipcMain.handle('moodle:get-user-info', async (event, args: { baseUrl: string; apiKey: string }) => {
    try {
      const response = await axios.get(`${args.baseUrl}/webservice/rest/server.php`, {
        params: {
          wstoken: args.apiKey,
          wsfunction: 'core_webservice_get_site_info',
          moodlewsrestformat: 'json'
        }
      });

      if (response.data && !response.data.exception) {
        return {
          success: true,
          data: {
            userid: response.data.userid,
            username: response.data.username,
            firstname: response.data.firstname,
            lastname: response.data.lastname,
            fullname: response.data.fullname,
            email: response.data.useremail,
            sitename: response.data.sitename,
            siteurl: response.data.siteurl
          }
        };
      } else {
        return {
          success: false,
          error: response.data?.message || 'Failed to get user info'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch user info'
      };
    }
  });

  // Get assignments for course - Updated to use course contents to find all assignments and then get their details.
  ipcMain.handle('moodle:get-assignments', async (event, args: { baseUrl: string; apiKey: string; courseId: string }) => {
    console.log('[Moodle API] Getting assignments for course:', args.courseId);
    
    try {
      // Now, get the full details for these assignments
      const assignmentsResponse = await axios.get(`${args.baseUrl}/webservice/rest/server.php`, {
        params: {
          wstoken: args.apiKey,
          wsfunction: 'mod_assign_get_assignments',
          moodlewsrestformat: 'json',
          'courseids[0]': args.courseId,
        }
      });

      console.log('[Moodle API] Full assignment details response received.');

      let assignments = [];
      if (assignmentsResponse.data && assignmentsResponse.data.courses && assignmentsResponse.data.courses.length > 0) {
        // The assignments are nested inside the courses array
        assignments = assignmentsResponse.data.courses.flatMap((course: any) => course.assignments || []);
        console.log('[Moodle API] Extracted assignments:', assignments.length);
      } else {
        console.log('[Moodle API] No assignments found in details response:', assignmentsResponse.data);
      }

      return {
        success: true,
        data: assignments
      };

    } catch (error: any) {
      console.error('[Moodle API] Error fetching assignments:', error.response ? error.response.data : error.message);
      return {
        success: false,
        error: error.message || 'Failed to fetch assignments'
      };
    }
  });

  // Get assignment submissions
  ipcMain.handle('moodle:get-assignment-submissions', async (event, args: { baseUrl: string; apiKey: string; assignmentId: string }) => {
    try {
      const response = await axios.get(`${args.baseUrl}/webservice/rest/server.php`, {
        params: {
          wstoken: args.apiKey,
          wsfunction: 'mod_assign_get_submissions',
          moodlewsrestformat: 'json',
          assignmentids: [args.assignmentId]
        }
      });

      if (response.data && response.data.assignments && response.data.assignments.length > 0) {
        const submissions = response.data.assignments[0].submissions || [];
        return {
          success: true,
          data: submissions
        };
      } else {
        return {
          success: true,
          data: []
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch assignment submissions'
      };
    }
  });

  // Get assignment grades
  ipcMain.handle('moodle:get-assignment-grades', async (event, args: { baseUrl: string; apiKey: string; assignmentId: string }) => {
    try {
      const response = await axios.get(`${args.baseUrl}/webservice/rest/server.php`, {
        params: {
          wstoken: args.apiKey,
          wsfunction: 'mod_assign_get_grades',
          moodlewsrestformat: 'json',
          assignmentids: [args.assignmentId]
        }
      });

      if (response.data && response.data.assignments && response.data.assignments.length > 0) {
        const grades = response.data.assignments[0].grades || [];
        return {
          success: true,
          data: grades
        };
      } else {
        return {
          success: true,
          data: []
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch assignment grades'
      };
    }
  });

  // Update assignment grade
  ipcMain.handle('moodle:update-assignment-grade', async (event, args: { 
    baseUrl: string; 
    apiKey: string; 
    assignmentId: string; 
    userId: string; 
    grade: number; 
    feedback?: string;
  }) => {
    try {
      const response = await axios.post(`${args.baseUrl}/webservice/rest/server.php`, null, {
        params: {
          wstoken: args.apiKey,
          wsfunction: 'mod_assign_save_grade',
          moodlewsrestformat: 'json',
          assignmentid: args.assignmentId,
          userid: args.userId,
          grade: args.grade,
          plugindata: JSON.stringify({
            assignfeedbackcomments_editor: {
              text: args.feedback || '',
              format: 1
            }
          })
        }
      });

      if (response.data && !response.data.exception) {
        return {
          success: true,
          data: response.data
        };
      } else {
        return {
          success: false,
          error: response.data?.message || 'Failed to update grade'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update assignment grade'
      };
    }
  });
}
