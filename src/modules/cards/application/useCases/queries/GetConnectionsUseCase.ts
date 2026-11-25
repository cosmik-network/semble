import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import {
  IConnectionQueryRepository,
  ConnectionSortField,
  SortOrder,
} from '../../../domain/IConnectionQueryRepository';
import {
  ICardQueryRepository,
  AnnotationCardView,
} from '../../../domain/ICardQueryRepository';
import { IIdentityResolutionService } from '../../../../atproto/domain/services/IIdentityResolutionService';
import { DIDOrHandle } from '../../../../atproto/domain/DIDOrHandle';
import { UrlMetadata, PaginationDTO, User } from '@semble/types';
import { ConnectionTypeEnum } from '../../../domain/value-objects/ConnectionType';
import { IMetadataService } from '../../../domain/services/IMetadataService';
import { IProfileService } from '../../../domain/services/IProfileService';
import { UrlMetadata as UrlMetadataVO } from '../../../domain/value-objects/UrlMetadata';
import { toUrlMetadataProps } from '../../../domain/value-objects/urlMetadataMapping';
import { URL } from '../../../domain/value-objects/URL';
import { ProfileEnricher } from '../../services/ProfileEnricher';

export interface GetConnectionsQuery {
  userId: string;
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: ConnectionSortField;
  sortOrder?: SortOrder;
  connectionTypes?: ConnectionTypeEnum[];
}

// An annotation card endpoint — the card view plus its author, the same
// shape card-list endpoints return for annotation cards
export type AnnotationCardItemDTO = Omit<AnnotationCardView, 'authorId'> & {
  author: User;
};

// Connection endpoints as a union discriminated by `type`, mirroring the
// contract's ConnectionEndpointViewSchema
export type ConnectionEndpointItemDTO =
  | {
      type: 'URL';
      url: string;
      metadata: UrlMetadata;
      urlLibraryCount: number;
      urlInLibrary?: boolean;
      urlConnectionCount?: number;
      urlIsConnected?: boolean;
    }
  | {
      type: 'CARD';
      card: AnnotationCardItemDTO;
    };

export interface ConnectionView {
  connection: {
    id: string;
    type?: string;
    note?: string;
    createdAt: string;
    updatedAt: string;
  };
  source: ConnectionEndpointItemDTO;
  target: ConnectionEndpointItemDTO;
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

export class GetConnectionsUseCase implements UseCase<
  GetConnectionsQuery,
  Result<GetConnectionsResult>
> {
  constructor(
    private connectionQueryRepo: IConnectionQueryRepository,
    private cardQueryRepo: ICardQueryRepository,
    private identityResolver: IIdentityResolutionService,
    private metadataService: IMetadataService,
    private profileService: IProfileService,
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

      // Split endpoints by type — URL endpoints need link metadata and
      // library info, CARD endpoints resolve to their annotation card
      const endpoints = result.items.flatMap((item) => [
        item.source,
        item.target,
      ]);
      const uniqueUrls = Array.from(
        new Set(
          endpoints
            .filter((endpoint) => endpoint.type === 'URL')
            .map((endpoint) => endpoint.value),
        ),
      );
      const cardIds = Array.from(
        new Set(
          endpoints
            .filter((endpoint) => endpoint.type === 'CARD')
            .map((endpoint) => endpoint.value),
        ),
      );

      // Build initial metadata map from stored metadata in connection records
      const metadataMap = new Map<string, UrlMetadataVO | null>();
      const urlsNeedingFetch: string[] = [];

      // Check each unique URL to see if we have stored metadata
      for (const urlString of uniqueUrls) {
        // Find if this URL appears as source or target in any connection with metadata
        let hasStoredMetadata = false;

        for (const item of result.items) {
          if (
            item.source.type === 'URL' &&
            item.source.value === urlString &&
            item.source.urlMetadata
          ) {
            // Parse stored metadata
            const metadataResult = UrlMetadataVO.create(
              toUrlMetadataProps(item.source.urlMetadata),
            );
            if (metadataResult.isOk()) {
              metadataMap.set(urlString, metadataResult.value);
              hasStoredMetadata = true;
              break;
            }
          } else if (
            item.target.type === 'URL' &&
            item.target.value === urlString &&
            item.target.urlMetadata
          ) {
            // Parse stored metadata
            const metadataResult = UrlMetadataVO.create(
              toUrlMetadataProps(item.target.urlMetadata),
            );
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
            // Fast mode: latency-sensitive read path; the metadata worker
            // enriches persisted cards asynchronously.
            const metadataResult = await this.metadataService.fetchMetadata(
              urlResult.value,
              false,
              'fast',
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

      // URL library info, annotation card views, and card author profiles
      // are independent — fetch in parallel
      const cardViewsMap =
        await this.cardQueryRepo.getBatchAnnotationCardViews(cardIds);
      const uniqueCardAuthorIds = Array.from(
        new Set(Array.from(cardViewsMap.values()).map((view) => view.authorId)),
      );
      const profileEnricher = new ProfileEnricher(this.profileService);
      const [urlLibraryInfoMap, authorProfileMapResult] = await Promise.all([
        this.cardQueryRepo.getBatchUrlLibraryInfo(
          uniqueUrls,
          query.callingUserId,
        ),
        profileEnricher.buildProfileMap(uniqueCardAuthorIds, undefined, {
          skipFailures: true, // Skip cards with failed author profiles
          mapToUser: false, // Use inline profile (without isFollowing)
        }),
      ]);

      if (authorProfileMapResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch card author profiles: ${authorProfileMapResult.error.message}`,
          ),
        );
      }

      const authorProfileMap = authorProfileMapResult.value;

      // Resolve an endpoint to its view; null when a CARD endpoint's card
      // or author can't be resolved (the connection is then skipped)
      const resolveEndpoint = (endpoint: {
        type: 'URL' | 'CARD';
        value: string;
      }): ConnectionEndpointItemDTO | null => {
        if (endpoint.type === 'CARD') {
          const card = cardViewsMap.get(endpoint.value);
          const author = card && authorProfileMap.get(card.authorId);
          if (!card || !author) {
            return null;
          }
          const { authorId: _authorId, ...cardData } = card;
          return {
            type: 'CARD',
            card: {
              ...cardData,
              author,
            },
          };
        }

        const urlInfo = urlLibraryInfoMap.get(endpoint.value);
        const urlMetadata = metadataMap.get(endpoint.value);

        if (!urlInfo || !urlMetadata) {
          throw new Error(`URL data not found for ${endpoint.value}`);
        }

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

        return {
          type: 'URL',
          url: endpoint.value,
          metadata,
          urlLibraryCount: urlInfo.urlLibraryCount,
          urlInLibrary: urlInfo.urlInLibrary,
          urlConnectionCount: urlInfo.urlConnectionCount,
          urlIsConnected: urlInfo.urlIsConnected,
        };
      };

      // Map items with enriched data; skip connections with unresolvable
      // CARD endpoints
      const enrichedConnections: ConnectionView[] = [];
      for (const item of result.items) {
        const source = resolveEndpoint(item.source);
        const target = resolveEndpoint(item.target);
        if (!source || !target) {
          continue;
        }

        enrichedConnections.push({
          connection: {
            id: item.connection.id,
            type: item.connection.type,
            note: item.connection.note,
            createdAt: item.connection.createdAt.toISOString(),
            updatedAt: item.connection.updatedAt.toISOString(),
          },
          source,
          target,
        });
      }

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
