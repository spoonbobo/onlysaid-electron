import { create } from "zustand";
import { useUserTokenStore } from "@/stores/User/UserToken";
import type { ICalendarEvent, ICalendar } from "@/../../types/Calendar/Calendar";

interface IMicrosoftCalendarStore {
  events: ICalendarEvent[];
  calendars: ICalendar[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchCalendars: () => Promise<void>;
  fetchEvents: (calendarId?: string, timeMin?: string, timeMax?: string) => Promise<void>;
  fetchEventsForSelectedCalendars: (timeMin: string, timeMax: string) => Promise<void>;
  toggleCalendar: (calendarId: string) => void;
  getVisibleEvents: () => ICalendarEvent[];
  clearError: () => void;
}

// Helper function to add timeout to any promise
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 15000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

// Helper function to handle authentication errors
const handleAuthError = (error: any): boolean => {
  if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
    // Clear the invalid token
    useUserTokenStore.getState().setMicrosoftCalendarConnected(false, null, null, null);
    return true;
  }
  return false;
};

export const useMicrosoftCalendarStore = create<IMicrosoftCalendarStore>((set, get) => ({
  events: [],
  calendars: [],
  loading: false,
  error: null,

  fetchCalendars: async () => {
    const userTokenStore = useUserTokenStore.getState();
    const token = userTokenStore.microsoftCalendarToken;
    const refreshToken = userTokenStore.microsoftCalendarRefreshToken;

    if (!token) {
      set({ error: 'No Microsoft Calendar token available. Please reconnect your Microsoft account.' });
      return;
    }

    // Check if user is still connected
    if (!userTokenStore.microsoftCalendarConnected) {
      set({ error: 'Microsoft Calendar is not connected. Please connect in Settings.' });
      return;
    }

    set({ loading: true, error: null });

    try {
      console.log('[Microsoft Calendar Store] Fetching calendars via electron...');
      console.log('[Microsoft Calendar Store] Token length:', token.length);
      console.log('[Microsoft Calendar Store] Token preview:', token.substring(0, 20) + '...');
      console.log('[Microsoft Calendar Store] Has refresh token:', !!refreshToken);

      const result = await window.electron.microsoftCalendar.fetchCalendars(token, refreshToken || undefined);

      // Handle loading state (dependencies not ready)
      if (result.loading) {
        set({
          loading: true,
          error: 'Microsoft Calendar services are starting up. Please wait...'
        });

        // Retry after a delay
        setTimeout(() => {
          if (get().loading) {
            get().fetchCalendars();
          }
        }, 3000);
        return;
      }

      // Handle token refresh from API response
      if (result.newToken) {
        console.log('[Microsoft Calendar Store] Updating tokens from API response');
        useUserTokenStore.getState().setMicrosoftCalendarConnected(
          true,
          userTokenStore.microsoftCalendarUser,
          result.newToken.accessToken,
          result.newToken.refreshToken
        );
      }

      if (!result.success) {
        const error = new Error(result.error || 'Unknown error occurred');

        // Handle authentication errors
        if (result.requiresReauth || handleAuthError(error)) {
          set({
            error: 'Microsoft Calendar authentication expired. Please reconnect in Settings.',
            loading: false,
            calendars: [],
            events: []
          });
          // Clear tokens
          useUserTokenStore.getState().setMicrosoftCalendarConnected(false, null, null, null);
          return;
        }

        throw error;
      }

      const calendars: ICalendar[] = (result.calendars || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        primary: item.isDefaultCalendar || false,
        provider: 'outlook' as const,
        color: item.color || '#0078d4', // Default Microsoft blue
        timezone: item.timeZone,
        accessRole: item.canEdit ? 'owner' : 'reader',
        selected: true,
      }));

      set({ calendars, loading: false, error: null });
      console.log('[Microsoft Calendar Store] Fetched calendars:', calendars);

    } catch (error) {
      console.error('[Microsoft Calendar Store] Error fetching calendars:', error);

      // Handle authentication errors
      if (handleAuthError(error)) {
        set({
          error: 'Microsoft Calendar authentication expired. Please reconnect in Settings.',
          loading: false,
          calendars: [],
          events: []
        });
        // Clear tokens
        useUserTokenStore.getState().setMicrosoftCalendarConnected(false, null, null, null);
        return;
      }

      set({
        error: error instanceof Error ? error.message : 'Failed to fetch calendars',
        loading: false
      });
    }
  },

  fetchEvents: async (calendarId = 'calendar', timeMin, timeMax) => {
    const userTokenStore = useUserTokenStore.getState();
    const token = userTokenStore.microsoftCalendarToken;
    const refreshToken = userTokenStore.microsoftCalendarRefreshToken;

    if (!token) {
      set({ error: 'No Microsoft Calendar token available. Please reconnect your Microsoft account.' });
      return;
    }

    if (!userTokenStore.microsoftCalendarConnected) {
      set({ error: 'Microsoft Calendar is not connected. Please connect in Settings.' });
      return;
    }

    set({ loading: true, error: null });

    try {
      console.log('[Microsoft Calendar Store] Fetching events via electron...', { calendarId, timeMin, timeMax });

      // Add timeout protection
      const result = await withTimeout(
        window.electron.microsoftCalendar.fetchEvents({
          token,
          refreshToken: refreshToken || undefined,
          calendarId,
          timeMin,
          timeMax,
          maxResults: 100
        }),
        15000 // 15 second timeout
      );

      // Handle token refresh from API response
      if (result.newToken) {
        console.log('[Microsoft Calendar Store] Updating tokens from events API response');
        useUserTokenStore.getState().setMicrosoftCalendarConnected(
          true,
          userTokenStore.microsoftCalendarUser,
          result.newToken.accessToken,
          result.newToken.refreshToken
        );
      }

      if (!result.success) {
        const error = new Error(result.error || 'Unknown error occurred');

        // Handle authentication errors
        if (result.requiresReauth || handleAuthError(error)) {
          set({
            error: 'Microsoft Calendar authentication expired. Please reconnect in Settings.',
            loading: false,
            events: []
          });
          // Clear tokens
          useUserTokenStore.getState().setMicrosoftCalendarConnected(false, null, null, null);
          return;
        }

        throw error;
      }

      const events: ICalendarEvent[] = (result.events || []).map((item: any) => ({
        id: item.id,
        calendarId: calendarId,
        provider: 'outlook' as const,
        summary: item.subject || 'No title',
        description: item.body?.content || item.bodyPreview,
        location: item.location?.displayName || item.locations?.[0]?.displayName,
        start: {
          dateTime: item.start?.dateTime,
          date: item.isAllDay ? item.start?.dateTime?.split('T')[0] : undefined,
          timezone: item.start?.timeZone,
        },
        end: {
          dateTime: item.end?.dateTime,
          date: item.isAllDay ? item.end?.dateTime?.split('T')[0] : undefined,
          timezone: item.end?.timeZone,
        },
        allDay: item.isAllDay || false,
        attendees: item.attendees?.map((attendee: any) => ({
          email: attendee.emailAddress?.address,
          name: attendee.emailAddress?.name,
          responseStatus: mapMicrosoftResponseStatus(attendee.status?.response),
          organizer: attendee.type === 'required' && item.organizer?.emailAddress?.address === attendee.emailAddress?.address,
          optional: attendee.type === 'optional',
        })),
        organizer: item.organizer ? {
          email: item.organizer.emailAddress?.address,
          name: item.organizer.emailAddress?.name,
          organizer: true,
        } : undefined,
        status: mapMicrosoftEventStatus(item.responseStatus?.response),
        visibility: mapMicrosoftSensitivity(item.sensitivity),
        created: item.createdDateTime,
        updated: item.lastModifiedDateTime,
        url: item.webLink,
        color: item.importance === 'high' ? '#ff6b6b' : undefined,
      }));

      // Merge events instead of replacing them
      const currentEvents = get().events;
      const filteredEvents = currentEvents.filter(e => e.calendarId !== calendarId);
      const allEvents = [...filteredEvents, ...events];

      set({ events: allEvents, loading: false });
      console.log('[Microsoft Calendar Store] Fetched events for calendar:', calendarId, events.length);

    } catch (error) {
      console.error('[Microsoft Calendar Store] Error fetching events:', error);

      // Handle authentication errors
      if (handleAuthError(error)) {
        set({
          error: 'Microsoft Calendar authentication expired. Please reconnect in Settings.',
          loading: false,
          events: []
        });
        // Clear tokens
        useUserTokenStore.getState().setMicrosoftCalendarConnected(false, null, null, null);
        return;
      }

      let errorMessage = 'Failed to fetch events';
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          errorMessage = 'Request timed out. Microsoft services may be loading. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }

      set({
        error: errorMessage,
        loading: false
      });
    }
  },

  fetchEventsForSelectedCalendars: async (timeMin: string, timeMax: string) => {
    const { calendars } = get();
    const selectedCalendars = calendars.filter(cal => cal.selected);

    if (selectedCalendars.length === 0) {
      set({ events: [] });
      return;
    }

    // Check if Microsoft Calendar is still connected
    const userTokenStore = useUserTokenStore.getState();
    if (!userTokenStore.microsoftCalendarConnected) {
      set({
        error: 'Microsoft Calendar is not connected. Please connect in Settings.',
        events: []
      });
      return;
    }

    set({ loading: true, error: null });

    try {
      // Clear existing events
      set({ events: [] });

      // Fetch events for each selected calendar with timeout protection
      const fetchPromises = selectedCalendars.map(calendar =>
        withTimeout(
          get().fetchEvents(calendar.id, timeMin, timeMax),
          20000 // Longer timeout for multiple calendars
        )
      );

      await Promise.allSettled(fetchPromises);
      set({ loading: false });

    } catch (error) {
      console.error('[Microsoft Calendar Store] Error fetching events for selected calendars:', error);

      // Handle authentication errors
      if (handleAuthError(error)) {
        set({
          error: 'Microsoft Calendar authentication expired. Please reconnect in Settings.',
          loading: false,
          events: []
        });
        // Clear tokens
        useUserTokenStore.getState().setMicrosoftCalendarConnected(false, null, null, null);
        return;
      }

      let errorMessage = 'Failed to fetch calendar events';
      if (error instanceof Error && error.message.includes('timed out')) {
        errorMessage = 'Request timed out. Microsoft services may be loading. Please try again.';
      }

      set({
        loading: false,
        error: errorMessage
      });
    }
  },

  toggleCalendar: (calendarId: string) => {
    const { calendars } = get();
    const updatedCalendars = calendars.map(calendar =>
      calendar.id === calendarId
        ? { ...calendar, selected: !calendar.selected }
        : calendar
    );
    set({ calendars: updatedCalendars });
  },

  getVisibleEvents: () => {
    const { events, calendars } = get();
    const selectedCalendarIds = new Set(calendars.filter(cal => cal.selected).map(cal => cal.id));
    return events.filter(event => selectedCalendarIds.has(event.calendarId));
  },

  clearError: () => set({ error: null }),
}));

// Helper functions to map Microsoft Graph API responses to unified types
function mapMicrosoftResponseStatus(microsoftStatus: string): 'needsAction' | 'declined' | 'tentative' | 'accepted' {
  switch (microsoftStatus?.toLowerCase()) {
    case 'accepted':
      return 'accepted';
    case 'declined':
      return 'declined';
    case 'tentativelyaccepted':
      return 'tentative';
    case 'none':
    case 'notresponded':
    default:
      return 'needsAction';
  }
}

function mapMicrosoftEventStatus(microsoftStatus: string): 'confirmed' | 'tentative' | 'cancelled' {
  switch (microsoftStatus?.toLowerCase()) {
    case 'accepted':
      return 'confirmed';
    case 'tentativelyaccepted':
      return 'tentative';
    case 'declined':
      return 'cancelled';
    default:
      return 'confirmed';
  }
}

function mapMicrosoftSensitivity(sensitivity: string): 'default' | 'public' | 'private' | 'confidential' {
  switch (sensitivity?.toLowerCase()) {
    case 'normal':
      return 'default';
    case 'personal':
      return 'private';
    case 'private':
      return 'private';
    case 'confidential':
      return 'confidential';
    default:
      return 'default';
  }
}
