import { URL } from '../../../domain/value-objects/URL';
import { IMetadataService } from '../../../domain/services/IMetadataService';
import { ICardQueryRepository } from '../../../domain/ICardQueryRepository';
import { UseCase } from 'src/shared/core/UseCase';
import { err, ok, Result } from 'src/shared/core/Result';
import { UrlMetadata } from 'src/modules/cards/domain/value-objects/UrlMetadata';
import {
  toUrlMetadataDTO,
  UrlMetadataDTO,
} from 'src/modules/cards/domain/value-objects/urlMetadataMapping';
import { UrlAggregateStats } from '@semble/types';
import { UrlStatsMapper } from '../../mappers/UrlStatsMapper';

export interface GetUrlMetadataQuery {
  url: string;
  includeStats?: boolean;
  callingUserId?: string;
}

export interface GetUrlMetadataResult {
  metadata: UrlMetadataDTO;
  stats?: UrlAggregateStats;
  urlInLibrary?: boolean;
  urlIsConnected?: boolean;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetUrlMetadataUseCase implements UseCase<
  GetUrlMetadataQuery,
  Result<GetUrlMetadataResult>
> {
  constructor(
    private metadataService: IMetadataService,
    private cardQueryRepository: ICardQueryRepository,
  ) {}

  async execute(
    query: GetUrlMetadataQuery,
  ): Promise<Result<GetUrlMetadataResult>> {
    // Validate and create URL value object
    const urlResult = URL.create(query.url);
    if (urlResult.isErr()) {
      return err(
        new ValidationError(`Invalid URL: ${urlResult.error.message}`),
      );
    }
    const url = urlResult.value;

    try {
      // Fetch metadata from external service. Fast mode: this endpoint powers
      // latency-sensitive previews; persisted cards get enriched asynchronously.
      // Stats don't depend on metadata, so fetch them concurrently.
      const [fetchedMetadata, statsMap] = await Promise.all([
        this.metadataService.fetchMetadata(url, false, 'fast'),
        query.includeStats
          ? this.cardQueryRepository.getBatchUrlStats(
              [url.value],
              query.callingUserId,
            )
          : undefined,
      ]);

      let metadataResult = fetchedMetadata;
      if (metadataResult.isErr()) {
        metadataResult = UrlMetadata.create({ url: url.value });
        if (metadataResult.isErr()) {
          return err(
            new Error(
              `Failed to fetch metadata: ${metadataResult.error instanceof Error ? metadataResult.error.message : 'Unknown error'}`,
            ),
          );
        }
      }

      const metadata = metadataResult.value;

      // Prepare the result
      const result: GetUrlMetadataResult = {
        metadata: { ...toUrlMetadataDTO(metadata), url: url.value },
      };

      if (statsMap) {
        const stats = statsMap.get(url.value)!;

        result.stats = UrlStatsMapper.toAggregateStats(stats);
        result.urlInLibrary = stats.urlInLibrary;
        result.urlIsConnected = stats.urlIsConnected;
      }

      return ok(result);
    } catch (error) {
      return err(
        new Error(
          `Failed to get URL metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
