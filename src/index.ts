import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  getTodayMeetingsTool,
  executeTodayMeetingsTool,
  getMeetingsTool,
  executeMeetingsTool,
} from './tools/get-meetings.js';
import { reAuthenticateTool, executeReAuthenticateTool } from './tools/re-authenticate.js';
import { config } from 'dotenv';

config();

class GoogleCalendarMCPServer {
  private server: Server;
  private tools: Map<string, Tool>;

  constructor() {
    this.server = new Server(
      {
        name: 'google-calendar-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.tools = new Map();
    this.registerTools();
    this.setupHandlers();
  }

  private registerTools(): void {
    const todayMeetingsTool = getTodayMeetingsTool();
    this.tools.set(todayMeetingsTool.name, todayMeetingsTool);

    const meetingsTool = getMeetingsTool();
    this.tools.set(meetingsTool.name, meetingsTool);

    const reAuthTool = reAuthenticateTool();
    this.tools.set(reAuthTool.name, reAuthTool);
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(this.tools.values()),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!this.tools.has(name)) {
        throw new Error(`Tool ${name} not found`);
      }

      if (name === 'getTodayMeetings') {
        const result = await executeTodayMeetingsTool((args as Record<string, unknown>) || {});
        return {
          content: [result],
        };
      }

      if (name === 'getMeetings') {
        const result = await executeMeetingsTool(
          (args as Record<string, unknown> & { date: string }) || { date: '' }
        );
        return {
          content: [result],
        };
      }

      if (name === 'reAuthenticate') {
        const result = await executeReAuthenticateTool();
        return {
          content: [result],
        };
      }

      throw new Error(`Tool ${name} not implemented`);
    });
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
