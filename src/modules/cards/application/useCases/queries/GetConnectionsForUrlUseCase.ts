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
import { IMetadataService } from '../../../domain/services/IMetadataService';
import { UrlMetadata as UrlMetadataVO } from '../../../domain/value-objects/UrlMetadata';

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

export class GetConnectionsForUrlUseCase
  implements
    UseCase<GetConnectionsForUrlQuery, Result<GetConnectionsForUrlResult>>
{
  constructor(
    private connectionQueryRepo: IConnectionQueryRepository,
    private cardQueryRepo: ICardQueryRepository,
    private profileService: IProfileService,
    private metadataService: IMetadataService,
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

      // Fetch curator profiles using ProfileEnricher
      const profileEnricher = new ProfileEnricher(this.profileService);
      const profileMapResult = await profileEnricher.buildProfileMap(
        uniqueCuratorIds,
        query.callingUserId,
        {
          skipFailures: true, // Skip profiles that fail to resolve
          mapToUser: false,
        },
      );

      if (profileMapResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch curator profiles: ${profileMapResult.error.message}`,
          ),
        );
      }

      const profileMap = profileMapResult.value;

      // Build initial metadata map from stored metadata in connection records
      const metadataMap = new Map<string, UrlMetadataVO | null>();
      const urlsNeedingFetch: string[] = [];

      // Check each unique URL to see if we have stored metadata
      for (const urlString of uniqueUrls) {
        // Find if this URL appears as source or target in any connection with metadata
        let hasStoredMetadata = false;

        for (const item of result.items) {
          if (item.sourceUrl === urlString && item.sourceUrlMetadata) {
            // Parse stored metadata
            const metadataResult = UrlMetadataVO.create({
              url: item.sourceUrlMetadata.url,
              title: item.sourceUrlMetadata.title,
              description: item.sourceUrlMetadata.description,
              author: item.sourceUrlMetadata.author,
              siteName: item.sourceUrlMetadata.siteName,
              imageUrl: item.sourceUrlMetadata.imageUrl,
              type: item.sourceUrlMetadata.type,
              doi: item.sourceUrlMetadata.doi,
              isbn: item.sourceUrlMetadata.isbn,
            });
            if (metadataResult.isOk()) {
              metadataMap.set(urlString, metadataResult.value);
              hasStoredMetadata = true;
              break;
            }
          } else if (item.targetUrl === urlString && item.targetUrlMetadata) {
            // Parse stored metadata
            const metadataResult = UrlMetadataVO.create({
              url: item.targetUrlMetadata.url,
              title: item.targetUrlMetadata.title,
              description: item.targetUrlMetadata.description,
              author: item.targetUrlMetadata.author,
              siteName: item.targetUrlMetadata.siteName,
              imageUrl: item.targetUrlMetadata.imageUrl,
              type: item.targetUrlMetadata.type,
              doi: item.targetUrlMetadata.doi,
              isbn: item.targetUrlMetadata.isbn,
            });
            if (metadataResult.isOk()) {
              metadataMap.set(urlString, metadataResult.value);
              hasStoredMetadata = true;
              break;
            }
          }
        }

        // If no stored metadata found, add to fetch list
        if (!hasStoredMetadata) {
          urlsNeedingFetch.push(urlString);
        }
      }

      // Fetch metadata from external service only for URLs without stored metadata
      if (urlsNeedingFetch.length > 0) {
        const metadataResults = await Promise.allSettled(
          urlsNeedingFetch.map(async (urlString) => {
            const urlResult = URL.create(urlString);
            if (urlResult.isErr()) {
              return { url: urlString, metadata: null };
            }
            const metadataResult = await this.metadataService.fetchMetadata(
              urlResult.value,
            );
            if (metadataResult.isOk()) {
              return { url: urlString, metadata: metadataResult.value };
            }
            // Fallback to minimal metadata if fetch fails
            const fallbackResult = UrlMetadataVO.create({ url: urlString });
            return {
              url: urlString,
              metadata: fallbackResult.isOk() ? fallbackResult.value : null,
            };
          }),
        );

        // Add fetched metadata to the map
        metadataResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            metadataMap.set(result.value.url, result.value.metadata);
          }
        });
      }

      // Fetch URL library info for counts and in-library status
      const urlLibraryInfoMap = await this.cardQueryRepo.getBatchUrlLibraryInfo(
        uniqueUrls,
        query.callingUserId,
      );

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

        if (urlInfo && urlMetadata) {
          // Convert UrlMetadataVO to UrlMetadata DTO with dates as ISO strings
          const metadata: UrlMetadata = {
            url: urlMetadata.url,
            title: urlMetadata.title,
            description: urlMetadata.description,
            author: urlMetadata.author,
            siteName: urlMetadata.siteName,
            imageUrl: urlMetadata.imageUrl,
            type: urlMetadata.type,
            doi: urlMetadata.doi,
            isbn: urlMetadata.isbn,
          };

          urlDataMap.set(url, {
            metadata,
            urlLibraryCount: urlInfo.urlLibraryCount,
            urlInLibrary: urlInfo.urlInLibrary,
            urlConnectionCount: urlInfo.urlConnectionCount,
            urlIsConnected: urlInfo.urlIsConnected,
          });
        }
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
