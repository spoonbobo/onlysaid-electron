import { useMemo } from 'react';
import { useGoogleCalendarStore } from '../stores/Google/GoogleCalendarStore';
import { useMicrosoftCalendarStore } from '../stores/MSFT/MSFTCalendarStore';
import { useUserTokenStore } from '../stores/User/UserToken';
import type { ICalendarEvent, ICalendar } from '@/../../types/Calendar/Calendar';

export const useUnifiedCalendar = () => {
  const googleStore = useGoogleCalendarStore();
  const microsoftStore = useMicrosoftCalendarStore();
  const { googleCalendarConnected, microsoftCalendarConnected } = useUserTokenStore();

  const allCalendars = useMemo((): ICalendar[] => [
    ...googleStore.calendars,
    ...microsoftStore.calendars
  ], [googleStore.calendars, microsoftStore.calendars]);

  const allEvents = useMemo((): ICalendarEvent[] => [
    ...googleStore.getVisibleEvents(),
    ...microsoftStore.getVisibleEvents()
  ], [googleStore.getVisibleEvents, microsoftStore.getVisibleEvents]);

  const isLoading = googleStore.loading || microsoftStore.loading;

  const hasErrors = !!(googleStore.error || microsoftStore.error);

  const errors = [googleStore.error, microsoftStore.error].filter(Boolean);

  const hasConnectedCalendars =
    (googleCalendarConnected && googleStore.calendars.length > 0) ||
    (microsoftCalendarConnected && microsoftStore.calendars.length > 0);

  const fetchEventsForDateRange = async (timeMin: string, timeMax: string) => {
    const fetchPromises = [];

    if (googleCalendarConnected && googleStore.calendars.length > 0) {
      fetchPromises.push(googleStore.fetchEventsForSelectedCalendars(timeMin, timeMax));
    }

    if (microsoftCalendarConnected && microsoftStore.calendars.length > 0) {
      fetchPromises.push(microsoftStore.fetchEventsForSelectedCalendars(timeMin, timeMax));
    }

    if (fetchPromises.length > 0) {
      await Promise.allSettled(fetchPromises);
    }
  };

  const getEventColor = (event: ICalendarEvent): string => {
    const calendar = allCalendars.find(cal => cal.id === event.calendarId);
    return calendar?.color || (event.provider === 'outlook' ? '#0078d4' : '#1976d2');
  };

  return {
    calendars: allCalendars,
    events: allEvents,
    isLoading,
    hasErrors,
    errors,
    hasConnectedCalendars,
    fetchEventsForDateRange,
    getEventColor,
    // Individual store access if needed
    googleStore,
    microsoftStore,
  };
};