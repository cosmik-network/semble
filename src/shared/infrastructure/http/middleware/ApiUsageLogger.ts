import { RequestHandler } from 'express';
import { IApiRequestLogRepository } from '../../../../modules/analytics/domain/IApiRequestLogRepository';
import { AuthenticatedRequest } from './AuthMiddleware';

const CLIENT_HEADER = 'x-semble-client';
const CLIENT_HEADER_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;

/**
 * Records one row per authenticated non-webapp API call (API key or bearer JWT;
 * cookie-authenticated webapp traffic is skipped). The client self-identifies
 * via the untrusted X-Semble-Client header; absent that, the source is inferred
 * from the auth method: API keys are generic 'api' consumers, bearer JWTs are
 * the browser extension (the webapp authenticates via cookies).
 */
export function createApiUsageLogger(
  repository: IApiRequestLogRepository,
): RequestHandler {
  return (req, res, next) => {
    res.on('finish', () => {
      const { did, authMethod } = req as AuthenticatedRequest;
      if (!did || !authMethod || authMethod === 'cookie') return;

      const rawClient = req.headers[CLIENT_HEADER];
      const client =
        typeof rawClient === 'string' &&
        CLIENT_HEADER_PATTERN.test(rawClient.toLowerCase())
          ? rawClient.toLowerCase()
          : undefined;
      const source = client ?? (authMethod === 'apiKey' ? 'api' : 'extension');

      // Route pattern (e.g. /xrpc/cards/:id) so calls aggregate per endpoint
      // and query strings / path params stay out of the log.
      const endpoint = req.baseUrl + (req.route?.path ?? req.path);

      // Fire-and-forget; analytics must never affect the request.
      void repository
        .log({
          userDid: did,
          method: req.method,
          endpoint,
          source,
          authMethod,
          status: res.statusCode,
        })
        .catch(() => {});
    });
    next();
  };
}
