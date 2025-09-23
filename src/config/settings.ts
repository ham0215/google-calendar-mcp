import path from 'path';
import { homedir } from 'os';

export interface AppConfig {
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
  };
  storage: {
    tokenPath: string;
  };
  calendar: {
    defaultTimezone: string;
    defaultCalendarId: string;
  };
  filter: {
    minAttendees: number;
    excludeKeywords: string[];
    requireAccepted: boolean;
    excludeDeclined: boolean;
    excludeAllDayEvents: boolean;
  };
}

/**
 * Get configuration from environment variables with defaults
 */
export function getConfig(): AppConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing required environment variables. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
    );
  }

  const tokenDir = process.env.TOKEN_DIR || path.join(homedir(), '.google-calendar-mcp');
  const tokenPath = path.join(tokenDir, 'tokens.json');

  return {
    google: {
      clientId,
      clientSecret,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth/callback',
      scopes: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events.readonly',
      ],
    },
    storage: {
      tokenPath,
    },
    calendar: {
      defaultTimezone: process.env.DEFAULT_TIMEZONE || 'UTC',
      defaultCalendarId: process.env.DEFAULT_CALENDAR_ID || 'primary',
    },
    filter: {
      minAttendees: parseInt(process.env.MIN_ATTENDEES || '2', 10),
      excludeKeywords: process.env.EXCLUDE_KEYWORDS
        ? process.env.EXCLUDE_KEYWORDS.split(',').map((k) => k.trim())
        : [
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
      requireAccepted: process.env.REQUIRE_ACCEPTED !== 'false',
      excludeDeclined: process.env.EXCLUDE_DECLINED !== 'false',
      excludeAllDayEvents: process.env.EXCLUDE_ALL_DAY !== 'false',
    },
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: AppConfig): void {
  const errors: string[] = [];

  if (!config.google.clientId) {
    errors.push('Google Client ID is required');
  }

  if (!config.google.clientSecret) {
    errors.push('Google Client Secret is required');
  }

  if (!config.google.redirectUri) {
    errors.push('Google Redirect URI is required');
  }

  if (config.filter.minAttendees < 1) {
    errors.push('Minimum attendees must be at least 1');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Get and validate configuration
 */
export function getValidatedConfig(): AppConfig {
  const config = getConfig();
  validateConfig(config);
  return config;
}
