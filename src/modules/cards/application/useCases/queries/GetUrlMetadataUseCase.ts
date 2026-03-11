import { URL } from '../../../domain/value-objects/URL';
import { IMetadataService } from '../../../domain/services/IMetadataService';
import { ICardRepository } from '../../../domain/ICardRepository';
import { ICardQueryRepository } from '../../../domain/ICardQueryRepository';
import { ICollectionQueryRepository } from '../../../domain/ICollectionQueryRepository';
import { IConnectionQueryRepository } from '../../../domain/IConnectionQueryRepository';
import { UseCase } from 'src/shared/core/UseCase';
import { err, ok, Result } from 'src/shared/core/Result';
import { UrlMetadata } from 'src/modules/cards/domain/value-objects/UrlMetadata';

export interface GetUrlMetadataQuery {
  url: string;
  includeStats?: boolean;
}

export interface GetUrlMetadataResult {
  metadata: {
    url: string;
    title?: string;
    description?: string;
    author?: string;
    siteName?: string;
    imageUrl?: string;
    type?: string;
  };
  stats?: {
    libraryCount: number;
    noteCount: number;
    collectionCount: number;
    connections: {
      all: {
        total: number;
        [type: string]: number;
      };
      incoming: {
        total: number;
        [type: string]: number;
      };
      outgoing: {
        total: number;
        [type: string]: number;
      };
    };
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetUrlMetadataUseCase
  implements UseCase<GetUrlMetadataQuery, Result<GetUrlMetadataResult>>
{
  constructor(
    private metadataService: IMetadataService,
    private cardRepository: ICardRepository,
    private cardQueryRepository: ICardQueryRepository,
    private collectionQueryRepository: ICollectionQueryRepository,
    private connectionQueryRepository: IConnectionQueryRepository,
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
      // Fetch metadata from external service
      let metadataResult = await this.metadataService.fetchMetadata(url);
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
        metadata: {
          url: url.value,
          title: metadata.title,
          description: metadata.description,
          author: metadata.author,
          siteName: metadata.siteName,
          imageUrl: metadata.imageUrl,
          type: metadata.type,
        },
      };

      // If includeStats is true, fetch aggregate statistics in parallel
      if (query.includeStats) {
        const [cardStats, collectionCount, connectionStats] = await Promise.all(
          [
            this.cardQueryRepository.getUrlAggregateStats(url.value),
            this.collectionQueryRepository.getCollectionCountForUrl(url.value),
            this.connectionQueryRepository.getConnectionStatsForUrl(url.value),
          ],
        );

        // Convert connection type Maps to plain objects for JSON serialization
        const allConnections: { total: number; [type: string]: number } = {
          total: connectionStats.forwardTotal + connectionStats.backwardTotal,
        };
        const incomingConnections: { total: number; [type: string]: number } = {
          total: connectionStats.backwardTotal,
        };
        const outgoingConnections: { total: number; [type: string]: number } = {
          total: connectionStats.forwardTotal,
        };

        // Add type breakdown for all connections (combining forward and backward)
        const allTypeMap = new Map<string, number>();
        connectionStats.forwardByType.forEach((count, type) => {
          allTypeMap.set(type, (allTypeMap.get(type) || 0) + count);
          outgoingConnections[type] = count;
        });
        connectionStats.backwardByType.forEach((count, type) => {
          allTypeMap.set(type, (allTypeMap.get(type) || 0) + count);
          incomingConnections[type] = count;
        });
        allTypeMap.forEach((count, type) => {
          allConnections[type] = count;
        });

        result.stats = {
          libraryCount: cardStats.libraryCount,
          noteCount: cardStats.noteCount,
          collectionCount,
          connections: {
            all: allConnections,
            incoming: incomingConnections,
            outgoing: outgoingConnections,
          },
        };
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
