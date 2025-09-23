import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getTodayMeetingsTool } from './tools/get-meetings.js';
import { config } from 'dotenv';

config();

class GoogleCalendarMCPServer {
  private server: Server;
  private tools: Map<string, ToolSchema>;

  constructor() {
    this.server = new Server({
      name: 'google-calendar-mcp',
      version: '0.1.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.tools = new Map();
    this.registerTools();
    this.setupHandlers();
  }

  private registerTools(): void {
    const todayMeetingsTool = getTodayMeetingsTool();
    this.tools.set(todayMeetingsTool.name, todayMeetingsTool);
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(
      ListToolsRequestSchema,
      async () => ({
        tools: Array.from(this.tools.values()),
      })
    );

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        const { name, arguments: args } = request.params;

        if (!this.tools.has(name)) {
          throw new Error(`Tool ${name} not found`);
        }

        if (name === 'getTodayMeetings') {
          const { includeDeclined = false, timezone = 'UTC' } = args as any;

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  message: 'Tool implementation in progress',
                  params: { includeDeclined, timezone },
                }, null, 2),
              },
            ],
          };
        }

        throw new Error(`Tool ${name} not implemented`);
      }
    );
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Google Calendar MCP Server running on stdio');
  }
}

async function main() {
  try {
    const server = new GoogleCalendarMCPServer();
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch(console.error);