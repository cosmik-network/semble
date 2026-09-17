import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import {
  IConnectionQueryRepository,
  ConnectionSortField,
  SortOrder,
} from '../../../domain/IConnectionQueryRepository';
import { ICardQueryRepository } from '../../../domain/ICardQueryRepository';
import { URL } from '../../../domain/value-objects/URL';
import { IProfileService } from '../../../domain/services/IProfileService';
import { UserProfileDTO, UrlMetadata, PaginationDTO } from '@semble/types';
import { ProfileEnricher } from '../../services/ProfileEnricher';
import { ConnectionTypeEnum } from '../../../domain/value-objects/ConnectionType';
import { UrlMetadata as UrlMetadataVO } from '../../../domain/value-objects/UrlMetadata';
import { toUrlMetadataProps } from '../../../domain/value-objects/urlMetadataMapping';

export interface GetConnectionsForUrlQuery {
  url: string;
  direction?: 'forward' | 'backward' | 'both';
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: ConnectionSortField;
  sortOrder?: SortOrder;
  connectionTypes?: ConnectionTypeEnum[];
}

export interface ConnectionView {
  connection: {
    id: string;
    type?: string;
    note?: string;
    createdAt: string;
    updatedAt: string;
    curator: UserProfileDTO;
  };
  source: {
    url: string;
    metadata: UrlMetadata;
    urlLibraryCount: number;
    urlInLibrary?: boolean;
    urlConnectionCount?: number;
    urlIsConnected?: boolean;
  };
  target: {
    url: string;
    metadata: UrlMetadata;
    urlLibraryCount: number;
    urlInLibrary?: boolean;
    urlConnectionCount?: number;
    urlIsConnected?: boolean;
  };
}

