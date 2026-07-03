import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SembleApiClient } from './sembleApiClient';
import { tools } from './tools';
import { resources, resourceTemplates } from './resources';

const SERVER_INFO = { name: 'semble', version: '1.0.0' } as const;

const INSTRUCTIONS =
  'This server provides tools for searching, saving, and organizing cards and ' +
  'collections in Semble. For best-practice workflows, read the skill at ' +
  'skill://semble/SKILL.md.';

/**
 * Build a fresh `McpServer` for a single request, bound to a `SembleApiClient`
 * authenticated as the calling user. We create one server per request so it can
 * run statelessly (no session affinity) — see {@link createMcpRouter}.
 */
export function buildMcpServer(
  client: SembleApiClient,
  baseUrl: string,
): McpServer {
  const server = new McpServer(SERVER_INFO, {
    capabilities: { tools: {}, resources: {} },
    instructions: INSTRUCTIONS,
  });

  for (const tool of tools) {
    // The shape is cast loosely to avoid the SDK's deep generic inference
    // (TS2589); runtime behaviour is unaffected.
    const inputShape = (tool.inputSchema as z.ZodObject<z.ZodRawShape>)
      .shape as z.ZodRawShape;
    (server.registerTool as any)(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: inputShape,
      },
      (async (args: Record<string, unknown>) => {
        try {
          const text = await tool.handler(args, client);
          return { content: [{ type: 'text' as const, text }] };
        } catch (error: any) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error?.message ?? 'tool call failed'}`,
              },
            ],
          };
        }
      }) as any,
    );
  }

  for (const resource of resources) {
    server.registerResource(
      resource.name,
      resource.uri,
      {
        title: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: resource.mimeType,
            text: resource.read(baseUrl),
          },
        ],
      }),
    );
  }

  for (const template of resourceTemplates) {
    server.registerResource(
      template.name,
      new ResourceTemplate(template.uriTemplate, { list: undefined }),
      {
        title: template.name,
        description: template.description,
        mimeType: template.mimeType,
      },
      async (uri, variables) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: template.mimeType,
            text: await template.read(
              variables as Record<string, string | string[]>,
              client,
            ),
          },
        ],
      }),
    );
  }

  return server;
}
