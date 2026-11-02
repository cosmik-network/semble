import { UrlAggregateStats } from '@semble/types';
import { UseCase } from '../../../../../shared/core/UseCase';
import { Result, ok, err } from '../../../../../shared/core/Result';
import { AppError } from '../../../../../shared/core/AppError';
import { URL } from '../../../domain/value-objects/URL';
import { ICardQueryRepository } from '../../../domain/ICardQueryRepository';
import { UrlStatsMapper } from '../../mappers/UrlStatsMapper';

export interface GetBatchUrlStatsQuery {
  urls: string[];
  callingUserId?: string;
}

export interface UrlStatsItem {
  url: string; // as provided by the caller
  stats: UrlAggregateStats;
  urlInLibrary?: boolean;
  urlIsConnected?: boolean;
}

export interface GetBatchUrlStatsResult {
  urls: UrlStatsItem[];
}

export class GetBatchUrlStatsUseCase implements UseCase<
  GetBatchUrlStatsQuery,
  Result<GetBatchUrlStatsResult, AppError.UnexpectedError>
> {
  constructor(private cardQueryRepository: ICardQueryRepository) {}

  async execute(
    query: GetBatchUrlStatsQuery,
  ): Promise<Result<GetBatchUrlStatsResult, AppError.UnexpectedError>> {
    try {
      // Dedupe inputs and normalize each one. Invalid URLs are skipped rather
      // than failing the batch, so one bad link doesn't sink the request.
      const normalizedByInput = new Map<string, string>();
      for (const input of query.urls) {
        if (normalizedByInput.has(input)) continue;
        const urlResult = URL.create(input);
        if (urlResult.isOk()) {
          normalizedByInput.set(input, urlResult.value.value);
        }
      }

      const statsMap = await this.cardQueryRepository.getBatchUrlStats(
        [...normalizedByInput.values()],
        query.callingUserId,
      );

      const urls: UrlStatsItem[] = [];
      normalizedByInput.forEach((normalized, input) => {
        const stats = statsMap.get(normalized)!;
        urls.push({
          url: input,
          stats: UrlStatsMapper.toAggregateStats(stats),
          urlInLibrary: stats.urlInLibrary,
          urlIsConnected: stats.urlIsConnected,
        });
      });

      return ok({ urls });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
