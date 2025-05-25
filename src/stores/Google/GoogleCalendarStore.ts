import { create } from "zustand";
import { useUserTokenStore } from "@/stores/User/UserToken";
import type { ICalendarEvent, ICalendar } from "@/../../types/Calendar/Calendar";

interface IGoogleCalendarStore {
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

export const useGoogleCalendarStore = create<IGoogleCalendarStore>((set, get) => ({
  events: [],
  calendars: [],
  loading: false,
  error: null,

  fetchCalendars: async () => {
    const token = useUserTokenStore.getState().googleCalendarToken;

    if (!token) {
      set({ error: 'No Google Calendar token available' });
      return;
    }

    set({ loading: true, error: null });

    try {
      console.log('[Google Calendar Store] Fetching calendars via electron...');

      const result = await window.electron.googleCalendar.fetchCalendars(token);

      if (!result.success) {
        throw new Error(result.error);
      }

      const calendars: ICalendar[] = (result.calendars || []).map((item: any) => ({
        id: item.id,
        name: item.summary,
        description: item.description,
        primary: item.primary,
        provider: 'google' as const,
        color: item.backgroundColor,
        timezone: item.timeZone,
        accessRole: item.accessRole,
        selected: true,
      }));

      set({ calendars, loading: false });
      console.log('[Google Calendar Store] Fetched calendars:', calendars);

    } catch (error) {
      console.error('[Google Calendar Store] Error fetching calendars:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch calendars',
        loading: false
      });
    }
  },

  fetchEvents: async (calendarId = 'primary', timeMin, timeMax) => {
    const token = useUserTokenStore.getState().googleCalendarToken;

    if (!token) {
      set({ error: 'No Google Calendar token available' });
      return;
    }

    set({ loading: true, error: null });

    try {
      console.log('[Google Calendar Store] Fetching events via electron...', { calendarId, timeMin, timeMax });

      const result = await window.electron.googleCalendar.fetchEvents({
        token,
        calendarId,
        timeMin,
        timeMax,
        maxResults: 100
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      const events: ICalendarEvent[] = (result.events || []).map((item: any) => ({
        id: item.id,
        calendarId: calendarId,
        provider: 'google' as const,
        summary: item.summary || 'No title',
        description: item.description,
        location: item.location,
        start: {
          dateTime: item.start?.dateTime,
          date: item.start?.date,
          timezone: item.start?.timeZone,
        },
        end: {
          dateTime: item.end?.dateTime,
          date: item.end?.date,
          timezone: item.end?.timeZone,
        },
        allDay: !!item.start?.date,
        attendees: item.attendees?.map((attendee: any) => ({
          email: attendee.email,
          name: attendee.displayName,
          responseStatus: attendee.responseStatus,
          organizer: attendee.organizer,
          optional: attendee.optional,
        })),
        organizer: item.organizer ? {
          email: item.organizer.email,
          name: item.organizer.displayName,
          organizer: true,
        } : undefined,
        status: item.status,
        visibility: item.visibility,
        created: item.created,
        updated: item.updated,
        url: item.htmlLink,
        color: item.colorId,
      }));

      // Merge events instead of replacing them
      const currentEvents = get().events;
      const filteredEvents = currentEvents.filter(e => e.calendarId !== calendarId);
      const allEvents = [...filteredEvents, ...events];

      set({ events: allEvents, loading: false });
      console.log('[Google Calendar Store] Fetched events for calendar:', calendarId, events.length);

    } catch (error) {
      console.error('[Google Calendar Store] Error fetching events:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch events',
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

    set({ loading: true, error: null });

    try {
      // Clear existing events
      set({ events: [] });

      // Fetch events for each selected calendar
      for (const calendar of selectedCalendars) {
        await get().fetchEvents(calendar.id, timeMin, timeMax);
      }

      set({ loading: false });
    } catch (error) {
      console.error('[Google Calendar Store] Error fetching events for selected calendars:', error);
      set({ loading: false });
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
