import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { ITokenService } from '../../../../modules/user/application/services/ITokenService';
import { CookieService } from '../services/CookieService';

export interface AuthenticatedRequest extends Request {
  did?: string;
}

export class AuthMiddleware {
  constructor(
    private tokenService: ITokenService,
    private cookieService: CookieService,
  ) {}

  /**
   * Extract access token from request - checks both cookies and Authorization header
   * Priority: Cookie > Bearer token (for backward compatibility)
   */
  private extractAccessToken(req: AuthenticatedRequest): string | undefined {
    // First, try to get token from cookie
    const cookieToken = this.cookieService.getAccessToken(req);
    if (cookieToken) {
      return cookieToken;
    }

    // Fallback to Authorization header for backward compatibility
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    return undefined;
  }

  /**
   * Require authentication - accepts both cookie-based and Bearer token auth
   * This is the unified method that supports both authentication methods
   */
  public ensureAuthenticated() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction,
    ): Promise<void> => {
      try {
        const token = this.extractAccessToken(req);

        if (!token) {
          res.status(401).json({ message: 'No access token provided' });
          return;
        }

        // Validate token
        const didResult = await this.tokenService.validateToken(token);

        if (didResult.isErr() || !didResult.value) {
          res.status(403).json({ message: 'Invalid or expired token' });
          return;
        }

        // Attach user DID to request for use in controllers
        req.did = didResult.value;

        // Set user context in Sentry for error tracking
        Sentry.setUser({ id: didResult.value });

        // Continue to the next middleware or controller
        next();
      } catch (error) {
        res.status(500).json({ message: 'Authentication error' });
      }
    };
  }

  /**
   * Optional authentication - accepts both cookie-based and Bearer token auth
   * Continues even if no token is provided
   */
  public optionalAuth() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction,
    ) => {
      try {
        const token = this.extractAccessToken(req);

        if (!token) {
          // No token, but that's okay - continue without authentication
          return next();
        }

        // Validate token
        const didResult = await this.tokenService.validateToken(token);

        if (didResult.isOk() && didResult.value) {
          // Attach user DID to request for use in controllers
          req.did = didResult.value;

          // Set user context in Sentry for error tracking
          Sentry.setUser({ id: didResult.value });
        }

        // Continue to the controller regardless of token validity
        next();
      } catch (error) {
        // Continue without authentication in case of error
        next();
      }
    };
  }

  /**
   * Require Bearer token authentication only (legacy support)
   * Use this when you specifically need Bearer token auth
   */
  public requireBearerAuth() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction,
    ): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({ message: 'No Bearer token provided' });
          return;
        }

        const token = authHeader.substring(7);

        // Validate token
        const didResult = await this.tokenService.validateToken(token);

        if (didResult.isErr() || !didResult.value) {
          res.status(403).json({ message: 'Invalid or expired token' });
          return;
        }

        req.did = didResult.value;

        // Set user context in Sentry for error tracking
        Sentry.setUser({ id: didResult.value });

        next();
      } catch (error) {
        res.status(500).json({ message: 'Authentication error' });
      }
    };
  }

  /**
   * Require cookie-based authentication only
   * Use this when you specifically need cookie auth (e.g., CSRF protection)
   */
  public requireCookieAuth() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction,
    ): Promise<void> => {
      try {
        const token = this.cookieService.getAccessToken(req);

        if (!token) {
          res
            .status(401)
            .json({ message: 'No authentication cookie provided' });
          return;
        }

        // Validate token
        const didResult = await this.tokenService.validateToken(token);

        if (didResult.isErr() || !didResult.value) {
          res.status(403).json({ message: 'Invalid or expired token' });
          return;
        }

        req.did = didResult.value;

        // Set user context in Sentry for error tracking
        Sentry.setUser({ id: didResult.value });

        next();
      } catch (error) {
        res.status(500).json({ message: 'Authentication error' });
      }
    };
  }
}
