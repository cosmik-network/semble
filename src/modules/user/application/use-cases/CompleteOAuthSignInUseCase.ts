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

export interface CompleteOAuthSignInResult {
  tokenPair: TokenPair;
  // Opaque app state round-tripped through the OAuth flow (e.g. 'native').
  appState?: string;
}

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

      return ok({
        tokenPair: tokenResult.value,
        appState: authResult.value.appState,
      });
    } catch (error: any) {
      return err(new AppError.UnexpectedError(error));
    }
  }
}
