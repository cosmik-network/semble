import { UseCase } from 'src/shared/core/UseCase';
import { Result, err, ok } from 'src/shared/core/Result';
import { AppError } from 'src/shared/core/AppError';
import { NewApiKey } from '@semble/types';
import { IApiKeyRepository } from '../../domain/repositories/IApiKeyRepository';
import { IApiKeyService } from '../services/IApiKeyService';

export interface CreateApiKeyDTO {
  userDid: string;
  name: string;
}

export type CreateApiKeyResult = Result<NewApiKey, AppError.UnexpectedError>;

export class CreateApiKeyUseCase implements UseCase<
  CreateApiKeyDTO,
  Promise<CreateApiKeyResult>
> {
  constructor(
    private apiKeyRepository: IApiKeyRepository,
    private apiKeyService: IApiKeyService,
  ) {}

  async execute(request: CreateApiKeyDTO): Promise<CreateApiKeyResult> {
    try {
      const material = this.apiKeyService.generate();
      const createdAt = new Date();

      const saveResult = await this.apiKeyRepository.save({
        id: material.id,
        userDid: request.userDid,
        name: request.name,
        prefix: material.prefix,
        tokenHash: material.tokenHash,
        createdAt,
        lastUsedAt: null,
        expiresAt: null,
        revoked: false,
      });

      if (saveResult.isErr()) {
        return err(new AppError.UnexpectedError(saveResult.error));
      }

      return ok({
        id: material.id,
        name: request.name,
        prefix: material.prefix,
        createdAt,
        lastUsedAt: null,
        expiresAt: null,
        token: material.token,
      });
    } catch (error: any) {
      return err(new AppError.UnexpectedError(error));
    }
  }
}
