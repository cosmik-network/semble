import { UseCase } from 'src/shared/core/UseCase';
import { Result, err, ok } from 'src/shared/core/Result';
import { AppError } from 'src/shared/core/AppError';
import { ApiKey } from '@semble/types';
import { IApiKeyRepository } from '../../domain/repositories/IApiKeyRepository';
import { ApiKeyErrors } from './errors/ApiKeyErrors';

export interface UpdateApiKeyDTO {
  userDid: string;
  id: string;
  name: string;
}

export type UpdateApiKeyResult = Result<
  ApiKey,
  ApiKeyErrors.ApiKeyNotFoundError | AppError.UnexpectedError
>;

export class UpdateApiKeyUseCase
  implements UseCase<UpdateApiKeyDTO, Promise<UpdateApiKeyResult>>
{
  constructor(private apiKeyRepository: IApiKeyRepository) {}

  async execute(request: UpdateApiKeyDTO): Promise<UpdateApiKeyResult> {
    const updateResult = await this.apiKeyRepository.updateName(
      request.id,
      request.userDid,
      request.name,
    );
    if (updateResult.isErr()) {
      return err(new AppError.UnexpectedError(updateResult.error));
    }

    const record = updateResult.value;
    if (!record) {
      return err(new ApiKeyErrors.ApiKeyNotFoundError());
    }

    return ok({
      id: record.id,
      name: record.name,
      prefix: record.prefix,
      createdAt: record.createdAt,
      lastUsedAt: record.lastUsedAt,
      expiresAt: record.expiresAt,
    });
  }
}
