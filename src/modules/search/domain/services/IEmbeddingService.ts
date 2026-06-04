import { Result } from '../../../../shared/core/Result';

export interface IEmbeddingService {
  embed(text: string): Promise<Result<number[]>>;
  healthCheck(): Promise<Result<boolean>>;
}
