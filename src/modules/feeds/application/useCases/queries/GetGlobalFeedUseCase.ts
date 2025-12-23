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
import { UrlType } from '../../../cards/domain/value-objects/UrlType';
import { GetGlobalFeedResponse, FeedItem } from '@semble/types';

export interface GetGlobalFeedQuery {
  callingUserId?: string;
  page?: number;
  limit?: number;
  beforeActivityId?: string; // For cursor-based pagination
  urlType?: string; // Filter by URL type
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
      });

      if (feedResult.isErr()) {
        return err(AppError.UnexpectedError.create(feedResult.error));
      }

      const feed = feedResult.value;

      // Get unique actor IDs for profile enrichment
      const actorIds = [
        ...new Set(feed.activities.map((activity) => activity.actorId.value)),
      ];

      // Fetch profiles for all actors
      const actorProfiles = new Map<
        string,
        {
          id: string;
          name: string;
          handle: string;
          avatarUrl?: string;
          description?: string;
        }
      >();
      const profileResults = await Promise.all(
        actorIds.map((actorId) => this.profileService.getProfile(actorId)),
      );

      profileResults.forEach((profileResult, idx) => {
        const actorId = actorIds[idx];
        if (!actorId) {
          return;
        }
        if (profileResult.isOk()) {
          const profile = profileResult.value;
          actorProfiles.set(actorId, {
            id: profile.id,
            name: profile.name,
            handle: profile.handle,
            avatarUrl: profile.avatarUrl,
            description: profile.bio,
          });
        } else {
          // If profile fetch fails, create a fallback
          actorProfiles.set(actorId, {
            id: actorId,
            name: 'Unknown User',
            handle: actorId,
          });
        }
      });

      // Get unique card IDs for hydration
      const cardIds = [
        ...new Set(
          feed.activities
            .filter((activity) => activity.cardCollected)
            .map((activity) => activity.metadata.cardId),
        ),
      ];

      // Hydrate card data and fetch card authors
      const cardDataMap = new Map<string, UrlCardView>();
      const cardViews = await Promise.all(
        cardIds.map((cardId) =>
          this.cardQueryRepository.getUrlCardView(cardId, query.callingUserId),
        ),
      );
      cardIds.forEach((cardId, idx) => {
        const cardView = cardViews[idx];
        if (cardView) {
          cardDataMap.set(cardId, cardView);
        }
      });

      // Get unique card author IDs
      const cardAuthorIds = [
        ...new Set(
          Array.from(cardDataMap.values()).map((card) => card.authorId),
        ),
      ];

      // Fetch card author profiles
      const cardAuthorProfiles = new Map<
        string,
        {
          id: string;
          name: string;
          handle: string;
          avatarUrl?: string;
          description?: string;
        }
      >();
      const cardAuthorResults = await Promise.all(
        cardAuthorIds.map((authorId) =>
          this.profileService.getProfile(authorId, query.callingUserId),
        ),
      );

      cardAuthorResults.forEach((profileResult, idx) => {
        const authorId = cardAuthorIds[idx];
        if (!authorId) {
          return;
        }
        if (profileResult.isOk()) {
          const profile = profileResult.value;
          cardAuthorProfiles.set(authorId, {
            id: profile.id,
            name: profile.name,
            handle: profile.handle,
            avatarUrl: profile.avatarUrl,
            description: profile.bio,
          });
        }
      });

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

      const collectionDataMap = new Map<
        string,
        {
          id: string;
          uri?: string;
          name: string;
          description?: string;
          author: {
            id: string;
            name: string;
            handle: string;
            avatarUrl?: string;
            description?: string;
          };
          cardCount: number;
          createdAt: string;
          updatedAt: string;
          cardIds: Set<string>; // Track which cards are in this collection
        }
      >();
      // Fetch all collections in parallel using Promise.all
      const collectionResults = await Promise.all(
        collectionIds.map(async (collectionId) => {
          const collectionIdResult =
            CollectionId.createFromString(collectionId);
          if (collectionIdResult.isErr()) {
            return null; // Skip invalid collection IDs
          }
          const collectionResult = await this.collectionRepository.findById(
            collectionIdResult.value,
          );
          if (collectionResult.isErr() || !collectionResult.value) {
            return null;
          }

          const collection = collectionResult.value;

          // Get author profile
          const authorProfileResult = await this.profileService.getProfile(
            collection.authorId.value,
            query.callingUserId,
          );
          if (authorProfileResult.isErr()) {
            return null;
          }

          const authorProfile = authorProfileResult.value;
          const uri = collection.publishedRecordId?.uri;

          // Get the card IDs in this collection
          const cardIds = new Set(
            collection.cardIds.map((cardId) => cardId.getStringValue()),
          );

          return {
            id: collection.collectionId.getStringValue(),
            uri,
            name: collection.name.toString(),
            description: collection.description?.toString(),
            author: {
              id: authorProfile.id,
              name: authorProfile.name,
              handle: authorProfile.handle,
              avatarUrl: authorProfile.avatarUrl,
              description: authorProfile.bio,
            },
            cardCount: collection.cardCount,
            createdAt: collection.createdAt.toISOString(),
            updatedAt: collection.updatedAt.toISOString(),
            cardIds,
            collectionId,
          };
        }),
      );

      collectionResults.forEach((result) => {
        if (result) {
          collectionDataMap.set(result.collectionId, {
            id: result.id,
            uri: result.uri,
            name: result.name,
            description: result.description,
            author: result.author,
            cardCount: result.cardCount,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            cardIds: result.cardIds,
          });
        }
      });

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
          cardContent: cardView.cardContent,
          libraryCount: cardView.libraryCount,
          urlLibraryCount: cardView.urlLibraryCount,
          urlInLibrary: cardView.urlInLibrary,
          createdAt: cardView.createdAt.toISOString(),
          updatedAt: cardView.updatedAt.toISOString(),
          author: cardAuthor,
          note: cardView.note,
        };

        const collections = (activity.metadata.collectionIds || [])
          .map((collectionId) => collectionDataMap.get(collectionId))
          .filter((collection) => !!collection)
          .filter((collection) =>
            collection.cardIds.has(activity.metadata.cardId),
          )
          .map((collection) => ({
            id: collection.id,
            uri: collection.uri,
            name: collection.name,
            description: collection.description,
            author: collection.author,
            cardCount: collection.cardCount,
            createdAt: collection.createdAt,
            updatedAt: collection.updatedAt,
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
