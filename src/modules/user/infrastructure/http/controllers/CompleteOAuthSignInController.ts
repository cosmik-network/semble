import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Request, Response } from 'express';
import { CompleteOAuthSignInUseCase } from '../../../application/use-cases/CompleteOAuthSignInUseCase';
import { CookieService } from '../../../../../shared/infrastructure/http/services/CookieService';
import { configService } from 'src/shared/infrastructure/config';

export class CompleteOAuthSignInController extends Controller {
  constructor(
    private completeOAuthSignInUseCase: CompleteOAuthSignInUseCase,
    private cookieService: CookieService,
  ) {
    super();
  }

  async executeImpl(req: Request, res: Response): Promise<any> {
    const appUrl = configService.getAppConfig().appUrl;
    try {
      const { code, state, iss } = req.query;
      console.log('OAuth callback received with params:', req.query);
      console.log('request coming from:', req.headers.referer);
      console.log('requesting host:', req.headers.host);

      if (!code || !state || !iss) {
        return this.badRequest(res, 'Missing required parameters');
      }

      const result = await this.completeOAuthSignInUseCase.execute({
        code: code as string,
        state: state as string,
        iss: iss as string,
      });

      if (result.isErr()) {
        // Instead of returning JSON, redirect with error
        return res.redirect(
          `${appUrl}/login?error=${encodeURIComponent(result.error.message)}`,
        );
      }

      console.log('setting cookies with tokens:', result.value);
      console.log('redirecting to:', `${appUrl}/auth/complete`);

      // Set tokens in httpOnly cookies
      this.cookieService.setTokens(res, {
        accessToken: result.value.accessToken,
        refreshToken: result.value.refreshToken,
      });

      // Redirect back to frontend without tokens in URL (more secure)
      return res.redirect(`${appUrl}/auth/complete`);
    } catch (error: any) {
      return res.redirect(
        `${appUrl}/login?error=${encodeURIComponent(error.message || 'Unknown error')}`,
      );
    }
  }
}
