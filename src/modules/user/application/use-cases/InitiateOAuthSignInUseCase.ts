import { UseCase } from 'src/shared/core/UseCase';
import { Result, err, ok } from 'src/shared/core/Result';
import { AppError } from 'src/shared/core/AppError';
import { IOAuthProcessor } from '../services/IOAuthProcessor';
import { Handle } from '../../domain/value-objects/Handle';
import { InitiateOAuthSignInErrors } from './errors/InitiateOAuthSignInErrors';

export interface InitiateOAuthSignInDTO {
  handle?: string;
}

export type InitiateOAuthSignInResponse = Result<
  { authUrl: string },
  InitiateOAuthSignInErrors.InvalidHandleError | AppError.UnexpectedError
>;

export class InitiateOAuthSignInUseCase implements UseCase<
  InitiateOAuthSignInDTO,
  Promise<InitiateOAuthSignInResponse>
> {
  constructor(private oauthProcessor: IOAuthProcessor) {}

  async execute(
    request: InitiateOAuthSignInDTO,
  ): Promise<InitiateOAuthSignInResponse> {
    try {
      if (!request.handle) {
        return err(
          new InitiateOAuthSignInErrors.InvalidHandleError(
            'Handle is required for OAuth sign-in',
          ),
        );
      }
      const handleOrError = Handle.create(request.handle);
      if (handleOrError.isErr()) {
        return err(
          new InitiateOAuthSignInErrors.InvalidHandleError(
            handleOrError.error.message,
          ),
        );
      }

      // Generate auth URL
      const authUrlResult = await this.oauthProcessor.generateAuthUrl(
        request.handle,
      );

      if (authUrlResult.isErr()) {
        return err(new AppError.UnexpectedError(authUrlResult.error));
      }

      return ok({ authUrl: authUrlResult.value });
    } catch (error: any) {
      return err(new AppError.UnexpectedError(error));
    }
  }
}
