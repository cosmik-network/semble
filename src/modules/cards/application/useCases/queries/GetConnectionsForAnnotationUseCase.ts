import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import {
  IConnectionQueryRepository,
  ConnectionSortField,
  SortOrder,
  ConnectionForAnnotationRawDTO,
} from '../../../domain/IConnectionQueryRepository';
import { ICardQueryRepository } from '../../../domain/ICardQueryRepository';
import { URL } from '../../../domain/value-objects/URL';
import { normalizeQuotedText } from '../../../domain/value-objects/selectors/normalizeQuotedText';
import { IProfileService } from '../../../domain/services/IProfileService';
import { IMetadataService } from '../../../domain/services/IMetadataService';
import { toUrlMetadataDTO } from '../../../domain/value-objects/urlMetadataMapping';
import {
  UrlMetadata,
  PaginationDTO,
  AnnotationConnectionView,
} from '@semble/types';
import { ProfileEnricher } from '../../services/ProfileEnricher';
import { ConnectionTypeEnum } from '../../../domain/value-objects/ConnectionType';
import { ValidationError } from './GetAnnotationsForUrlUseCase';

export interface GetConnectionsForAnnotationQuery {
  url: string;
  /** Exact text of the annotation's TextQuoteSelector */
  exact: string;
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: ConnectionSortField;
  sortOrder?: SortOrder;
  connectionTypes?: ConnectionTypeEnum[];
}

export interface GetConnectionsForAnnotationResult {
  connections: AnnotationConnectionView[];
  pagination: PaginationDTO;
  sorting: {
    sortBy: ConnectionSortField;
    sortOrder: SortOrder;
  };
}

export class GetConnectionsForAnnotationUseCase implements UseCase<
  GetConnectionsForAnnotationQuery,
  Result<GetConnectionsForAnnotationResult>
