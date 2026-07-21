import { Controller } from '../../../../../shared/infrastructure/http/Controller';
import { Request, Response } from 'express';
import { CompleteOAuthSignInUseCase } from '../../../application/use-cases/CompleteOAuthSignInUseCase';
import { NATIVE_APP_STATE } from '../../../application/use-cases/InitiateOAuthSignInUseCase';
import { CookieService } from '../../../../../shared/infrastructure/http/services/CookieService';
import { INativeAuthCodeStore } from '../../../application/services/INativeAuthCodeStore';
import { configService } from 'src/shared/infrastructure/config';

export class CompleteOAuthSignInController extends Controller {
  constructor(
    private completeOAuthSignInUseCase: CompleteOAuthSignInUseCase,
    private cookieService: CookieService,
    private nativeAuthCodeStore: INativeAuthCodeStore,
  ) {
    super();
  }

  private nativeDeepLink(params: Record<string, string>): string {
    const scheme = configService.getAppConfig().nativeScheme;
    const qs = new URLSearchParams(params).toString();
    return `${scheme}://auth?${qs}`;
  }

  async executeImpl(req: Request, res: Response): Promise<any> {
    const appUrl = configService.getAppConfig().appUrl;
    console.log(
      `[CompleteOAuthSignInController] Received OAuth callback with query:`,
      req.query,
    );
    try {
      const { code, state, iss } = req.query;

      if (!code || !state || !iss) {
        return this.badRequest(res, 'Missing required parameters');
      }

      const result = await this.completeOAuthSignInUseCase.execute({
        code: code as string,
        state: state as string,
        iss: iss as string,
      });

      if (result.isErr()) {
        // On error, we don't yet know if this was a native flow only via the
        // appState (which lives on the success path). Redirect to the web login
        // with the error; the native app can also surface this if it opened the
        // system browser and the user returns.
        return res.redirect(
          `${appUrl}/login?error=${encodeURIComponent(result.error.message)}`,
        );
      }

      const { tokenPair, appState } = result.value;

      // Native (Capacitor) flow: never set cookies or put tokens in the URL.
      // Stash the TokenPair under a one-time code and deep-link the code back.
      if (appState === NATIVE_APP_STATE) {
        const oneTimeCode = await this.nativeAuthCodeStore.create(tokenPair);
        return res.redirect(this.nativeDeepLink({ code: oneTimeCode }));
      }

      // Browser flow (unchanged): set tokens in httpOnly cookies.
      this.cookieService.setTokens(res, {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
      });

      // Redirect back to frontend without tokens in URL (more secure)
      return res.redirect(`${appUrl}/home`);
    } catch (error: any) {
      return res.redirect(
        `${appUrl}/login?error=${encodeURIComponent(error.message || 'Unknown error')}`,
      );
    }
  }
}
