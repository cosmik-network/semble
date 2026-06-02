import { UseCase } from 'src/shared/core/UseCase';
import { Result, err, ok } from 'src/shared/core/Result';
import { AppError } from 'src/shared/core/AppError';
import { ApiKey } from '@semble/types';
import { IApiKeyRepository } from '../../domain/repositories/IApiKeyRepository';

export interface ListApiKeysDTO {
  userDid: string;
}

export type ListApiKeysResult = Result<
  { keys: ApiKey[] },
  AppError.UnexpectedError
>;

export class ListApiKeysUseCase implements UseCase<
  ListApiKeysDTO,
  Promise<ListApiKeysResult>
> {
  constructor(private apiKeyRepository: IApiKeyRepository) {}

  async execute(request: ListApiKeysDTO): Promise<ListApiKeysResult> {
    const result = await this.apiKeyRepository.listByUser(request.userDid);
    if (result.isErr()) {
      return err(new AppError.UnexpectedError(result.error));
    }
    return ok({
      keys: result.value.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
      })),
    });
  }
}
