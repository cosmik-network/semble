import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IFeedRepository } from '../../../domain/IFeedRepository';
import { ActivityId } from '../../../domain/value-objects/ActivityId';
import { IProfileService } from '../../../../cards/domain/services/IProfileService';
import {
  ICardQueryRepository,
  UrlCardView,
} from '../../../../cards/domain/ICardQueryRepository';
import { ICollectionRepository } from 'src/modules/cards/domain/ICollectionRepository';
import { CollectionId } from 'src/modules/cards/domain/value-objects/CollectionId';
import { UrlType } from '../../../../cards/domain/value-objects/UrlType';
import { GetGlobalFeedResponse, FeedItem, ActivitySource } from '@semble/types';
import { CollectionAccessType } from '../../../../cards/domain/Collection';
import { IFollowsRepository } from 'src/modules/user/domain/repositories/IFollowsRepository';
import { FollowTargetType } from 'src/modules/user/domain/value-objects/FollowTargetType';
import { ProfileEnricher } from '../../../../cards/application/services/ProfileEnricher';

export interface GetGlobalFeedQuery {
  callingUserId?: string;
  page?: number;
  limit?: number;
  beforeActivityId?: string; // For cursor-based pagination
  urlType?: string; // Filter by URL type
  source?: ActivitySource; // Filter by activity source
}

