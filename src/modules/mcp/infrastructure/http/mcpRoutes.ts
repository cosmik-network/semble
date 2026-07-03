import { Router, Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { IApiKeyService } from '../../../user/application/services/IApiKeyService';
import { SembleApiClient } from '../sembleApiClient';
import { buildMcpServer } from '../mcpServer';

/**
 * Mounts the MCP server at `/mcp` (POST / GET / DELETE), per the Streamable HTTP
 * transport. The server is stateless: a fresh `McpServer` + transport is built
 * per request, authenticated with the user's Semble API key (Bearer `sk_...`).
 *
 * @param baseUrl         API origin (e.g. https://api.semble.so) — used both to
 *                        proxy `/xrpc` calls and to fill resource URIs.
 * @param allowedOrigins  Origins permitted by the `Origin` header (DNS-rebinding
 *                        protection per the MCP spec). Requests with a present
 *                        but unlisted Origin are rejected with 403.
 */
export function createMcpRoutes(
  router: Router,
  apiKeyService: IApiKeyService,
  baseUrl: string,
  allowedOrigins: string[],
): Router {
  const allowed = new Set(allowedOrigins);

  const jsonRpcError = (
    res: Response,
    status: number,
    code: number,
    message: string,
  ) => {
    res.status(status).json({
      jsonrpc: '2.0',
      id: null,
      error: { code, message },
    });
  };

  // Validate Origin (DNS-rebinding protection) for every method.
  router.use((req: Request, res: Response, next) => {
    const origin = req.headers.origin;
    if (origin && !allowed.has(origin)) {
      jsonRpcError(res, 403, -32000, `Origin ${origin} not allowed`);
      return;
    }
    next();
  });

  // Extract the Semble API key from either the `x-api-key` header or an
  // `Authorization: Bearer sk_...` token — the same two forms the REST API's
  // AuthMiddleware accepts, so MCP clients auth identically to REST clients.
  const extractApiKey = (req: Request): string | undefined => {
    const xApiKey = req.headers['x-api-key'];
    if (typeof xApiKey === 'string' && xApiKey.length > 0) {
      return xApiKey;
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return undefined;
  };

  const handle = async (req: Request, res: Response) => {
    const apiKey = extractApiKey(req);
    if (!apiKey) {
      jsonRpcError(
        res,
        401,
        -32001,
        'Authentication required. Pass your Semble API key via the X-API-Key header or as a Bearer token in the Authorization header.',
      );
      return;
    }

    const verify = await apiKeyService.verify(apiKey);
    if (verify.isErr() || !verify.value) {
      jsonRpcError(res, 401, -32001, 'Invalid Semble API key.');
      return;
    }

    const client = new SembleApiClient(baseUrl, apiKey);
    const server = buildMcpServer(client, baseUrl);

    // Stateless transport: no session id, one server per request.
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error: any) {
      if (!res.headersSent) {
        jsonRpcError(
          res,
          500,
          -32603,
          error?.message ?? 'Internal MCP server error',
        );
      }
    }
  };

  router.post('/', handle);

  // GET/DELETE are part of the transport but unused in stateless mode; the SDK
  // responds with the appropriate "method not allowed" JSON-RPC error.
  router.get('/', handle);
  router.delete('/', handle);

  return router;
}
