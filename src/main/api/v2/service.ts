import axios from "axios";
import dotenv from 'dotenv';

dotenv.config();

const ONLYSAID_API_URL = process.env.ONLYSAID_API_URL

const onlysaidServiceInstance = axios.create({
  baseURL: ONLYSAID_API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add health check method
export const healthCheck = async (token: string): Promise<boolean> => {
  if (!token) {
    console.error('[HealthCheck] No token provided for health check');
    return false;
  }

  console.log('[HealthCheck] Starting health check for logged-in user...');
  console.log('[HealthCheck] API URL:', ONLYSAID_API_URL);
  console.log('[HealthCheck] Token preview:', token.substring(0, 10) + '...');
  
  try {
    const response = await onlysaidServiceInstance.get('/health', {
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': `next-auth.session-token=${token}`
      }
    });
    
    console.log('[HealthCheck] Response status:', response.status);
    console.log('[HealthCheck] Response data:', response.data);
    
    return response.status === 200;
  } catch (error: any) {
    console.error('[HealthCheck] Health check failed:', {
      code: error.code,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    // Check if it's a network connectivity issue vs auth issue
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.warn('[HealthCheck] Network connectivity issue detected');
      return false;
    }
    
    // Auth-related errors (401, 403) also indicate unhealthy state
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.warn('[HealthCheck] Authentication failed - token invalid');
      return false;
    }
    
    return false;
  }
};

export default onlysaidServiceInstance;