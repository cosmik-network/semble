import { UseCase } from 'src/shared/core/UseCase';
import { Result, err, ok } from 'src/shared/core/Result';
import { AppError } from 'src/shared/core/AppError';
import { IOAuthProcessor } from '../services/IOAuthProcessor';
import { Handle } from '../../domain/value-objects/Handle';
import { InitiateOAuthSignInErrors } from './errors/InitiateOAuthSignInErrors';

// appState value threaded through the OAuth flow to signal a Capacitor client.
// The callback controller branches on this to hand tokens back via deep link
// instead of setting cookies.
export const NATIVE_APP_STATE = 'native';

export interface InitiateOAuthSignInDTO {
  handle?: string;
  client?: 'native';
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

      // Generate auth URL, threading native-client intent into the OAuth
      // app state so the callback can hand tokens back via deep link.
      const appState =
        request.client === 'native' ? NATIVE_APP_STATE : undefined;
      const authUrlResult = await this.oauthProcessor.generateAuthUrl(
        request.handle,
        appState,
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
