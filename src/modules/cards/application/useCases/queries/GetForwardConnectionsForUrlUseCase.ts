import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import {
  IConnectionQueryRepository,
  ConnectionSortField,
  SortOrder,
} from '../../../domain/IConnectionQueryRepository';
import {
  ICardQueryRepository,
  CardSortField,
  SortOrder as CardSortOrder,
} from '../../../domain/ICardQueryRepository';
import { URL } from '../../../domain/value-objects/URL';
import { IProfileService } from '../../../domain/services/IProfileService';
import { UserProfileDTO, UrlMetadata, PaginationDTO } from '@semble/types';
import { ProfileEnricher } from '../../services/ProfileEnricher';
import { ConnectionTypeEnum } from '../../../domain/value-objects/ConnectionType';
import { CardTypeEnum } from '../../../domain/value-objects/CardType';
import { eq, and } from 'drizzle-orm';

export interface GetForwardConnectionsForUrlQuery {
  url: string;
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: ConnectionSortField;
  sortOrder?: SortOrder;
  connectionTypes?: ConnectionTypeEnum[];
}

export interface ConnectionForUrlView {
  connection: {
    id: string;
    type?: string;
    note?: string;
    createdAt: string;
    updatedAt: string;
    curator: UserProfileDTO;
  };
  url: {
    url: string;
    metadata: UrlMetadata;
    urlLibraryCount: number;
    urlInLibrary?: boolean;
  };
}

export interface GetForwardConnectionsForUrlResult {
  connections: ConnectionForUrlView[];
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

export class GetForwardConnectionsForUrlUseCase
  implements
    UseCase<
      GetForwardConnectionsForUrlQuery,
      Result<GetForwardConnectionsForUrlResult>
    >
{
  constructor(
    private connectionQueryRepo: IConnectionQueryRepository,
    private cardQueryRepo: ICardQueryRepository,
    private profileService: IProfileService,
  ) {}

  async execute(
    query: GetForwardConnectionsForUrlQuery,
  ): Promise<Result<GetForwardConnectionsForUrlResult>> {
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
    const connectionTypes = query.connectionTypes; // Optional filter

    try {
      // Execute query to get forward connections
      const result = await this.connectionQueryRepo.getForwardConnectionsForUrl(
        urlResult.value.value,
        {
          page,
          limit,
          sortBy,
          sortOrder,
          connectionTypes,
        },
      );

      // Extract unique curator IDs and URLs
      const uniqueCuratorIds = Array.from(
        new Set(result.items.map((item) => item.connection.curatorId)),
      );
      const uniqueUrls = Array.from(
        new Set(result.items.map((item) => item.url)),
      );

      // Fetch curator profiles using ProfileEnricher
      const profileEnricher = new ProfileEnricher(this.profileService);
      const profileMapResult = await profileEnricher.buildProfileMap(
        uniqueCuratorIds,
        query.callingUserId,
        {
          skipFailures: false,
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

      // Fetch URL metadata and library info for all unique URLs
      const urlDataMap = new Map<
        string,
        {
          metadata: UrlMetadata;
          urlLibraryCount: number;
          urlInLibrary?: boolean;
        }
      >();

      await Promise.all(
        uniqueUrls.map(async (url) => {
          // Get library info for this URL
          const librariesResult = await this.cardQueryRepo.getLibrariesForUrl(
            url,
            {
              page: 1,
              limit: 1000, // Get all to count
              sortBy: CardSortField.CREATED_AT,
              sortOrder: CardSortOrder.DESC,
            },
          );

          const urlLibraryCount = librariesResult.totalCount;
          const urlInLibrary = query.callingUserId
            ? librariesResult.items.some(
                (lib) => lib.userId === query.callingUserId,
              )
            : undefined;

          // Get URL metadata from a card if it exists
          let metadata: UrlMetadata = { url };

          if (librariesResult.items.length > 0) {
            const cardMetadata = librariesResult.items[0]!.card.cardContent;
            metadata = {
              url: cardMetadata.url,
              title: cardMetadata.title,
              description: cardMetadata.description,
              author: cardMetadata.author,
              publishedDate: cardMetadata.publishedDate?.toISOString(),
              siteName: cardMetadata.siteName,
              imageUrl: cardMetadata.imageUrl,
              type: cardMetadata.type,
              retrievedAt: cardMetadata.retrievedAt?.toISOString(),
              doi: cardMetadata.doi,
              isbn: cardMetadata.isbn,
            };
          }

          urlDataMap.set(url, {
            metadata,
            urlLibraryCount,
            urlInLibrary,
          });
        }),
      );

      // Map items with enriched data
      const enrichedConnections: ConnectionForUrlView[] = result.items.map(
        (item) => {
          const curator = profileMap.get(item.connection.curatorId);
          if (!curator) {
            throw new Error(
              `Profile not found for curator ${item.connection.curatorId}`,
            );
          }

          const urlData = urlDataMap.get(item.url);
          if (!urlData) {
            throw new Error(`URL data not found for ${item.url}`);
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
            url: {
              url: item.url,
              metadata: urlData.metadata,
              urlLibraryCount: urlData.urlLibraryCount,
              urlInLibrary: urlData.urlInLibrary,
            },
          };
        },
      );

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
          `Failed to retrieve forward connections for URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
