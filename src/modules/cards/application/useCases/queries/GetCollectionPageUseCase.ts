import { CollectionId } from 'src/modules/cards/domain/value-objects/CollectionId';
import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import {
  ICardQueryRepository,
  CardSortField,
  SortOrder,
  UrlCardView,
} from '../../../domain/ICardQueryRepository';
import { UrlType } from '../../../domain/value-objects/UrlType';
import { ICollectionRepository } from '../../../domain/ICollectionRepository';
import { IProfileService } from '../../../domain/services/IProfileService';
import { IFollowsRepository } from 'src/modules/user/domain/repositories/IFollowsRepository';
import { FollowTargetType } from 'src/modules/user/domain/value-objects/FollowTargetType';

export interface GetCollectionPageQuery {
  collectionId: string;
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: CardSortField;
  sortOrder?: SortOrder;
  urlType?: UrlType;
}

export type CollectionPageUrlCardDTO = UrlCardView;
export interface GetCollectionPageResult {
  id: string;
  uri?: string;
  name: string;
  description?: string;
  author: {
    id: string;
    name: string;
    handle: string;
    avatarUrl?: string;
  };
  urlCards: CollectionPageUrlCardDTO[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
    limit: number;
  };
  sorting: {
    sortBy: CardSortField;
    sortOrder: SortOrder;
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class CollectionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CollectionNotFoundError';
  }
}

export class GetCollectionPageUseCase
  implements UseCase<GetCollectionPageQuery, Result<GetCollectionPageResult>>
{
  constructor(
    private collectionRepo: ICollectionRepository,
    private cardQueryRepo: ICardQueryRepository,
    private profileService: IProfileService,
    private followsRepository: IFollowsRepository,
  ) {}

  async execute(
    query: GetCollectionPageQuery,
  ): Promise<Result<GetCollectionPageResult>> {
    // Set defaults
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Cap at 100
    const sortBy = query.sortBy || CardSortField.UPDATED_AT;
    const sortOrder = query.sortOrder || SortOrder.DESC;
    const urlType = query.urlType;

    // Validate collection ID
    const collectionIdResult = CollectionId.createFromString(
      query.collectionId,
    );
    if (collectionIdResult.isErr()) {
      return err(new ValidationError('Invalid collection ID'));
    }

    try {
      // Get the collection
      const collectionResult = await this.collectionRepo.findById(
        collectionIdResult.value,
      );

      if (collectionResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch collection: ${collectionResult.error instanceof Error ? collectionResult.error.message : 'Unknown error'}`,
          ),
        );
      }

      const collection = collectionResult.value;
      if (!collection) {
        return err(new CollectionNotFoundError('Collection not found'));
      }

      const collectionPublishedRecordId = collection.publishedRecordId;

      const collectionUri = collectionPublishedRecordId?.uri;

      // Get author profile
      const profileResult = await this.profileService.getProfile(
        collection.authorId.value,
        query.callingUserId,
      );

      if (profileResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch author profile: ${profileResult.error instanceof Error ? profileResult.error.message : 'Unknown error'}`,
          ),
        );
      }

      const authorProfile = profileResult.value;

      // Get cards in the collection
      const cardsResult = await this.cardQueryRepo.getCardsInCollection(
        query.collectionId,
        {
          page,
          limit,
          sortBy,
          sortOrder,
          urlType,
        },
        query.callingUserId,
      );

      // Extract unique author IDs from all cards
      const uniqueAuthorIds = Array.from(
        new Set(cardsResult.items.map((card) => card.authorId)),
      );

      // Fetch all author profiles in parallel
      const authorProfileResults = await Promise.all(
        uniqueAuthorIds.map((authorId) =>
          this.profileService.getProfile(authorId, query.callingUserId),
        ),
      );

      // Create a map of authorId -> profile for efficient lookup
      const authorProfileMap = new Map<
        string,
        {
          id: string;
          name: string;
          handle: string;
          avatarUrl?: string;
          bannerUrl?: string;
        }
      >();

      for (let i = 0; i < uniqueAuthorIds.length; i++) {
        const authorId = uniqueAuthorIds[i];
        const profileResult = authorProfileResults[i];

        if (profileResult?.isOk()) {
          const profile = profileResult.value;
          authorProfileMap.set(authorId!, {
            id: profile.id,
            name: profile.name,
            handle: profile.handle,
            avatarUrl: profile.avatarUrl,
            bannerUrl: profile.bannerUrl,
          });
        }
      }

      // Transform raw card data to enriched DTOs with author information
      const enrichedCards: CollectionPageUrlCardDTO[] = cardsResult.items.map(
        (card) => {
          const author = authorProfileMap.get(card.authorId);
          if (!author) {
            throw new Error(
              `Failed to fetch profile for card author: ${card.authorId}`,
            );
          }

          return {
            ...card,
            author,
          };
        },
      );

      // Check if the calling user follows this collection
      let isFollowing: boolean | undefined = undefined;
      if (query.callingUserId) {
        const followResult =
          await this.followsRepository.findByFollowerAndTarget(
            query.callingUserId,
            collection.collectionId.getStringValue(),
            FollowTargetType.COLLECTION,
          );

        if (followResult.isOk()) {
          isFollowing = followResult.value !== null;
        }
      }

      return ok({
        id: collection.collectionId.getStringValue(),
        uri: collectionUri,
        name: collection.name.value,
        description: collection.description?.value,
        accessType: collection.accessType,
        author: {
          id: authorProfile.id,
          name: authorProfile.name,
          handle: authorProfile.handle,
          avatarUrl: authorProfile.avatarUrl,
          bannerUrl: authorProfile.bannerUrl,
        },
        urlCards: enrichedCards,
        cardCount: collection.cardCount,
        createdAt: collection.createdAt.toISOString(),
        updatedAt: collection.updatedAt.toISOString(),
        isFollowing,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(cardsResult.totalCount / limit),
          totalCount: cardsResult.totalCount,
          hasMore: page * limit < cardsResult.totalCount,
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
          `Failed to retrieve collection page: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
