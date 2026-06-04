import { Response, Request } from 'express';
import {
  EnvironmentConfigService,
  Environment,
} from '../../config/EnvironmentConfigService';

const ENABLE_AUTH_LOGGING = true;

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
  domain?: string;
}

export class CookieService {
  private readonly ACCESS_TOKEN_COOKIE = 'accessToken';
  private readonly REFRESH_TOKEN_COOKIE = 'refreshToken';

  constructor(private configService: EnvironmentConfigService) {}

  /**
   * Get cookie domain based on environment
   * - local: undefined (defaults to localhost)
   * - dev: .dev.semble.so (allows cookies across api.dev.semble.so and dev.semble.so)
   * - prod: .semble.so (allows cookies across api.semble.so and semble.so)
   */
  private getCookieDomain(): string | undefined {
    const tunnel = this.configService.getTunnelConfig();
    if (tunnel.enabled) {
      return tunnel.cookieDomain;
    }

    const environment = this.configService.get().environment;

    switch (environment) {
      case Environment.PROD:
        return '.semble.so';
      case Environment.DEV:
        return '.dev.semble.so';
      case Environment.LOCAL:
      default:
        return undefined; // Don't set domain for localhost
    }
  }

  /**
   * Get base cookie options based on environment
   */
  private getBaseCookieOptions(): Omit<CookieOptions, 'maxAge'> {
    const environment = this.configService.get().environment;
    const isProduction = environment === Environment.PROD;
    const tunnelEnabled = this.configService.isTunnelMode();

    return {
      httpOnly: true,
      secure: isProduction || tunnelEnabled, // Tunnel serves HTTPS, so cookies must be Secure
      sameSite: 'lax', // 'lax' allows cookies on same-site navigation, better than 'strict' for auth flows
      path: '/',
      domain: this.getCookieDomain(),
    };
  }

  /**
   * Set access token cookie
   */
  public setAccessToken(res: Response, accessToken: string): void {
    const accessTokenExpiresIn =
      this.configService.getAuthConfig().accessTokenExpiresIn;

    const options: CookieOptions = {
      ...this.getBaseCookieOptions(),
      maxAge: accessTokenExpiresIn * 1000, // Convert seconds to milliseconds
    };

    res.cookie(this.ACCESS_TOKEN_COOKIE, accessToken, options);
  }

  /**
   * Set refresh token cookie
   */
  public setRefreshToken(res: Response, refreshToken: string): void {
    const refreshTokenExpiresIn =
      this.configService.getAuthConfig().refreshTokenExpiresIn;

    const options: CookieOptions = {
      ...this.getBaseCookieOptions(),
      maxAge: refreshTokenExpiresIn * 1000, // Convert seconds to milliseconds
    };

    res.cookie(this.REFRESH_TOKEN_COOKIE, refreshToken, options);
  }

  /**
   * Set both access and refresh tokens
   */
  public setTokens(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ): void {
    this.setAccessToken(res, tokens.accessToken);
    this.setRefreshToken(res, tokens.refreshToken);
  }

  /**
   * Get access token from cookies
   */
  public getAccessToken(req: Request): string | undefined {
    return req.cookies?.[this.ACCESS_TOKEN_COOKIE];
  }

  /**
   * Get refresh token from cookies
   */
  public getRefreshToken(req: Request): string | undefined {
    return req.cookies?.[this.REFRESH_TOKEN_COOKIE];
  }

  /**
   * Clear both access and refresh token cookies
   */
  public clearTokens(res: Response): void {
    if (ENABLE_AUTH_LOGGING) {
      console.log(
        '[CookieService] Clearing both access and refresh token cookies',
      );
    }
    const cookieOptions = {
      ...this.getBaseCookieOptions(),
      maxAge: 0, // Expire immediately
    };

    res.clearCookie(this.ACCESS_TOKEN_COOKIE, cookieOptions);
    res.clearCookie(this.REFRESH_TOKEN_COOKIE, cookieOptions);
  }

  /**
   * Clear access token cookie only
   */
  public clearAccessToken(res: Response): void {
    if (ENABLE_AUTH_LOGGING) {
      console.log('[CookieService] Clearing access token cookie');
    }
    const cookieOptions = {
      ...this.getBaseCookieOptions(),
      maxAge: 0,
    };

    res.clearCookie(this.ACCESS_TOKEN_COOKIE, cookieOptions);
  }

  /**
   * Clear refresh token cookie only
   */
  public clearRefreshToken(res: Response): void {
    if (ENABLE_AUTH_LOGGING) {
      console.log('[CookieService] Clearing refresh token cookie');
    }
    const cookieOptions = {
      ...this.getBaseCookieOptions(),
      maxAge: 0,
    };

    res.clearCookie(this.REFRESH_TOKEN_COOKIE, cookieOptions);
  }
}
