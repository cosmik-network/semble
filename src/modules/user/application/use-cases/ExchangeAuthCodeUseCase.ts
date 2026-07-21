import { UseCase } from 'src/shared/core/UseCase';
import { Result, err, ok } from 'src/shared/core/Result';
import { AppError } from 'src/shared/core/AppError';
import { TokenPair } from '@semble/types';
import { INativeAuthCodeStore } from '../services/INativeAuthCodeStore';
import { ExchangeAuthCodeErrors } from './errors/ExchangeAuthCodeErrors';

export interface ExchangeAuthCodeDTO {
  code: string;
}

export type ExchangeAuthCodeResponse = Result<
  TokenPair,
  ExchangeAuthCodeErrors.CodeNotFoundError | AppError.UnexpectedError
>;

export class ExchangeAuthCodeUseCase implements UseCase<
  ExchangeAuthCodeDTO,
  Promise<ExchangeAuthCodeResponse>
> {
  constructor(private nativeAuthCodeStore: INativeAuthCodeStore) {}

  async execute(
    request: ExchangeAuthCodeDTO,
  ): Promise<ExchangeAuthCodeResponse> {
    try {
      const tokenPair = await this.nativeAuthCodeStore.consume(request.code);

      if (!tokenPair) {
        return err(new ExchangeAuthCodeErrors.CodeNotFoundError());
      }

      return ok(tokenPair);
    } catch (error: any) {
      return err(new AppError.UnexpectedError(error));
    }
  }
}
