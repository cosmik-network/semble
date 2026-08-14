import { UseCase } from 'src/shared/core/UseCase';
import { Result, err, ok } from 'src/shared/core/Result';
import { AppError } from 'src/shared/core/AppError';
import { IOAuthProcessor } from '../services/IOAuthProcessor';
import { ITokenService } from '../services/ITokenService';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { OAuthCallbackDTO } from '@semble/types';
import { TokenPair } from '@semble/types';
import { DID } from '../../domain/value-objects/DID';
import { Handle } from '../../domain/value-objects/Handle';
import { CompleteOAuthSignInErrors } from './errors/CompleteOAuthSignInErrors';
import { IUserAuthenticationService } from '../../domain/services/IUserAuthenticationService';
import { User } from '../../domain/User';
import { IUserOnboardingRepository } from '../../domain/repositories/IUserOnboardingRepository';

export interface CompleteOAuthSignInResult extends TokenPair {
  // App-relative path (always leading-slash) the caller should redirect to.
  redirectPath: string;
}

// Config governing where a user lands after a successful sign-in.
export interface PostAuthRedirectConfig {
  onboardingRedirectAfter?: Date;
}

export const DEFAULT_POST_AUTH_REDIRECT_PATH = '/home';
export const ONBOARDING_REDIRECT_PATH = '/onboarding';

export type CompleteOAuthSignInResponse = Result<
  CompleteOAuthSignInResult,
  | CompleteOAuthSignInErrors.InvalidCallbackParamsError
  | CompleteOAuthSignInErrors.AuthenticationFailedError
  | CompleteOAuthSignInErrors.TokenGenerationError
  | AppError.UnexpectedError
>;

export class CompleteOAuthSignInUseCase implements UseCase<
  OAuthCallbackDTO,
  Promise<CompleteOAuthSignInResponse>
> {
  constructor(
    private oauthProcessor: IOAuthProcessor,
    private tokenService: ITokenService,
    private userRepository: IUserRepository,
    private userAuthService: IUserAuthenticationService,
    private onboardingRepository: IUserOnboardingRepository,
    private redirectConfig: PostAuthRedirectConfig,
  ) {}

  async execute(
    request: OAuthCallbackDTO,
  ): Promise<CompleteOAuthSignInResponse> {
    try {
      // Validate callback parameters
      if (!request.code || !request.state || !request.iss) {
        return err(new CompleteOAuthSignInErrors.InvalidCallbackParamsError());
      }

      // Process OAuth callback
      const authResult = await this.oauthProcessor.processCallback(request);

      if (authResult.isErr()) {
        return err(
          new CompleteOAuthSignInErrors.AuthenticationFailedError(
            authResult.error.message,
          ),
        );
      }

      // Create DID value object
      const didOrError = DID.create(authResult.value.did);
      if (didOrError.isErr()) {
        return err(
          new CompleteOAuthSignInErrors.AuthenticationFailedError(
            didOrError.error.message,
          ),
        );
      }
      const did = didOrError.value;

      // Create Handle value object if available
      let handle: Handle | undefined;
      if (authResult.value.handle) {
        const handleOrError = Handle.create(authResult.value.handle);
        if (handleOrError.isOk()) {
          handle = handleOrError.value;
        }
      }

      // Validate user credentials through domain service
      const authenticationResult =
        await this.userAuthService.validateUserCredentials(did, handle);

      if (authenticationResult.isErr()) {
        return err(
          new CompleteOAuthSignInErrors.AuthenticationFailedError(
            authenticationResult.error.message,
          ),
        );
      }

      const user = authenticationResult.value.user;

      // Record login
      user.recordLogin();

      // Save updated user
      await this.userRepository.save(user);

      // Generate tokens
      const tokenResult = await this.tokenService.generateToken(did.value);

      if (tokenResult.isErr()) {
        return err(
          new CompleteOAuthSignInErrors.TokenGenerationError(
            tokenResult.error.message,
          ),
        );
      }

      const redirectPath = await this.resolveRedirectPath(user);

      return ok({ ...tokenResult.value, redirectPath });
    } catch (error: any) {
      return err(new AppError.UnexpectedError(error));
    }
  }

  // Extension point for post-auth redirects: add further rules here in priority
  // order, first match wins. Rules must never throw or fail the sign-in — the
  // user is already authenticated by this point and their tokens are valid.
  private async resolveRedirectPath(user: User): Promise<string> {
    if (await this.shouldRedirectToOnboarding(user)) {
      return ONBOARDING_REDIRECT_PATH;
    }

    return DEFAULT_POST_AUTH_REDIRECT_PATH;
  }

  private async shouldRedirectToOnboarding(user: User): Promise<boolean> {
    const cutoff = this.redirectConfig.onboardingRedirectAfter;
    if (!cutoff) {
      return false;
    }

    // linkedAt is set once when the account is first linked and is never
    // updated on subsequent logins, so this targets recent sign-ups only.
    if (user.linkedAt < cutoff) {
      return false;
    }

    const stateResult = await this.onboardingRepository.findByUserId(
      user.did.value,
    );
    if (stateResult.isErr()) {
      return false;
    }

    const state = stateResult.value;

    return (
      state === null ||
      state.onboardingState === null ||
      state.onboardingState === 'NOT_STARTED'
    );
  }
}
