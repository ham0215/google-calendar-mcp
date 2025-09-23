/**
 * Type definitions for Google Calendar MCP Server
 */

// Google Calendar Types
export interface CalendarEvent {
  id?: string | null;
  summary?: string | null;
  description?: string | null;
  start?: EventDateTime | null;
  end?: EventDateTime | null;
  attendees?: Attendee[] | null;
  organizer?: Organizer | null;
  location?: string | null;
  hangoutLink?: string | null;
  conferenceData?: ConferenceData | null;
  status?: string | null;
}

export interface EventDateTime {
  dateTime?: string | null;
  date?: string | null;
  timeZone?: string | null;
}

export interface Attendee {
  email?: string | null;
  displayName?: string | null;
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction' | null;
  self?: boolean | null;
  organizer?: boolean | null;
  optional?: boolean | null;
  resource?: boolean | null;
}

export interface Organizer {
  email?: string | null;
  displayName?: string | null;
  self?: boolean | null;
}

export interface ConferenceData {
  entryPoints?: EntryPoint[] | null;
  conferenceSolution?: ConferenceSolution | null;
  conferenceId?: string | null;
}

export interface EntryPoint {
  entryPointType?: 'video' | 'phone' | 'sip' | 'more' | null;
  uri?: string | null;
  label?: string | null;
  pin?: string | null;
  regionCode?: string | null;
}

export interface ConferenceSolution {
  key?: {
    type?: string | null;
  } | null;
  name?: string | null;
  iconUri?: string | null;
}

// MCP Tool Types
export interface ToolResponse {
  content: ToolContent[];
}

export interface ToolContent {
  type: 'text' | 'image';
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface GetTodayMeetingsInput {
  timezone?: string;
  includeDeclined?: boolean;
  minAttendees?: number;
  excludeKeywords?: string[];
}

export interface GetTodayMeetingsOutput {
  meetings: MeetingInfo[];
  timezone: string;
  date: string;
}

export interface MeetingInfo {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  attendees: MeetingAttendee[];
  location?: string;
  meetingLink?: string;
  description?: string;
  isAccepted: boolean;
  isOrganizer: boolean;
}

export interface MeetingAttendee {
  email: string;
  name?: string;
  responseStatus?: string;
  isOrganizer?: boolean;
}

// OAuth and Token Types
export interface TokenData {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

// Configuration Types
export interface AppConfig {
  google: GoogleConfig;
  storage: StorageConfig;
  calendar: CalendarConfig;
  filter: FilterConfig;
}

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface StorageConfig {
  tokenPath: string;
}

export interface CalendarConfig {
  defaultTimezone: string;
  defaultCalendarId: string;
}

export interface FilterConfig {
  minAttendees: number;
  excludeKeywords: string[];
  requireAccepted: boolean;
  excludeDeclined: boolean;
  excludeAllDayEvents: boolean;
}

// Error Types
export class CalendarAPIError extends Error {
  constructor(
    message: string,
    public code?: number,
    public details?: object
  ) {
    super(message);
    this.name = 'CalendarAPIError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type AsyncFunction<T = void, Args extends ReadonlyArray<unknown> = []> = (
  ...args: Args
) => Promise<T>;

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;
