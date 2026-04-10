import { Request, Response, NextFunction } from 'express';

export class StatsApiKeyMiddleware {
  constructor(private statsApiKey: string | undefined) {}

  ensureAuthenticated() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Check if STATS_API_KEY is configured
      if (!this.statsApiKey) {
        return res.status(503).json({
          error: 'Stats API is not configured',
          message: 'STATS_API_KEY environment variable is not set',
        });
      }

      // Extract bearer token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message:
            'Missing or invalid Authorization header. Expected format: Bearer <token>',
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Validate the API key
      if (token !== this.statsApiKey) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid API key',
        });
      }

      // Authentication successful, proceed to the next middleware/handler
      next();
    };
  }
}
