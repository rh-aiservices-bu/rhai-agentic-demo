#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  Request,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Remarkable } from 'remarkable';
import hljs from 'highlight.js';
import tmp from 'tmp';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

tmp.setGracefulCleanup();

class MarkdownPdfServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'markdown2pdf',
        version: '2.0.2',
      },
      {
        capabilities: {
          tools: {
            create_pdf_from_markdown: true
          },
        },
      }
    );

    this.setupToolHandlers();
    
    this.server.onerror = (error: Error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'create_pdf_from_markdown',
          description: 'Convert markdown content to PDF. Note: Cannot handle LaTeX math equations. Supports basic markdown elements like headers, lists, tables, code blocks, blockquotes, and images (both local and external URLs).',
          inputSchema: {
            type: 'object',
            properties: {
              markdown: {
                type: 'string',
                description: 'Markdown content to convert to PDF',
              },
              outputFilename: {
                type: 'string',
                description: 'The filename of the PDF file to be saved (e.g. "output.pdf"). The environmental variable M2P_OUTPUT_DIR sets the output path directory. If not provided, it will default to user\'s HOME directory.',
              },
              paperFormat: {
                type: 'string',
                description: 'Paper format for the PDF (default: letter)',
                enum: ['letter', 'a4', 'a3', 'a5', 'legal', 'tabloid'],
                default: 'letter'
              },
              paperOrientation: {
                type: 'string',
                description: 'Paper orientation for the PDF (default: portrait)',
                enum: ['portrait', 'landscape'],
                default: 'portrait'
              },
              paperBorder: {
                type: 'string',
                description: 'Border margin for the PDF (default: 2cm). Use CSS units (cm, mm, in, px)',
                pattern: '^[0-9]+(\.[0-9]+)?(cm|mm|in|px)$',
                default: '20mm'
              },
              watermark: {
                type: 'string',
                description: 'Optional watermark text (max 15 characters, uppercase), e.g. "DRAFT", "PRELIMINARY", "CONFIDENTIAL", "FOR REVIEW", etc',
                maxLength: 15,
                pattern: '^[A-Z0-9\\s-]+$'
              }
            },
            required: ['markdown']
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'create_pdf_from_markdown') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      // Get output directory from environment variable or use default
      const outputDir = process.env.M2P_OUTPUT_DIR 
        ? path.resolve(process.env.M2P_OUTPUT_DIR)
        : path.resolve(process.env.HOME || process.cwd());

      const { 
        markdown, 
        outputFilename = 'output.pdf',
        paperFormat = 'letter',
        paperOrientation = 'portrait',
        paperBorder = '2cm',
        watermark = ''
      } = request.params.arguments as {
        markdown: string;
        outputFilename?: string;
        paperFormat?: string;
        paperOrientation?: string;
        paperBorder?: string;
        watermark?: string;
      };

      // Ensure output filename has .pdf extension
      const filename = outputFilename.toLowerCase().endsWith('.pdf') 
        ? outputFilename 
        : `${outputFilename}.pdf`;

      // Combine output directory with filename
      const outputPath = path.join(outputDir, filename);

      try {
        await this.convertToPdf(
          markdown,
          outputPath,
          paperFormat,
          paperOrientation,
          paperBorder,
          watermark
        );
        
        // Ensure absolute path is returned
        const absolutePath = path.resolve(outputPath);
        
        // Get the PDF route URL from environment variable
        const pdfRouteUrl = process.env.PDF_ROUTE_URL;
        const pdfUrl = pdfRouteUrl ? `${pdfRouteUrl}/files/${filename}` : null;
        
        // Create response message with both local path and URL
        let responseText = `Successfully created PDF at: ${absolutePath}`;
        if (pdfUrl) {
          responseText += `\n\nPDF is available at: ${pdfUrl}`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create PDF: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private getIncrementalPath(basePath: string): string {
    const dir = path.dirname(basePath);
    const ext = path.extname(basePath);
    const name = path.basename(basePath, ext);
    let counter = 1;
    let newPath = basePath;

    while (fs.existsSync(newPath)) {
      newPath = path.join(dir, `${name}-${counter}${ext}`);
      counter++;
    }

    return newPath;
  }

  private async convertToPdf(
    markdown: string,
    outputPath: string,
    paperFormat: string = 'letter',
    paperOrientation: string = 'portrait',
    paperBorder: string = '2cm',
    watermark: string = ''
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Get incremental path if file exists
      outputPath = this.getIncrementalPath(outputPath);

      // Ensure all paths are absolute
      outputPath = path.resolve(outputPath);
      
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      fs.mkdirSync(outputDir, { recursive: true });
      
      const opts = {
        runningsPath: path.resolve(__dirname, 'runnings.js'),
        cssPath: path.resolve(__dirname, 'css', 'pdf.css'),
        paperFormat,
        paperOrientation,
        paperBorder,
        renderDelay: 5000, // Increased render delay for complex documents
        loadTimeout: 60000, // Increased timeout for larger documents with external resources
        remarkable: { breaks: true, preset: 'default' as const },
      };

      // Convert markdown to HTML directly
      const mdParser = new Remarkable(opts.remarkable.preset, {
        highlight: function(str: string, language: string) {
          if (language && hljs.getLanguage(language)) {
            try {
              return hljs.highlight(str, { language }).value;
            } catch (err) {}
          }
          try {
            return hljs.highlightAuto(str).value;
          } catch (err) {}
          return '';
        },
        ...opts.remarkable,
      });

      // Wrap the markdown HTML with the watermark and sizing script
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {
      margin: 20px;
      size: ${paperFormat} ${paperOrientation};
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }
    .page {
      position: relative;
      width: ${paperFormat === 'letter' ? '8.5in' : '210mm'};
      height: ${paperFormat === 'letter' ? '11in' : '297mm'};
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .content {
      position: relative;
      z-index: 1;
    }
    .watermark {
      position: absolute;
      left: 0;
      top: 0;
      right: 0;
      bottom: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: calc(${paperFormat === 'letter' ? '8.5in' : '210mm'} * 0.14);
      color: rgba(0, 0, 0, 0.15);
      font-family: Arial, sans-serif;
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
      transform: rotate(-45deg);
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="content">
      ${mdParser.render(markdown)}
    </div>
    ${watermark ? `<div class="watermark">${watermark}</div>` : ''}
  </div>
</body>
</html>`;

      // Create temporary HTML file
      tmp.file({ postfix: '.html' }, async (err, tmpHtmlPath, tmpHtmlFd) => {
        if (err) return reject(err);
        fs.closeSync(tmpHtmlFd);

        try {
          // Write HTML content to temporary file
          await fs.promises.writeFile(tmpHtmlPath, html);

          // Import and use the Puppeteer renderer
          const renderPDF = (await import('./puppeteer/render.js')).default;
          await renderPDF({
            htmlPath: tmpHtmlPath,
            pdfPath: outputPath,
            runningsPath: opts.runningsPath,
            cssPath: opts.cssPath,
            highlightCssPath: '',
            paperFormat: opts.paperFormat,
            paperOrientation: opts.paperOrientation,
            paperBorder: opts.paperBorder,
            renderDelay: opts.renderDelay,
            loadTimeout: opts.loadTimeout
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Markdown to PDF MCP server running on stdio');
  }
}

const server = new MarkdownPdfServer();
server.run().catch(console.error);