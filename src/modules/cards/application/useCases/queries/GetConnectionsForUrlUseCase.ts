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

// An annotation card endpoint — the card view plus its author, the same
// shape card-list endpoints return for annotation cards
export type AnnotationCardItemDTO = Omit<AnnotationCardView, 'authorId'> & {
  author: UserProfileDTO;
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
    curator: UserProfileDTO;
  };
  source: ConnectionEndpointItemDTO;
  target: ConnectionEndpointItemDTO;
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

      // Build stored-metadata map from connection records
      const metadataMap = new Map<string, UrlMetadataVO>();
      for (const item of result.items) {
        for (const endpoint of [item.source, item.target]) {
          if (
            endpoint.type === 'URL' &&
            endpoint.urlMetadata &&
            !metadataMap.has(endpoint.value)
          ) {
            const metadataResult = UrlMetadataVO.create(
              toUrlMetadataProps(endpoint.urlMetadata),
            );
            if (metadataResult.isOk()) {
              metadataMap.set(endpoint.value, metadataResult.value);
            }
          }
        }
      }

      // Curator profiles, card views, card author profiles, and URL library
      // info are independent — fetch in parallel. No external metadata
      // fetches on this read path: stored connection metadata is used when
      // present, and the library-info batch already carries sample-card
      // metadata as a fallback.
      const uniqueCuratorIds = Array.from(
        new Set(result.items.map((item) => item.connection.curatorId)),
      );
      const cardViewsMap =
        await this.cardQueryRepo.getBatchAnnotationCardViews(cardIds);
      const uniqueCardAuthorIds = Array.from(
        new Set(Array.from(cardViewsMap.values()).map((view) => view.authorId)),
      );
      const profileEnricher = new ProfileEnricher(this.profileService);
      const [curatorMapResult, cardAuthorMapResult, urlLibraryInfoMap] =
        await Promise.all([
          profileEnricher.buildProfileMap(
            uniqueCuratorIds,
            query.callingUserId,
            {
              skipFailures: true, // Skip profiles that fail to resolve
              mapToUser: false,
            },
          ),
          profileEnricher.buildProfileMap(uniqueCardAuthorIds, undefined, {
            skipFailures: true, // Skip cards with failed author profiles
            mapToUser: false,
          }),
          this.cardQueryRepo.getBatchUrlLibraryInfo(
            uniqueUrls,
            query.callingUserId,
          ),
        ]);

      if (curatorMapResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch curator profiles: ${curatorMapResult.error.message}`,
          ),
        );
      }
      if (cardAuthorMapResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch card author profiles: ${cardAuthorMapResult.error.message}`,
          ),
        );
      }

      const curatorMap = curatorMapResult.value;
      const cardAuthorMap = cardAuthorMapResult.value;

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

      // Resolve an endpoint to its view; null when a CARD endpoint's card
      // or author can't be resolved (the connection is then skipped)
      const resolveEndpoint = (endpoint: {
        type: 'URL' | 'CARD';
        value: string;
      }): ConnectionEndpointItemDTO | null => {
        if (endpoint.type === 'CARD') {
          const card = cardViewsMap.get(endpoint.value);
          const author = card && cardAuthorMap.get(card.authorId);
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

        const urlData = urlDataMap.get(endpoint.value);
        if (!urlData) {
          throw new Error(`URL data not found for ${endpoint.value}`);
        }

        return {
          type: 'URL',
          url: endpoint.value,
          metadata: urlData.metadata,
          urlLibraryCount: urlData.urlLibraryCount,
          urlInLibrary: urlData.urlInLibrary,
          urlConnectionCount: urlData.urlConnectionCount,
          urlIsConnected: urlData.urlIsConnected,
        };
      };

      // Map items with enriched data; skip connections with missing curator
      // profiles or unresolvable CARD endpoints
      const enrichedConnections: ConnectionView[] = [];
      for (const item of result.items) {
        const curator = curatorMap.get(item.connection.curatorId);
        if (!curator) {
          continue;
        }

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
            curator,
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
          `Failed to retrieve connections for URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
