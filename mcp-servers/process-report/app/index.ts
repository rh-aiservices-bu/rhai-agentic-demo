#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Define the tool
const uploadTool: Tool = {
  name: "upload_report_pdf",
  description: "Uploads a PDF to the reporting tool repository and returns a URL",
  inputSchema: {
    type: "object",
    properties: {
      filename: {
        type: "string",
        description: "The name of the PDF file being uploaded"
      }
    },
    required: ["filename"]
  }
};

async function main() {
  const baseUrl = process.env.REPORT_REPO_URL || "http://localhost:8080/reports";

  const server = new Server(
    {
      name: "Report Upload MCP Server",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(CallToolRequestSchema, async (req: CallToolRequest) => {
    const { name, arguments: args } = req.params;

    if (name === "upload_report_pdf") {
      const { filename } = args as { filename: string };
      const reportUrl = `${baseUrl}/${encodeURIComponent(filename)}`;

      return {
        content: [
          {
            type: "text",
            text: `✅ Uploaded "${filename}" to the reporting tool.\n📎 URL: ${reportUrl}`,
          },
        ],
      };
    }

    throw new Error(`Unsupported tool: ${name}`);
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [uploadTool],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Report Upload MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
