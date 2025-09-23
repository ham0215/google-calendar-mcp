import { google, calendar_v3 } from 'googleapis';
import { OAuthManager } from '../auth/oauth.js';
import { TokenManager } from '../auth/token-manager.js';

export interface CalendarClientConfig {
  tokenManager: TokenManager;
  oauthManager: OAuthManager;
}

export interface CalendarEvent {
  id?: string | null;
  summary?: string | null;
  description?: string | null;
  start?: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  } | null;
  end?: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  } | null;
  attendees?: Array<{
    email?: string | null;
    displayName?: string | null;
    responseStatus?: string | null;
    self?: boolean | null;
    organizer?: boolean | null;
  }> | null;
  organizer?: {
    email?: string | null;
    displayName?: string | null;
    self?: boolean | null;
  } | null;
  location?: string | null;
  hangoutLink?: string | null;
  conferenceData?: calendar_v3.Schema$ConferenceData | null;
  status?: string | null;
}

export interface ListEventsOptions {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  orderBy?: 'startTime' | 'updated';
  singleEvents?: boolean;
  showDeleted?: boolean;
  pageToken?: string;
  q?: string;
  timeZone?: string;
}

export class CalendarClient {
  private calendar: calendar_v3.Calendar | null = null;
  private tokenManager: TokenManager;
  private oauthManager: OAuthManager;
  private initialized = false;

  constructor(config: CalendarClientConfig) {
    this.tokenManager = config.tokenManager;
    this.oauthManager = config.oauthManager;
  }

  /**
   * Initialize the Google Calendar API client with authentication
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Ensure we have valid authentication
      await this.tokenManager.ensureAuthenticated();

      // Get the authenticated OAuth2 client
      const authClient = this.oauthManager.getClient();

      // Create the Google Calendar API client
      this.calendar = google.calendar({
        version: 'v3',
        auth: authClient,
      });

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Calendar client: ${error}`);
    }
  }

  /**
   * Ensure the client is initialized before making API calls
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Generic API request wrapper with error handling and retry logic
   */
  private async makeApiRequest<T>(requestFn: () => Promise<T>, retries = 3): Promise<T> {
    await this.ensureInitialized();

    let lastError: unknown;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;

        // Handle specific error cases
        const errorCode = (error as {code?: number}).code;
        if (errorCode === 401) {
          // Token expired or invalid - try to refresh
          console.log('Authentication error - attempting to refresh tokens...');
          await this.tokenManager.ensureAuthenticated();
          continue;
        }

        if (errorCode === 403) {
          // Permission denied
          throw new Error('Permission denied. Please check your Google Calendar permissions.');
        }

        if (errorCode === 429) {
          // Rate limit exceeded - wait and retry
          const retryAfter = (error as {response?: {headers?: {'retry-after'?: number}}}).response?.headers?.['retry-after'] || attempt * 2;
          console.log(`Rate limit exceeded. Waiting ${retryAfter} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
          continue;
        }

        if (errorCode && errorCode >= 500) {
          // Server error - retry with exponential backoff
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`Server error. Retrying in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        // For other errors, throw immediately
        throw error;
      }
    }

    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`Failed after ${retries} attempts: ${errorMessage}`);
  }

  /**
   * List calendar events with pagination support
   */
  async listEvents(options: ListEventsOptions = {}): Promise<{
    events: CalendarEvent[];
    nextPageToken?: string | null;
  }> {
    const response = await this.makeApiRequest(async () => {
      if (!this.calendar) {
        throw new Error('Calendar client not initialized');
      }

      const params: calendar_v3.Params$Resource$Events$List = {
        calendarId: options.calendarId || 'primary',
        timeMin: options.timeMin,
        timeMax: options.timeMax,
        maxResults: options.maxResults || 250,
        orderBy: options.orderBy || 'startTime',
        singleEvents: options.singleEvents !== false,
        showDeleted: options.showDeleted || false,
        pageToken: options.pageToken,
        q: options.q,
        timeZone: options.timeZone,
      };

      return await this.calendar.events.list(params);
    });

    return {
      events: (response.data.items || []) as CalendarEvent[],
      nextPageToken: response.data.nextPageToken,
    };
  }

  /**
   * Get all events for a date range (handles pagination automatically)
   */
  async getAllEvents(options: Omit<ListEventsOptions, 'pageToken'>): Promise<CalendarEvent[]> {
    const allEvents: CalendarEvent[] = [];
    let pageToken: string | null | undefined = undefined;

    do {
      const { events, nextPageToken } = await this.listEvents({
        ...options,
        pageToken,
      });

      allEvents.push(...events);
      pageToken = nextPageToken;
    } while (pageToken);

    return allEvents;
  }

  /**
   * Get a single event by ID
   */
  async getEvent(eventId: string, calendarId = 'primary'): Promise<CalendarEvent | null> {
    const response = await this.makeApiRequest(async () => {
      if (!this.calendar) {
        throw new Error('Calendar client not initialized');
      }

      return await this.calendar.events.get({
        calendarId,
        eventId,
      });
    });

    return response.data as CalendarEvent;
  }

  /**
   * Get events for today in a specific timezone
   */
  async getTodayEvents(timeZone = 'UTC'): Promise<CalendarEvent[]> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    return await this.getAllEvents({
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      timeZone,
      orderBy: 'startTime',
      singleEvents: true,
    });
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(maxResults = 10, timeZone = 'UTC'): Promise<CalendarEvent[]> {
    const now = new Date();

    const { events } = await this.listEvents({
      timeMin: now.toISOString(),
      maxResults,
      orderBy: 'startTime',
      singleEvents: true,
      timeZone,
    });

    return events;
  }

  /**
   * Check if the client is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset the client (useful for testing or re-authentication)
   */
  reset(): void {
    this.calendar = null;
    this.initialized = false;
  }
}
