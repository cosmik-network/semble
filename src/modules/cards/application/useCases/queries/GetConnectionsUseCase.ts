import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import {
  IConnectionQueryRepository,
  ConnectionSortField,
  SortOrder,
} from '../../../domain/IConnectionQueryRepository';
import { ICardQueryRepository } from '../../../domain/ICardQueryRepository';
import { IIdentityResolutionService } from '../../../../atproto/domain/services/IIdentityResolutionService';
import { DIDOrHandle } from '../../../../atproto/domain/DIDOrHandle';
import { UrlMetadata, PaginationDTO } from '@semble/types';
import { ConnectionTypeEnum } from '../../../domain/value-objects/ConnectionType';
import { IMetadataService } from '../../../domain/services/IMetadataService';
import { UrlMetadata as UrlMetadataVO } from '../../../domain/value-objects/UrlMetadata';
import { URL } from '../../../domain/value-objects/URL';

export interface GetConnectionsQuery {
  userId: string;
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
  };
  source: {
    url: string;
    metadata: UrlMetadata;
    urlLibraryCount: number;
    urlInLibrary?: boolean;
  };
  target: {
    url: string;
    metadata: UrlMetadata;
    urlLibraryCount: number;
    urlInLibrary?: boolean;
  };
}

export interface GetConnectionsResult {
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

export class GetConnectionsUseCase
  implements UseCase<GetConnectionsQuery, Result<GetConnectionsResult>>
{
  constructor(
    private connectionQueryRepo: IConnectionQueryRepository,
    private cardQueryRepo: ICardQueryRepository,
    private identityResolver: IIdentityResolutionService,
    private metadataService: IMetadataService,
  ) {}

  async execute(
    query: GetConnectionsQuery,
  ): Promise<Result<GetConnectionsResult>> {
    // Set defaults
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Cap at 100
    const sortBy = query.sortBy || ConnectionSortField.CREATED_AT;
    const sortOrder = query.sortOrder || SortOrder.DESC;
    const connectionTypes = query.connectionTypes; // Optional filter

    // Parse and validate user identifier
    const identifierResult = DIDOrHandle.create(query.userId);
    if (identifierResult.isErr()) {
      return err(new ValidationError('Invalid user identifier'));
    }

    // Resolve to DID
    const didResult = await this.identityResolver.resolveToDID(
      identifierResult.value,
    );
    if (didResult.isErr()) {
      return err(
        new ValidationError(
          `Could not resolve user identifier: ${didResult.error.message}`,
        ),
      );
    }

    try {
      // Execute query to get connections
      const result = await this.connectionQueryRepo.getConnectionsForUser(
        didResult.value.value,
        {
          page,
          limit,
          sortBy,
          sortOrder,
          connectionTypes,
        },
      );

      // Extract unique URLs from both source and target
      const uniqueUrls = Array.from(
        new Set([
          ...result.items.map((item) => item.sourceUrl),
          ...result.items.map((item) => item.targetUrl),
        ]),
      );

      // Fetch metadata from external service in parallel
      const metadataResults = await Promise.allSettled(
        uniqueUrls.map(async (urlString) => {
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

      // Build metadata map from external fetch results
      const externalMetadataMap = new Map<string, UrlMetadataVO | null>();
      metadataResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          externalMetadataMap.set(result.value.url, result.value.metadata);
        }
      });

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
        }
      >();

      uniqueUrls.forEach((url) => {
        const urlInfo = urlLibraryInfoMap.get(url);
        const externalMetadata = externalMetadataMap.get(url);

        if (urlInfo && externalMetadata) {
          // Convert UrlMetadataVO to UrlMetadata DTO with dates as ISO strings
          const metadata: UrlMetadata = {
            url: externalMetadata.url,
            title: externalMetadata.title,
            description: externalMetadata.description,
            author: externalMetadata.author,
            siteName: externalMetadata.siteName,
            imageUrl: externalMetadata.imageUrl,
            type: externalMetadata.type,
            doi: externalMetadata.doi,
            isbn: externalMetadata.isbn,
          };

          urlDataMap.set(url, {
            metadata,
            urlLibraryCount: urlInfo.urlLibraryCount,
            urlInLibrary: urlInfo.urlInLibrary,
          });
        }
      });

      // Map items with enriched data
      const enrichedConnections: ConnectionView[] = result.items.map((item) => {
        const sourceData = urlDataMap.get(item.sourceUrl);
        const targetData = urlDataMap.get(item.targetUrl);

        if (!sourceData) {
          throw new Error(`URL data not found for ${item.sourceUrl}`);
        }
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
          },
          source: {
            url: item.sourceUrl,
            metadata: sourceData.metadata,
            urlLibraryCount: sourceData.urlLibraryCount,
            urlInLibrary: sourceData.urlInLibrary,
          },
          target: {
            url: item.targetUrl,
            metadata: targetData.metadata,
            urlLibraryCount: targetData.urlLibraryCount,
            urlInLibrary: targetData.urlInLibrary,
          },
        };
      });

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
          `Failed to retrieve connections: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
