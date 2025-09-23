import { CalendarClient, CalendarEvent } from '../calendar/client.js';
import { createMeetingFilter, FilterConfig } from '../calendar/filters.js';
import { OAuthManager } from '../auth/oauth.js';
import { TokenManager } from '../auth/token-manager.js';
import { getValidatedConfig } from '../config/settings.js';

export interface GetTodayMeetingsParams {
  timezone?: string;
  includeDeclined?: boolean;
  minAttendees?: number;
  excludeKeywords?: string[];
}

export interface MeetingInfo {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  attendees: Array<{
    email: string;
    name?: string;
    responseStatus?: string;
    isOrganizer?: boolean;
  }>;
  location?: string;
  meetingLink?: string;
  description?: string;
  isAccepted: boolean;
  isOrganizer: boolean;
}

let calendarClient: CalendarClient | null = null;

/**
 * Initialize the calendar client if not already initialized
 */
async function getCalendarClient(): Promise<CalendarClient> {
  if (!calendarClient) {
    const config = getValidatedConfig();

    const oauthManager = new OAuthManager({
      clientId: config.google.clientId,
      clientSecret: config.google.clientSecret,
      redirectUri: config.google.redirectUri,
      scopes: config.google.scopes,
    });

    const tokenManager = new TokenManager(config.storage.tokenPath, oauthManager);

    calendarClient = new CalendarClient({
      tokenManager,
      oauthManager,
    });

    await calendarClient.initialize();
  }

  return calendarClient;
}

/**
 * Format calendar event to meeting info
 */
function formatEventToMeeting(event: CalendarEvent): MeetingInfo {
  const startTime = event.start?.dateTime || event.start?.date || '';
  const endTime = event.end?.dateTime || event.end?.date || '';

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)); // in minutes

  const userAttendee = event.attendees?.find((attendee) => attendee.self === true);
  const isOrganizer = event.organizer?.self === true;
  const isAccepted =
    isOrganizer ||
    userAttendee?.responseStatus === 'accepted' ||
    userAttendee?.responseStatus === 'tentative';

  const attendees =
    event.attendees?.map((attendee) => ({
      email: attendee.email || '',
      name: attendee.displayName || undefined,
      responseStatus: attendee.responseStatus || undefined,
      isOrganizer: attendee.organizer === true,
    })) || [];

  // Add organizer if not in attendees list
  if (event.organizer && !attendees.find((a) => a.email === event.organizer?.email)) {
    attendees.unshift({
      email: event.organizer.email || '',
      name: event.organizer.displayName || undefined,
      responseStatus: 'accepted',
      isOrganizer: true,
    });
  }

  // Extract meeting link from various sources
  let meetingLink: string | undefined;
  if (event.hangoutLink) {
    meetingLink = event.hangoutLink;
  } else if (event.conferenceData?.entryPoints) {
    const videoEntry = event.conferenceData.entryPoints.find(
      (entry) => entry.entryPointType === 'video'
    );
    meetingLink = videoEntry?.uri || undefined;
  }

  return {
    id: event.id || '',
    title: event.summary || '(No title)',
    startTime,
    endTime,
    duration,
    attendees,
    location: event.location || undefined,
    meetingLink,
    description: event.description || undefined,
    isAccepted,
    isOrganizer,
  };
}

/**
 * Get today's meetings with filtering
 */
export async function getTodayMeetings(params: GetTodayMeetingsParams = {}): Promise<{
  meetings: MeetingInfo[];
  timezone: string;
  date: string;
}> {
  const config = getValidatedConfig();
  const timezone = params.timezone || config.calendar.defaultTimezone;

  try {
    const client = await getCalendarClient();

    // Get today's events
    const events = await client.getTodayEvents(timezone);

    // Create filter configuration
    const filterConfig: FilterConfig = {
      minAttendees: params.minAttendees ?? config.filter.minAttendees,
      excludeKeywords: params.excludeKeywords ?? config.filter.excludeKeywords,
      requireAccepted: !params.includeDeclined && config.filter.requireAccepted,
      excludeDeclined: !params.includeDeclined && config.filter.excludeDeclined,
      excludeAllDayEvents: config.filter.excludeAllDayEvents,
    };

    // Apply filters
    const filter = createMeetingFilter(filterConfig);
    const filteredEvents = filter.filterEvents(events);

    // Format events to meeting info
    const meetings = filteredEvents.map(formatEventToMeeting);

    // Sort by start time
    meetings.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return {
      meetings,
      timezone,
      date: new Date().toISOString().split('T')[0],
    };
  } catch (error) {
    console.error("Error fetching today's meetings:", error);
    throw new Error(`Failed to fetch meetings: ${error}`);
  }
}

/**
 * Tool schema definition for MCP
 */
export function getTodayMeetingsTool() {
  return {
    name: 'getTodayMeetings',
    description: "Get today's meetings from Google Calendar with intelligent filtering",
    inputSchema: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Timezone for the calendar events (e.g., "America/New_York", "Asia/Tokyo")',
          default: 'UTC',
        },
        includeDeclined: {
          type: 'boolean',
          description: 'Include meetings that you have declined',
          default: false,
        },
        minAttendees: {
          type: 'number',
          description: 'Minimum number of attendees required for a meeting to be included',
          default: 2,
        },
        excludeKeywords: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Keywords to exclude from meeting titles and descriptions',
          default: [],
        },
      },
      required: [],
    },
  };
}

/**
 * Execute the getTodayMeetings tool
 */
interface ToolArgs {
  timezone?: string;
  includeDeclined?: boolean;
  minAttendees?: number;
  excludeKeywords?: string[];
}

export async function executeTodayMeetingsTool(args: ToolArgs): Promise<{
  type: string;
  text: string;
}> {
  try {
    const params: GetTodayMeetingsParams = {
      timezone: args.timezone,
      includeDeclined: args.includeDeclined,
      minAttendees: args.minAttendees,
      excludeKeywords: args.excludeKeywords,
    };

    const result = await getTodayMeetings(params);

    return {
      type: 'text',
      text: JSON.stringify(result, null, 2),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      type: 'text',
      text: JSON.stringify(
        {
          error: true,
          message: errorMessage,
        },
        null,
        2
      ),
    };
  }
}
