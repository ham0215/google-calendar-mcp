import { CalendarEvent } from './client.js';

export interface FilterConfig {
  minAttendees?: number;
  excludeKeywords?: string[];
  requireAccepted?: boolean;
  excludeDeclined?: boolean;
  excludeAllDayEvents?: boolean;
}

export class EventFilter {
  private config: FilterConfig;

  constructor(config: FilterConfig = {}) {
    this.config = {
      minAttendees: 2,
      excludeKeywords: [],
      requireAccepted: true,
      excludeDeclined: true,
      excludeAllDayEvents: false,
      ...config,
    };
  }

  /**
   * Check if the user has accepted or tentatively accepted the meeting
   */
  private hasUserAccepted(event: CalendarEvent): boolean {
    if (!this.config.requireAccepted) {
      return true;
    }

    // Check if the user is the organizer
    if (event.organizer?.self === true) {
      return true;
    }

    // Check the user's response status in attendees
    const userAttendee = event.attendees?.find(attendee => attendee.self === true);
    if (userAttendee) {
      return userAttendee.responseStatus === 'accepted' ||
             userAttendee.responseStatus === 'tentative';
    }

    // If we can't determine the status, include the event
    return true;
  }

  /**
   * Check if the event has the minimum required number of attendees
   */
  private hasMinimumAttendees(event: CalendarEvent): boolean {
    if (!this.config.minAttendees || this.config.minAttendees <= 1) {
      return true;
    }

    const attendeeCount = event.attendees?.length || 0;

    // Include the organizer in the count if they're not in the attendees list
    const organizerInAttendees = event.attendees?.some(
      attendee => attendee.email === event.organizer?.email
    );

    const totalParticipants = organizerInAttendees
      ? attendeeCount
      : attendeeCount + (event.organizer ? 1 : 0);

    return totalParticipants >= this.config.minAttendees;
  }

  /**
   * Check if the event contains any excluded keywords
   */
  private containsExcludedKeywords(event: CalendarEvent): boolean {
    if (!this.config.excludeKeywords || this.config.excludeKeywords.length === 0) {
      return false;
    }

    const textToCheck = [
      event.summary || '',
      event.description || '',
    ].join(' ').toLowerCase();

    return this.config.excludeKeywords.some(keyword =>
      textToCheck.includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if the event is an all-day event
   */
  private isAllDayEvent(event: CalendarEvent): boolean {
    // All-day events have a date field instead of dateTime
    return !!(event.start?.date && !event.start?.dateTime);
  }

  /**
   * Check if the event is declined
   */
  private isDeclined(event: CalendarEvent): boolean {
    if (!this.config.excludeDeclined) {
      return false;
    }

    // Check if the event is cancelled
    if (event.status === 'cancelled') {
      return true;
    }

    // Check if the user has declined
    const userAttendee = event.attendees?.find(attendee => attendee.self === true);
    return userAttendee?.responseStatus === 'declined';
  }

  /**
   * Apply all filters to a single event
   */
  filterEvent(event: CalendarEvent): boolean {
    // Exclude cancelled events
    if (event.status === 'cancelled') {
      return false;
    }

    // Exclude all-day events if configured
    if (this.config.excludeAllDayEvents && this.isAllDayEvent(event)) {
      return false;
    }

    // Exclude declined events
    if (this.isDeclined(event)) {
      return false;
    }

    // Check minimum attendees
    if (!this.hasMinimumAttendees(event)) {
      return false;
    }

    // Check user acceptance
    if (!this.hasUserAccepted(event)) {
      return false;
    }

    // Check excluded keywords
    if (this.containsExcludedKeywords(event)) {
      return false;
    }

    return true;
  }

  /**
   * Apply filters to an array of events
   */
  filterEvents(events: CalendarEvent[]): CalendarEvent[] {
    return events.filter(event => this.filterEvent(event));
  }

  /**
   * Get a summary of why an event was filtered out
   */
  getFilterReason(event: CalendarEvent): string[] {
    const reasons: string[] = [];

    if (event.status === 'cancelled') {
      reasons.push('Event is cancelled');
    }

    if (this.config.excludeAllDayEvents && this.isAllDayEvent(event)) {
      reasons.push('All-day event');
    }

    if (this.isDeclined(event)) {
      reasons.push('User declined the event');
    }

    if (!this.hasMinimumAttendees(event)) {
      reasons.push(`Less than ${this.config.minAttendees} attendees`);
    }

    if (!this.hasUserAccepted(event)) {
      reasons.push('User has not accepted the event');
    }

    if (this.containsExcludedKeywords(event)) {
      reasons.push('Contains excluded keywords');
    }

    return reasons;
  }

  /**
   * Update filter configuration
   */
  updateConfig(config: Partial<FilterConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Get current filter configuration
   */
  getConfig(): FilterConfig {
    return { ...this.config };
  }
}

/**
 * Create a meeting-specific filter with common settings
 */
export function createMeetingFilter(customConfig?: Partial<FilterConfig>): EventFilter {
  const defaultMeetingConfig: FilterConfig = {
    minAttendees: 2,
    excludeKeywords: [
      'out of office',
      'ooo',
      'vacation',
      'holiday',
      'pto',
      'blocked',
      'busy',
      'hold',
      'tentative',
      'focus time',
      'lunch',
      'break',
    ],
    requireAccepted: true,
    excludeDeclined: true,
    excludeAllDayEvents: true,
  };

  return new EventFilter({
    ...defaultMeetingConfig,
    ...customConfig,
  });
}

/**
 * Filter and sort events for meeting relevance
 */
export function filterAndSortMeetings(
  events: CalendarEvent[],
  filterConfig?: Partial<FilterConfig>
): CalendarEvent[] {
  const filter = createMeetingFilter(filterConfig);
  const filteredEvents = filter.filterEvents(events);

  // Sort by start time
  return filteredEvents.sort((a, b) => {
    const aTime = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
    const bTime = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
    return aTime - bTime;
  });
}