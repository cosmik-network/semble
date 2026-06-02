import { UseCase } from 'src/shared/core/UseCase';
import { Result, err, ok } from 'src/shared/core/Result';
import { AppError } from 'src/shared/core/AppError';
import { IApiKeyRepository } from '../../domain/repositories/IApiKeyRepository';
import { ApiKeyErrors } from './errors/ApiKeyErrors';

export interface RevokeApiKeyDTO {
  userDid: string;
  id: string;
}

export type RevokeApiKeyResult = Result<
  { success: true },
  ApiKeyErrors.ApiKeyNotFoundError | AppError.UnexpectedError
>;

export class RevokeApiKeyUseCase implements UseCase<
  RevokeApiKeyDTO,
  Promise<RevokeApiKeyResult>
> {
  constructor(private apiKeyRepository: IApiKeyRepository) {}

  async execute(request: RevokeApiKeyDTO): Promise<RevokeApiKeyResult> {
    const result = await this.apiKeyRepository.revoke(
      request.id,
      request.userDid,
    );
    if (result.isErr()) {
      return err(new AppError.UnexpectedError(result.error));
    }
    if (!result.value) {
      return err(new ApiKeyErrors.ApiKeyNotFoundError());
    }
    return ok({ success: true });
  }
}