> {
  constructor(
    private connectionQueryRepo: IConnectionQueryRepository,
    private cardQueryRepo: ICardQueryRepository,
    private profileService: IProfileService,
    private metadataService: IMetadataService,
  ) {}

  async execute(
    query: GetConnectionsForAnnotationQuery,
  ): Promise<Result<GetConnectionsForAnnotationResult>> {
    const urlResult = URL.create(query.url);
    if (urlResult.isErr()) {
      return err(
        new ValidationError(`Invalid URL: ${urlResult.error.message}`),
      );
    }

    // Matching key — same normalization the write path stores
    const exactNormalized = normalizeQuotedText(query.exact ?? '');
    if (exactNormalized.length === 0) {
      return err(new ValidationError('exact text is required'));
    }

    // Set defaults
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Cap at 100
    const sortBy = query.sortBy || ConnectionSortField.CREATED_AT;
    const sortOrder = query.sortOrder || SortOrder.DESC;
    const connectionTypes = query.connectionTypes; // Optional filter

    try {
      // First find all annotation cards matching the passage, then the
      // connections where any of them is an endpoint
      const cardIds = await this.cardQueryRepo.getMatchingAnnotationCardIds(
        urlResult.value.value,
        exactNormalized,
      );
      const matchingCardIds = new Set(cardIds);

      const result = await this.connectionQueryRepo.getConnectionsForCards(
        cardIds,
        {
          page,
          limit,
          sortBy,
          sortOrder,
          connectionTypes,
        },
      );

      // Split each connection into its matching annotation endpoint and the
      // opposite endpoint
      const splits = result.items
        .map((item) => this.splitEndpoints(item, matchingCardIds))
        .filter((split): split is NonNullable<typeof split> => split !== null);

      // CARD-typed other endpoints resolve to their card's URL before the
      // batch library-info fetch
      const otherCardIds = splits
        .filter((split) => split.other.type === 'CARD')
        .map((split) => split.other.value);
      const cardUrlMap =
        await this.cardQueryRepo.getCardUrlsByIds(otherCardIds);

      const uniqueUrls = Array.from(
        new Set(
          splits
            .map((split) =>
              split.other.type === 'URL'
                ? split.other.value
                : cardUrlMap.get(split.other.value),
            )
            .filter((url): url is string => url !== undefined),
        ),
      );

      // Curator profiles and URL library info are independent — fetch in
      // parallel. The library-info batch carries sample-card metadata; URLs
      // it has none for get a fast external fetch, the same fallback the
      // profile connection tab uses.
      const uniqueCuratorIds = Array.from(
        new Set(splits.map((split) => split.item.connection.curatorId)),
      );
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

      // Metadata map for the other endpoints' URLs: sample-card metadata
      // where the library-info batch has it, fast external fetch where it
      // doesn't, minimal {url} when both come up empty
      const metadataMap = new Map<string, UrlMetadata>();
      const urlsNeedingFetch: string[] = [];
      for (const url of uniqueUrls) {
        const sample = urlLibraryInfoMap.get(url)?.metadata;
        if (sample?.title) {
          metadataMap.set(url, {
            url: sample.url,
            title: sample.title,
            description: sample.description,
            author: sample.author,
            publishedDate: sample.publishedDate?.toISOString(),
            siteName: sample.siteName,
            imageUrl: sample.imageUrl,
            type: sample.type,
            doi: sample.doi,
            isbn: sample.isbn,
          });
        } else {
          urlsNeedingFetch.push(url);
        }
      }
      if (urlsNeedingFetch.length > 0) {
        const results = await Promise.allSettled(
          urlsNeedingFetch.map(async (url) => {
            const urlResult = URL.create(url);
            if (urlResult.isErr()) {
              return { url, metadata: null };
            }
            // Fast mode: latency-sensitive read path; the metadata worker
            // enriches persisted cards asynchronously
            const fetched = await this.metadataService.fetchMetadata(
              urlResult.value,
              false,
              'fast',
            );
            return {
              url,
              metadata: fetched.isOk() ? toUrlMetadataDTO(fetched.value) : null,
            };
          }),
        );
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value.metadata) {
            metadataMap.set(result.value.url, {
              ...result.value.metadata,
              url: result.value.url,
            });
          }
        }
      }

      if (profileMapResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch curator profiles: ${profileMapResult.error.message}`,
          ),
        );
      }

      const profileMap = profileMapResult.value;

      // Map items with enriched data; skip connections with missing curator
      // profiles or unresolvable CARD endpoints
      const enrichedConnections: AnnotationConnectionView[] = [];
      for (const split of splits) {
        const curator = profileMap.get(split.item.connection.curatorId);
        if (!curator) {
          continue;
        }

        const otherUrl =
          split.other.type === 'URL'
            ? split.other.value
            : cardUrlMap.get(split.other.value);
        if (!otherUrl) {
          continue; // Referenced card no longer exists
        }

        const urlInfo = urlLibraryInfoMap.get(otherUrl);
        // Sample-card metadata, an external fetch, or just the URL — in
        // that order, per the metadata map built above
        const metadata: UrlMetadata = metadataMap.get(otherUrl) ?? {
          url: otherUrl,
        };

        enrichedConnections.push({
          connection: {
            id: split.item.connection.id,
            type: split.item.connection.type,
            note: split.item.connection.note,
            createdAt: split.item.connection.createdAt.toISOString(),
            updatedAt: split.item.connection.updatedAt.toISOString(),
            curator,
          },
          annotationCardId: split.annotationCardId,
          other: {
            type: split.other.type,
            cardId: split.other.type === 'CARD' ? split.other.value : undefined,
            url: otherUrl,
            metadata,
            urlLibraryCount: urlInfo?.urlLibraryCount ?? 0,
            urlInLibrary: urlInfo?.urlInLibrary,
            urlConnectionCount: urlInfo?.urlConnectionCount,
            urlIsConnected: urlInfo?.urlIsConnected,
          },
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
          `Failed to retrieve connections for annotation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }

  /**
   * Identify the matching annotation endpoint and the opposite endpoint of a
   * connection. Returns null if no endpoint references a matching card
   * (shouldn't happen given the query, but guards against races).
   */
  private splitEndpoints(
    item: ConnectionForAnnotationRawDTO,
    matchingCardIds: Set<string>,
  ): {
    item: ConnectionForAnnotationRawDTO;
    annotationCardId: string;
    other: { type: 'URL' | 'CARD'; value: string };
  } | null {
    const sourceIsMatch =
      item.source.type === 'CARD' && matchingCardIds.has(item.source.value);
    const targetIsMatch =
      item.target.type === 'CARD' && matchingCardIds.has(item.target.value);

    if (sourceIsMatch) {
      return {
        item,
        annotationCardId: item.source.value,
        other: item.target,
      };
    }
    if (targetIsMatch) {
      return {
        item,
        annotationCardId: item.target.value,
        other: item.source,
      };
    }
    return null;
  }
}