export interface GetConnectionsForUrlResult {
  connections: ConnectionView[];
  pagination: PaginationDTO;
  sorting: {
    sortBy: ConnectionSortField;
    sortOrder: SortOrder;
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetConnectionsForUrlUseCase implements UseCase<
  GetConnectionsForUrlQuery,
  Result<GetConnectionsForUrlResult>
> {
  constructor(
    private connectionQueryRepo: IConnectionQueryRepository,
    private cardQueryRepo: ICardQueryRepository,
    private profileService: IProfileService,
  ) {}

  async execute(
    query: GetConnectionsForUrlQuery,
  ): Promise<Result<GetConnectionsForUrlResult>> {
    // Validate URL
    const urlResult = URL.create(query.url);
    if (urlResult.isErr()) {
      return err(
        new ValidationError(`Invalid URL: ${urlResult.error.message}`),
      );
    }

    // Set defaults
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Cap at 100
    const sortBy = query.sortBy || ConnectionSortField.CREATED_AT;
    const sortOrder = query.sortOrder || SortOrder.DESC;
    const direction = query.direction || 'both';
    const connectionTypes = query.connectionTypes; // Optional filter

    try {
      // Execute query to get connections
      const result = await this.connectionQueryRepo.getConnectionsForUrl(
        urlResult.value.value,
        direction,
        {
          page,
          limit,
          sortBy,
          sortOrder,
          connectionTypes,
        },
      );

      // Extract unique curator IDs and URLs from both source and target
      const uniqueCuratorIds = Array.from(
        new Set(result.items.map((item) => item.connection.curatorId)),
      );
      const uniqueUrls = Array.from(
        new Set([
          ...result.items.map((item) => item.sourceUrl),
          ...result.items.map((item) => item.targetUrl),
        ]),
      );

      // Curator profiles and URL library info are independent — fetch in
      // parallel. No external metadata fetches on this read path: stored
      // connection metadata is used when present, and the library-info batch
      // already carries sample-card metadata as a fallback.
      const profileEnricher = new ProfileEnricher(this.profileService);
      const [profileMapResult, urlLibraryInfoMap] = await Promise.all([
        profileEnricher.buildProfileMap(uniqueCuratorIds, query.callingUserId, {
          skipFailures: true, // Skip profiles that fail to resolve
          mapToUser: false,
        }),
        this.cardQueryRepo.getBatchUrlLibraryInfo(
          uniqueUrls,
          query.callingUserId,
        ),
      ]);

      if (profileMapResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch curator profiles: ${profileMapResult.error.message}`,
          ),
        );
      }

      const profileMap = profileMapResult.value;

      // Build metadata map from stored metadata in connection records
      const metadataMap = new Map<string, UrlMetadataVO>();
      for (const item of result.items) {
        for (const [urlString, stored] of [
          [item.sourceUrl, item.sourceUrlMetadata],
          [item.targetUrl, item.targetUrlMetadata],
        ] as const) {
          if (stored && !metadataMap.has(urlString)) {
            const metadataResult = UrlMetadataVO.create(
              toUrlMetadataProps(stored),
            );
            if (metadataResult.isOk()) {
              metadataMap.set(urlString, metadataResult.value);
            }
          }
        }
      }

      // Convert to the format expected by the rest of the code
      const urlDataMap = new Map<
        string,
        {
          metadata: UrlMetadata;
          urlLibraryCount: number;
          urlInLibrary?: boolean;
          urlConnectionCount?: number;
          urlIsConnected?: boolean;
        }
      >();

      uniqueUrls.forEach((url) => {
        const urlInfo = urlLibraryInfoMap.get(url);
        const urlMetadata = metadataMap.get(url);

        // Stored connection metadata first, then the sample-card metadata
        // from the library-info batch, then just the URL itself
        const metadata: UrlMetadata = urlMetadata
          ? {
              url: urlMetadata.url,
              title: urlMetadata.title,
              description: urlMetadata.description,
              author: urlMetadata.author,
              siteName: urlMetadata.siteName,
              imageUrl: urlMetadata.imageUrl,
              type: urlMetadata.type,
              doi: urlMetadata.doi,
              isbn: urlMetadata.isbn,
            }
          : urlInfo
            ? {
                url: urlInfo.metadata.url,
                title: urlInfo.metadata.title,
                description: urlInfo.metadata.description,
                author: urlInfo.metadata.author,
                siteName: urlInfo.metadata.siteName,
                imageUrl: urlInfo.metadata.imageUrl,
                type: urlInfo.metadata.type,
                doi: urlInfo.metadata.doi,
                isbn: urlInfo.metadata.isbn,
              }
            : { url };

        urlDataMap.set(url, {
          metadata,
          urlLibraryCount: urlInfo?.urlLibraryCount ?? 0,
          urlInLibrary: urlInfo?.urlInLibrary,
          urlConnectionCount: urlInfo?.urlConnectionCount,
          urlIsConnected: urlInfo?.urlIsConnected,
        });
      });

      // Map items with enriched data
      // Filter out connections with missing curator profiles
      const enrichedConnections = result.items
        .map((item) => {
          const curator = profileMap.get(item.connection.curatorId);
          if (!curator) {
            return null; // Skip connections with missing curator profiles
          }

          const sourceData = urlDataMap.get(item.sourceUrl);
          if (!sourceData) {
            throw new Error(`URL data not found for ${item.sourceUrl}`);
          }

          const targetData = urlDataMap.get(item.targetUrl);
          if (!targetData) {
            throw new Error(`URL data not found for ${item.targetUrl}`);
          }

          return {
            connection: {
              id: item.connection.id,
              type: item.connection.type,
              note: item.connection.note,
              createdAt: item.connection.createdAt.toISOString(),
              updatedAt: item.connection.updatedAt.toISOString(),
              curator,
            },
            source: {
              url: item.sourceUrl,
              metadata: sourceData.metadata,
              urlLibraryCount: sourceData.urlLibraryCount,
              urlInLibrary: sourceData.urlInLibrary,
              urlConnectionCount: sourceData.urlConnectionCount,
              urlIsConnected: sourceData.urlIsConnected,
            },
            target: {
              url: item.targetUrl,
              metadata: targetData.metadata,
              urlLibraryCount: targetData.urlLibraryCount,
              urlInLibrary: targetData.urlInLibrary,
              urlConnectionCount: targetData.urlConnectionCount,
              urlIsConnected: targetData.urlIsConnected,
            },
          };
        })
        .filter((connection) => connection !== null) as ConnectionView[];

      return ok({
        connections: enrichedConnections,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(result.totalCount / limit),
          totalCount: result.totalCount,
          hasMore: page * limit < result.totalCount,
          limit,
        },
        sorting: {
          sortBy,
          sortOrder,
        },
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to retrieve connections for URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
