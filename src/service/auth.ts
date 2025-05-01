import { IUser } from '../models/User/UserInfo';
import { useUserTokenStore } from '../stores/User/UserToken';

export class AuthService {
  private readonly baseURL: string;
  private readonly isElectron: boolean;

  constructor(baseURL = 'https://onlysaid.com') {
    this.baseURL = baseURL;
    // Check if we're in an Electron environment
    this.isElectron = !!(window && window.electron);
  }

  async getNextAuthSession(): Promise<IUser | null> {
    // Only used in browser context, not in Electron
    if (this.isElectron) {
      return null;
    }

    try {
      // We're in a browser with direct access to the NextAuth API
      const response = await fetch('/api/auth/session', {
        headers: {
          'Accept': 'application/json'
        }
      });

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response from session endpoint');
      }

      const session = await response.json();

      if (!session || !session.user) {
        throw new Error('No session found');
      }

      return {
        id: session.user.id || session.user.email || 'user-id',
        name: session.user.name || 'Authenticated User',
        email: session.user.email || 'user@example.com',
        active_rooms: [],
        archived_rooms: [],
        avatar: session.user.image || '',
        settings: {
          general: {
            theme: 'light',
            language: 'en'
          }
        },
        teams: []
      };
    } catch (error) {
      console.error('Error fetching NextAuth session:', error);
      return null;
    }
  }

  /**
   * Gets the current user authentication token
   */
  getUserToken(): { token: string | null, cookieName: string | null } {
    const { token, cookieName } = useUserTokenStore.getState();
    return { token, cookieName };
  }

  /**
   * Creates a user object from provided userData
   */
  createUserFromData(userData: any): IUser | null {

    if (!userData || typeof userData !== 'object') {
      console.log('No userData provided');
      return null;
    }

    // Create a user from the userData
    return {
      id: userData.email || userData.sub || userData.id || 'user-id',
      name: userData.name || 'Authenticated User',
      email: userData.email || 'user@example.com',
      active_rooms: [],
      archived_rooms: [],
      avatar: userData.image || userData.avatar || userData.picture || '',
      settings: {
        general: {
          theme: 'light',
          language: 'en'
        }
      },
      teams: []
    };
  }
}

export default new AuthService();
