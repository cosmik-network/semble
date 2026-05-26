import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { ITokenService } from '../../../../modules/user/application/services/ITokenService';
import { IApiKeyService } from '../../../../modules/user/application/services/IApiKeyService';
import { IApiKeyRepository } from '../../../../modules/user/domain/repositories/IApiKeyRepository';
import { CookieService } from '../services/CookieService';

export interface AuthenticatedRequest extends Request {
  did?: string;
}

const API_KEY_PREFIX = 'sk_';

export class AuthMiddleware {
  constructor(
    private tokenService: ITokenService,
    private cookieService: CookieService,
    private apiKeyService: IApiKeyService,
    private apiKeyRepository: IApiKeyRepository,
  ) {}

  /**
   * Extract bearer token from Authorization header.
   */
  private extractBearer(req: AuthenticatedRequest): string | undefined {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return undefined;
  }

  /**
   * Resolve the request to a user DID via cookie, JWT bearer, or API key bearer.
   * API key tokens are recognised by their `sk_` prefix. On success, the key's
   * lastUsedAt is updated asynchronously.
   */
  private async resolveDid(req: AuthenticatedRequest): Promise<string | null> {
    const cookieToken = this.cookieService.getAccessToken(req);
    if (cookieToken) {
      const didResult = await this.tokenService.validateToken(cookieToken);
      if (didResult.isOk() && didResult.value) return didResult.value;
    }

    const bearer = this.extractBearer(req);
    if (!bearer) return null;

    if (bearer.startsWith(API_KEY_PREFIX)) {
      const verifyResult = await this.apiKeyService.verify(bearer);
      if (verifyResult.isErr() || !verifyResult.value) return null;
      const record = verifyResult.value;
      // Fire-and-forget; failure to touch lastUsedAt should not block the request.
      void this.apiKeyRepository.touchLastUsed(record.id, new Date());
      return record.userDid;
    }

    const didResult = await this.tokenService.validateToken(bearer);
    if (didResult.isOk() && didResult.value) return didResult.value;
    return null;
  }

  /**
   * Require authentication. Accepts cookie session, JWT bearer, or API key bearer.
   */
  public ensureAuthenticated() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction,
    ): Promise<void> => {
      try {
        const cookieToken = this.cookieService.getAccessToken(req);
        const bearer = this.extractBearer(req);
        if (!cookieToken && !bearer) {
          res.status(401).json({ message: 'No access token provided' });
          return;
        }

        const did = await this.resolveDid(req);
        if (!did) {
          res.status(403).json({ message: 'Invalid or expired token' });
          return;
        }

        req.did = did;
        Sentry.setUser({ id: did });
        next();
      } catch (error) {
        res.status(500).json({ message: 'Authentication error' });
      }
    };
  }

  /**
   * Optional authentication. Continues even without credentials; attaches did when present.
   */
  public optionalAuth() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction,
    ) => {
      try {
        const cookieToken = this.cookieService.getAccessToken(req);
        const bearer = this.extractBearer(req);
        if (!cookieToken && !bearer) return next();

        const did = await this.resolveDid(req);
        if (did) {
          req.did = did;
          Sentry.setUser({ id: did });
        }
        next();
      } catch (error) {
        next();
      }
    };
  }

  /**
   * Require Bearer token authentication only (legacy support). Accepts both
   * JWT and API key bearer tokens.
   */
  public requireBearerAuth() {
    return async (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction,
    ): Promise<void> => {
      try {
        const bearer = this.extractBearer(req);
        if (!bearer) {
          res.status(401).json({ message: 'No Bearer token provided' });
          return;
        }

        let did: string | null = null;
        if (bearer.startsWith(API_KEY_PREFIX)) {
          const verifyResult = await this.apiKeyService.verify(bearer);
          if (verifyResult.isOk() && verifyResult.value) {
            did = verifyResult.value.userDid;
            void this.apiKeyRepository.touchLastUsed(
              verifyResult.value.id,
              new Date(),
            );
          }
        } else {
          const didResult = await this.tokenService.validateToken(bearer);
          if (didResult.isOk() && didResult.value) did = didResult.value;
        }

        if (!did) {
          res.status(403).json({ message: 'Invalid or expired token' });
          return;
        }

        req.did = did;
        Sentry.setUser({ id: did });
        next();
      } catch (error) {
        res.status(500).json({ message: 'Authentication error' });
      }
    };
  }

  /**
   * Require cookie-based authentication only.
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

        const didResult = await this.tokenService.validateToken(token);

        if (didResult.isErr() || !didResult.value) {
          res.status(403).json({ message: 'Invalid or expired token' });
          return;
        }

        req.did = didResult.value;
        Sentry.setUser({ id: didResult.value });
        next();
      } catch (error) {
        res.status(500).json({ message: 'Authentication error' });
      }
    };
  }
}
