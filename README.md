# Google Calendar MCP Server

A Model Context Protocol (MCP) server that provides intelligent access to Google Calendar data with advanced filtering capabilities for meetings and events.

## Features

- 📅 **Smart Meeting Detection**: Automatically filters for actual meetings (2+ participants)
- 🎯 **Intelligent Filtering**: Excludes declined events, all-day events, and non-meeting calendar items
- 🔐 **Secure OAuth 2.0**: Uses Google's OAuth 2.0 with PKCE for secure authentication
- ⏰ **Timezone Support**: Full timezone-aware event handling
- 🔄 **Auto Token Refresh**: Automatically refreshes expired access tokens
- 🎛️ **Configurable Filters**: Customizable keyword exclusion and attendee requirements

## Prerequisites

- Node.js 18 or higher
- A Google Cloud Console project with Calendar API enabled
- Google OAuth 2.0 credentials (Client ID and Client Secret)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ham0215/google-calendar-mcp.git
cd google-calendar-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and add your Google OAuth credentials:
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback

# Optional configuration
DEFAULT_TIMEZONE=Asia/Tokyo
MIN_ATTENDEES=2
EXCLUDE_KEYWORDS=vacation,holiday,pto,ooo
```

## Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Enable APIs and Services"
   - Search for "Google Calendar API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add `http://localhost:3000/oauth/callback` to Authorized redirect URIs
   - Save the Client ID and Client Secret

## Usage

### Building the Server

```bash
npm run build
```

### Running the Server

For development:
```bash
npm run dev
```

For production:
```bash
npm run start
```

### Authentication

On first run, the server will:
1. Display an authentication URL in the console
2. Open a local server on port 3000 to receive the OAuth callback
3. Save the tokens locally for future use

### MCP Integration

To use with an MCP client, configure it to connect to this server:

```json
{
  "mcpServers": {
    "google-calendar": {
      "command": "node",
      "args": ["path/to/google-calendar-mcp/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id",
        "GOOGLE_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

## Available Tools

### getTodayMeetings

Retrieves today's meetings with intelligent filtering.

**Parameters:**
- `timezone` (string, optional): Timezone for the query (default: "UTC")
- `includeDeclined` (boolean, optional): Include declined meetings (default: false)
- `minAttendees` (number, optional): Minimum number of attendees (default: 2)
- `excludeKeywords` (string[], optional): Keywords to exclude from titles/descriptions

**Response:**
```json
{
  "meetings": [
    {
      "id": "event-id",
      "title": "Team Standup",
      "startTime": "2024-01-20T10:00:00Z",
      "endTime": "2024-01-20T10:30:00Z",
      "duration": 30,
      "attendees": [
        {
          "email": "user@example.com",
          "name": "John Doe",
          "responseStatus": "accepted",
          "isOrganizer": true
        }
      ],
      "location": "Conference Room A",
      "meetingLink": "https://meet.google.com/abc-defg-hij",
      "description": "Daily team sync",
      "isAccepted": true,
      "isOrganizer": false
    }
  ],
  "timezone": "UTC",
  "date": "2024-01-20"
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Required |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Required |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URI | `http://localhost:3000/oauth/callback` |
| `DEFAULT_TIMEZONE` | Default timezone for queries | `UTC` |
| `DEFAULT_CALENDAR_ID` | Default calendar to query | `primary` |
| `MIN_ATTENDEES` | Minimum attendees for meetings | `2` |
| `EXCLUDE_KEYWORDS` | Comma-separated keywords to exclude | See defaults below |
| `REQUIRE_ACCEPTED` | Only show accepted meetings | `true` |
| `EXCLUDE_DECLINED` | Exclude declined meetings | `true` |
| `EXCLUDE_ALL_DAY` | Exclude all-day events | `true` |
| `TOKEN_DIR` | Directory for token storage | `~/.google-calendar-mcp` |

### Default Excluded Keywords

The following keywords are excluded by default (case-insensitive):
- out of office, ooo
- vacation, holiday, pto
- blocked, busy, hold
- tentative, focus time
- lunch, break

## Development

### Available Scripts

```bash
# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Run type checking
npm run typecheck

# Run linter
npm run lint

# Format code
npm run format

# Run all checks
npm run check

# Clean build directory
npm run clean
```

### Project Structure

```
google-calendar-mcp/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── auth/              # OAuth and token management
│   │   ├── oauth.ts       # OAuth flow implementation
│   │   └── token-manager.ts # Token storage and refresh
│   ├── calendar/          # Calendar API integration
│   │   ├── client.ts      # Google Calendar API client
│   │   └── filters.ts     # Event filtering logic
│   ├── config/            # Configuration management
│   │   └── settings.ts    # Environment configuration
│   ├── tools/             # MCP tool implementations
│   │   └── get-meetings.ts # getTodayMeetings tool
│   └── types/             # TypeScript type definitions
│       └── index.ts       # Shared type definitions
├── dist/                  # Compiled JavaScript output
├── tests/                 # Test files
├── .env.example          # Environment variables template
├── tsconfig.json         # TypeScript configuration
└── package.json          # Project dependencies
```

## Troubleshooting

### Authentication Issues

If you encounter authentication problems:
1. Delete the token file: `rm ~/.google-calendar-mcp/tokens.json`
2. Restart the server to re-authenticate
3. Ensure your OAuth client is properly configured in Google Cloud Console

### Token Expiration

The server automatically refreshes expired tokens. If refresh fails:
- Tokens older than 6 months require re-authentication
- Check that your Google Cloud project is still active

### API Limits

Google Calendar API has rate limits. The server implements:
- Automatic retry with exponential backoff
- Rate limit detection and waiting
- Proper error handling for quota exceeded

## Security

- OAuth tokens are stored locally in the user's home directory
- Uses PKCE (Proof Key for Code Exchange) for enhanced security
- Implements state validation to prevent CSRF attacks
- Never commits credentials to version control

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

For issues, questions, or suggestions, please open an issue on GitHub.