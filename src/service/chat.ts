import { toast } from "../utils/toast";

// Function to get rooms data
export const getRooms = async (roomIds: string[], token: string, cookieName?: string) => {
  try {
    // Use only the IPC approach - no fallback
    const result = await window.electron.ipcRenderer.invoke('api:get-rooms', {
      roomIds,
      token,
      cookieName
    });

    if (result.error) {
      // throw new Error(result.error);
      toast.error(`Error fetching rooms: ${result.error}`, 1000);
      return [];
    }

    return result.data;
  } catch (error) {
    toast.error(`Error fetching rooms: ${error}`, 1000);
    return [];
  }
};

// Add other chat-related API functions here