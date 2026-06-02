import { UseCase } from 'src/shared/core/UseCase';
import { Result, err, ok } from 'src/shared/core/Result';
import { AppError } from 'src/shared/core/AppError';
import { ITokenService } from '../services/ITokenService';
import { TokenPair } from '@semble/types';
import { GenerateExtensionTokensErrors } from './errors/GenerateExtensionTokensErrors';

export interface GenerateExtensionTokensRequest {
  userDid: string;
}

export type GenerateExtensionTokensResponse = Result<
  TokenPair,
  GenerateExtensionTokensErrors.TokenGenerationError | AppError.UnexpectedError
>;

export class GenerateExtensionTokensUseCase implements UseCase<
  GenerateExtensionTokensRequest,
  Promise<GenerateExtensionTokensResponse>
> {
  constructor(private tokenService: ITokenService) {}

  async execute(
    request: GenerateExtensionTokensRequest,
  ): Promise<GenerateExtensionTokensResponse> {
    try {
      // Generate new tokens for the authenticated user
      const tokenResult = await this.tokenService.generateToken(
        request.userDid,
      );

      if (tokenResult.isErr()) {
        return err(
          new GenerateExtensionTokensErrors.TokenGenerationError(
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
