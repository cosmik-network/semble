import { UseCase } from 'src/shared/core/UseCase';
import { Result, err, ok } from 'src/shared/core/Result';
import { AppError } from 'src/shared/core/AppError';
import { IAppPasswordProcessor } from 'src/modules/atproto/application/IAppPasswordProcessor';
import { ITokenService } from '../services/ITokenService';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { LoginWithAppPasswordDTO } from '@semble/types';
import { TokenPair } from '@semble/types';
import { DID } from '../../domain/value-objects/DID';
import { Handle } from '../../domain/value-objects/Handle';
import { LoginWithAppPasswordErrors } from './errors/LoginWithAppPasswordErrors';
import { IUserAuthenticationService } from '../../domain/services/IUserAuthenticationService';

export type LoginWithAppPasswordResponse = Result<
  TokenPair,
  | LoginWithAppPasswordErrors.InvalidCredentialsError
  | LoginWithAppPasswordErrors.AuthenticationFailedError
  | LoginWithAppPasswordErrors.TokenGenerationError
  | AppError.UnexpectedError
>;

export class LoginWithAppPasswordUseCase implements UseCase<
  LoginWithAppPasswordDTO,
  Promise<LoginWithAppPasswordResponse>
> {
  constructor(
    private appPasswordProcessor: IAppPasswordProcessor,
    private tokenService: ITokenService,
    private userRepository: IUserRepository,
    private userAuthService: IUserAuthenticationService,
  ) {}

  async execute(
    request: LoginWithAppPasswordDTO,
  ): Promise<LoginWithAppPasswordResponse> {
    try {
      // Validate input parameters
      if (!request.identifier || !request.appPassword) {
        return err(new LoginWithAppPasswordErrors.InvalidCredentialsError());
      }

      // Process app password authentication
      const authResult = await this.appPasswordProcessor.processAppPassword(
        request.identifier,
        request.appPassword,
      );

      if (authResult.isErr()) {
        return err(
          new LoginWithAppPasswordErrors.AuthenticationFailedError(
            authResult.error.message,
          ),
        );
      }

      // Create DID value object
      const didOrError = DID.create(authResult.value.did);
      if (didOrError.isErr()) {
        return err(
          new LoginWithAppPasswordErrors.AuthenticationFailedError(
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
          new LoginWithAppPasswordErrors.AuthenticationFailedError(
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
          new LoginWithAppPasswordErrors.TokenGenerationError(
            tokenResult.error.message,
          ),
        );
      }

      return ok(tokenResult.value);
    } catch (error: any) {
      return err(new AppError.UnexpectedError(error));
    }
  }
}