// Use the shared API type directly
export type GetGlobalFeedResult = GetGlobalFeedResponse;

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class GetGlobalFeedUseCase
  implements
    UseCase<
      GetGlobalFeedQuery,
      Result<GetGlobalFeedResult, ValidationError | AppError.UnexpectedError>
    >
{
  constructor(
    private feedRepository: IFeedRepository,
    private profileService: IProfileService,
    private cardQueryRepository: ICardQueryRepository,
    private collectionRepository: ICollectionRepository,
    private followsRepository: IFollowsRepository,
  ) {}

  async execute(
    query: GetGlobalFeedQuery,
  ): Promise<
    Result<GetGlobalFeedResult, ValidationError | AppError.UnexpectedError>
  > {
    try {
      // Set defaults and validate
      const page = query.page || 1;
      const limit = Math.min(query.limit || 20, 100); // Cap at 100

      let beforeActivityId: ActivityId | undefined;
      if (query.beforeActivityId) {
        const activityIdResult = ActivityId.createFromString(
          query.beforeActivityId,
        );
        if (activityIdResult.isErr()) {
          return err(
            new ValidationError(
              `Invalid beforeActivityId: ${activityIdResult.error.message}`,
            ),
          );
        }
        beforeActivityId = activityIdResult.value;
      }

      // Parse urlType if provided
      let urlType: UrlType | undefined;
      if (query.urlType) {
        urlType = query.urlType as UrlType;
      }

      // Fetch activities from repository
      const feedResult = await this.feedRepository.getGlobalFeed({
        page,
        limit,
        beforeActivityId,
        urlType,
        source: query.source,
      });

      if (feedResult.isErr()) {
        return err(AppError.UnexpectedError.create(feedResult.error));
      }

      const feed = feedResult.value;

      // Get unique actor IDs for profile enrichment
      const actorIds = [
        ...new Set(feed.activities.map((activity) => activity.actorId.value)),
      ];

      // Fetch profiles for all actors using ProfileEnricher
      const profileEnricher = new ProfileEnricher(this.profileService);
      const actorProfilesResult = await profileEnricher.buildProfileMap(
        actorIds,
        undefined, // No calling user for actor profiles
        {
          skipFailures: true,
          includeFallback: true,
          mapToUser: false, // Use inline profile (without isFollowing)
        },
      );

      if (actorProfilesResult.isErr()) {
        return err(AppError.UnexpectedError.create(actorProfilesResult.error));
      }

      const actorProfiles = actorProfilesResult.value;

      // Get unique card IDs for hydration
      const cardIds = [
        ...new Set(
          feed.activities
            .filter((activity) => activity.cardCollected)
            .map((activity) => activity.metadata.cardId),
        ),
      ];

      // Batch fetch card data
      const cardDataMap = await this.cardQueryRepository.getBatchUrlCardViews(
        cardIds,
        query.callingUserId,
      );

      // Get unique card author IDs
      const cardAuthorIds = [
        ...new Set(
          Array.from(cardDataMap.values()).map((card) => card.authorId),
        ),
      ];

      // Fetch card author profiles using ProfileEnricher
      const cardAuthorProfilesResult = await profileEnricher.buildProfileMap(
        cardAuthorIds,
        query.callingUserId,
        {
          skipFailures: true, // Skip cards with failed author profiles
          mapToUser: false, // Use inline profile (without isFollowing)
        },
      );

      if (cardAuthorProfilesResult.isErr()) {
        return err(
          AppError.UnexpectedError.create(cardAuthorProfilesResult.error),
        );
      }

      const cardAuthorProfiles = cardAuthorProfilesResult.value;

      // Get collection data for activities that have collections
      const collectionIds = [
        ...new Set(
          feed.activities
            .filter(
              (activity) =>
                activity.cardCollected && activity.metadata.collectionIds,
            )
            .flatMap((activity) => activity.metadata.collectionIds || []),
        ),
      ];

      // Batch fetch all collections
      const collectionIdObjects: CollectionId[] = [];
      const collectionIdMap = new Map<string, string>(); // Map UUID string to original string

      for (const collectionId of collectionIds) {
        const collectionIdResult = CollectionId.createFromString(collectionId);
        if (collectionIdResult.isOk()) {
          collectionIdObjects.push(collectionIdResult.value);
          collectionIdMap.set(
            collectionIdResult.value.getStringValue(),
            collectionId,
          );
        }
      }

      const collectionsResult =
        await this.collectionRepository.findByIds(collectionIdObjects);

      if (collectionsResult.isErr()) {
        return err(AppError.UnexpectedError.create(collectionsResult.error));
      }

      const validCollections = collectionsResult.value.map((collection) => {
        const uri = collection.publishedRecordId?.uri;
        const cardIds = new Set(
          collection.cardIds.map((cardId) => cardId.getStringValue()),
        );

        return {
          id: collection.collectionId.getStringValue(),
          uri,
          name: collection.name.toString(),
          description: collection.description?.toString(),
          accessType: collection.accessType,
          authorId: collection.authorId.value,
          cardCount: collection.cardCount,
          createdAt: collection.createdAt.toISOString(),
          updatedAt: collection.updatedAt.toISOString(),
          cardIds,
          collectionId: collectionIdMap.get(
            collection.collectionId.getStringValue(),
          )!,
        };
      });

      // Get unique collection author IDs
      const collectionAuthorIds = [
        ...new Set(validCollections.map((c) => c.authorId)),
      ];

      // Batch fetch collection author profiles using ProfileEnricher
      const collectionAuthorProfilesResult =
        await profileEnricher.buildProfileMap(
          collectionAuthorIds,
          query.callingUserId,
          {
            skipFailures: true, // Skip collections with failed author profiles
            mapToUser: false, // Use inline profile (without isFollowing)
          },
        );

      if (collectionAuthorProfilesResult.isErr()) {
        return err(
          AppError.UnexpectedError.create(collectionAuthorProfilesResult.error),
        );
      }

      const collectionAuthorProfiles = collectionAuthorProfilesResult.value;

      // Build collection data map with enriched author data
      const collectionDataMap = new Map<
        string,
        {
          id: string;
          uri?: string;
          name: string;
          description?: string;
          accessType: CollectionAccessType;
          author: {
            id: string;
            name: string;
            handle: string;
            avatarUrl?: string;
            bannerUrl?: string;
            description?: string;
          };
          cardCount: number;
          createdAt: string;
          updatedAt: string;
          cardIds: Set<string>; // Track which cards are in this collection
        }
      >();

      validCollections.forEach((result) => {
        const author = collectionAuthorProfiles.get(result.authorId);
        if (!author) {
          return; // Skip collections with missing author profiles
        }

        collectionDataMap.set(result.collectionId, {
          id: result.id,
          uri: result.uri,
          name: result.name,
          description: result.description,
          accessType: result.accessType,
          author: {
            id: author.id,
            name: author.name,
            handle: author.handle,
            avatarUrl: author.avatarUrl,
            bannerUrl: author.bannerUrl,
            description: author.description,
          },
          cardCount: result.cardCount,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          cardIds: result.cardIds,
        });
      });

      // Add follow status for collections if callingUserId is provided
      let collectionFollowStatusMap = new Map<string, boolean>();
      if (query.callingUserId && collectionIds.length > 0) {
        const followMapResult =
          await this.followsRepository.checkFollowingMultiple(
            query.callingUserId,
            collectionIds,
            FollowTargetType.COLLECTION,
          );

        if (followMapResult.isOk()) {
          collectionFollowStatusMap = followMapResult.value;
        }
      }

      // Transform activities to FeedItem
      const feedItems: FeedItem[] = [];
      for (const activity of feed.activities) {
        if (!activity.cardCollected) {
          continue; // Skip non-card-collected activities
        }

        const actor = actorProfiles.get(activity.actorId.value);
        const cardView = cardDataMap.get(activity.metadata.cardId);

        if (!actor || !cardView) {
          continue; // Skip if we can't hydrate required data
        }

        // Get card author
        const cardAuthor = cardAuthorProfiles.get(cardView.authorId);
        if (!cardAuthor) {
          continue; // Skip if we can't get card author
        }

        // Transform UrlCardView to UrlCardDTO
        const cardDTO = {
          id: cardView.id,
          type: 'URL' as const,
          url: cardView.url,
          uri: cardView.uri,
          cardContent: {
            url: cardView.cardContent.url,
            title: cardView.cardContent.title,
            description: cardView.cardContent.description,
            author: cardView.cardContent.author,
            publishedDate: cardView.cardContent.publishedDate?.toISOString(),
            siteName: cardView.cardContent.siteName,
            imageUrl: cardView.cardContent.imageUrl,
            type: cardView.cardContent.type,
            retrievedAt: cardView.cardContent.retrievedAt?.toISOString(),
            doi: cardView.cardContent.doi,
            isbn: cardView.cardContent.isbn,
          },
          libraryCount: cardView.libraryCount,
          urlLibraryCount: cardView.urlLibraryCount,
          urlInLibrary: cardView.urlInLibrary,
          createdAt: cardView.createdAt.toISOString(),
          updatedAt: cardView.updatedAt.toISOString(),
          author: cardAuthor,
          note: cardView.note,
        };

        const collections = (activity.metadata.collectionIds || [])
          .map((collectionId) => {
            const collection = collectionDataMap.get(collectionId);
            if (!collection) return null;

            return {
              collection,
              collectionId,
            };
          })
          .filter((item) => !!item)
          .filter((item) =>
            item.collection.cardIds.has(activity.metadata.cardId),
          )
          .map((item) => ({
            id: item.collection.id,
            uri: item.collection.uri,
            name: item.collection.name,
            description: item.collection.description,
            accessType: item.collection.accessType,
            author: item.collection.author,
            cardCount: item.collection.cardCount,
            createdAt: item.collection.createdAt,
            updatedAt: item.collection.updatedAt,
            isFollowing: collectionFollowStatusMap.get(item.collectionId),
          }));

        feedItems.push({
          id: activity.activityId.getStringValue(),
          user: actor,
          card: cardDTO,
          createdAt: activity.createdAt,
          collections,
        });
      }

      return ok({
        activities: feedItems,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(feed.totalCount / limit),
          totalCount: feed.totalCount,
          hasMore: feed.hasMore,
          limit,
          nextCursor: feed.nextCursor?.getStringValue(),
        },
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
