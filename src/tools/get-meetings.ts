import { ToolSchema } from '@modelcontextprotocol/sdk/types.js';

export function getTodayMeetingsTool(): ToolSchema {
  return {
    name: 'getTodayMeetings',
    description: 'Get today\'s meetings from Google Calendar with filtering for actual meetings (2+ participants, accepted/tentative)',
    inputSchema: {
      type: 'object',
      properties: {
        includeDeclined: {
          type: 'boolean',
          description: 'Whether to include declined meetings',
          default: false,
        },
        timezone: {
          type: 'string',
          description: 'Timezone for the query (e.g., "America/New_York", "Asia/Tokyo")',
          default: 'UTC',
        },
      },
      required: [],
    },
  };
}