#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";

// Tool Definitions
const listChannelsTool: Tool = {
  name: "slack_list_channels",
  description: "List public Slack channels",
  inputSchema: {
    type: "object",
    properties: {
      limit: { type: "number", default: 100 },
      cursor: { type: "string" }
    }
  }
};

const postMessageTool: Tool = {
  name: "slack_post_message",
  description: "Post a message to a Slack channel",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: { type: "string" },
      text: { type: "string" }
    },
    required: ["channel_id", "text"]
  }
};

// Slack Client
class SlackClient {
  private headers: { Authorization: string; "Content-Type": string };

  constructor(token: string) {
    this.headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  }

  async listChannels(limit = 100, cursor?: string) {
    const params = new URLSearchParams({
      types: "public_channel",
      exclude_archived: "true",
      limit: limit.toString()
    });
    if (cursor) params.append("cursor", cursor);

    const res = await fetch(`https://slack.com/api/conversations.list?${params}`, {
      headers: this.headers
    });
    return res.json();
  }

  async postMessage(channel_id: string, text: string) {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ channel: channel_id, text })
    });
    return res.json();
  }
}

async function main() {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.error("Missing SLACK_BOT_TOKEN env var.");
    process.exit(1);
  }

  const slack = new SlackClient(token);

  const server = new Server(
    { name: "Slack MCP Server", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(CallToolRequestSchema, async (req: CallToolRequest) => {
    const { name, arguments: args } = req.params;

    try {
      switch (name) {
        case "slack_list_channels": {
          const { limit, cursor } = args as { limit?: number; cursor?: string };
          const result = await slack.listChannels(limit, cursor);
          return {
            content: [{ type: "text", text: JSON.stringify(result) }]
          };
        }

        case "slack_post_message": {
          const { channel_id, text } = args as { channel_id: string; text: string };
          if (!channel_id || !text) {
            throw new Error("Missing required arguments: channel_id and text");
          }
          const result = await slack.postMessage(channel_id, text);
          return {
            content: [{ type: "text", text: JSON.stringify(result) }]
          };
        }

        default:
          throw new Error(`Unsupported tool: ${name}`);
      }
    } catch (err) {
      console.error("Tool error:", err);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: err instanceof Error ? err.message : String(err)
            })
          }
        ]
      };
    }
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [listChannelsTool, postMessageTool]
  }));

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Slack MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
