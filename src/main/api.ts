import { ipcMain } from 'electron';
import axios from 'axios';

const ONLYSAID_API_URL = "http://onlysaid-dev.com";

// Handle API requests from the renderer process
export const setupApiHandlers = () => {
  // Handle API requests for fetching rooms
  ipcMain.handle('api:get-rooms', async (event, args) => {
    try {
      const { roomIds, token, cookieName } = args;

      console.log('token', token);
      console.log('Main process handling API request for rooms:', roomIds);

      const response = await axios.post(
        ONLYSAID_API_URL + '/api/chat/get_rooms',
        { roomIds },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call:', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  // You can add more API handlers here in the future
};

// Export the API URL so it can be used elsewhere
export const getApiUrl = () => ONLYSAID_API_URL;
