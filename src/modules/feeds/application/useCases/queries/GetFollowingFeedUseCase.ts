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
import { IConnectionRepository } from 'src/modules/cards/domain/IConnectionRepository';
import { CollectionId } from 'src/modules/cards/domain/value-objects/CollectionId';
import { ConnectionId } from 'src/modules/cards/domain/value-objects/ConnectionId';
import { UrlType } from '../../../../cards/domain/value-objects/UrlType';
import {
  GetGlobalFeedResponse,
  FeedItem,
  ActivitySource,
  CardCollectedFeedItem,
  ConnectionCreatedFeedItem,
} from '@semble/types';
import { CollectionAccessType } from '../../../../cards/domain/Collection';
import { ProfileEnricher } from '../../../../cards/application/services/ProfileEnricher';
import {
  CardCollectedMetadata,
  ConnectionCreatedMetadata,
} from '../../../domain/FeedActivity';
import { ActivityType as ActivityTypeEnum } from '@semble/types';

export interface GetFollowingFeedQuery {
  callingUserId: string;
  page?: number;
  limit?: number;
  beforeActivityId?: string; // For cursor-based pagination
  urlType?: string; // Filter by URL type
  source?: ActivitySource; // Filter by activity source
  activityTypes?: string[]; // Filter by activity types
}

// Use the shared API type directly
export type GetFollowingFeedResult = GetGlobalFeedResponse;

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class GetFollowingFeedUseCase
  implements
    UseCase<
      GetFollowingFeedQuery,
      Result<GetFollowingFeedResult, ValidationError | AppError.UnexpectedError>
    >
{
  constructor(
    private feedRepository: IFeedRepository,
    private profileService: IProfileService,
    private cardQueryRepository: ICardQueryRepository,
    private collectionRepository: ICollectionRepository,
    private connectionRepository: IConnectionRepository,
  ) {}

  async execute(
    query: GetFollowingFeedQuery,
  ): Promise<
    Result<GetFollowingFeedResult, ValidationError | AppError.UnexpectedError>
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

      // Parse activityTypes if provided
      let activityTypes: ActivityTypeEnum[] | undefined;
      if (query.activityTypes && query.activityTypes.length > 0) {
        activityTypes = query.activityTypes as ActivityTypeEnum[];
      }

      // Fetch activities from repository for the user's following feed
      const feedResult = await this.feedRepository.getFollowingFeed(
        query.callingUserId,
        {
          page,
          limit,
          beforeActivityId,
          urlType,
          source: query.source,
          activityTypes,
        },
      );

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
            .map(
              (activity) => (activity.metadata as CardCollectedMetadata).cardId,
            ),
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
                activity.cardCollected &&
                (activity.metadata as CardCollectedMetadata).collectionIds,
            )
            .flatMap(
              (activity) =>
                (activity.metadata as CardCollectedMetadata).collectionIds ||
                [],
            ),
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

      // Batch fetch connection data for CONNECTION_CREATED activities
      const connectionActivities = feed.activities.filter(
        (activity) => activity.connectionCreated,
      );

      let connectionDataMap = new Map<
        string,
        {
          id: string;
          type?: string;
          note?: string;
          createdAt: string;
          updatedAt: string;
          curatorId: string;
          sourceUrl: string;
          sourceUrlMetadata?: any;
          targetUrl: string;
          targetUrlMetadata?: any;
        }
      >();
      let connectionCuratorProfiles = new Map<string, any>();

      if (connectionActivities.length > 0) {
        // Get unique connection IDs
        const connectionIds = [
          ...new Set(
            connectionActivities.map(
              (activity) =>
                (activity.metadata as ConnectionCreatedMetadata).connectionId,
            ),
          ),
        ];

        // Batch fetch connections
        const connectionIdObjects: ConnectionId[] = [];
        for (const connectionId of connectionIds) {
          const connectionIdResult =
            ConnectionId.createFromString(connectionId);
          if (connectionIdResult.isOk()) {
            connectionIdObjects.push(connectionIdResult.value);
          }
        }

        const connectionsResult =
          await this.connectionRepository.findByIds(connectionIdObjects);

        if (connectionsResult.isErr()) {
          return err(AppError.UnexpectedError.create(connectionsResult.error));
        }

        const connections = connectionsResult.value;

        // Build connection data map
        for (const connection of connections) {
          const sourceUrl = connection.source.url?.value;
          const targetUrl = connection.target.url?.value;

          // Only include connections where both source and target are URLs
          if (sourceUrl && targetUrl) {
            connectionDataMap.set(connection.connectionId.getStringValue(), {
              id: connection.connectionId.getStringValue(),
              type: connection.type?.value,
              note: connection.note?.value,
              createdAt: connection.createdAt.toISOString(),
              updatedAt: connection.updatedAt.toISOString(),
              curatorId: connection.curatorId.value,
              sourceUrl,
              sourceUrlMetadata: connection.sourceUrlMetadata,
              targetUrl,
              targetUrlMetadata: connection.targetUrlMetadata,
            });
          }
        }

        // Get unique curator IDs for connections
        const connectionCuratorIds = [
          ...new Set(
            Array.from(connectionDataMap.values()).map((c) => c.curatorId),
          ),
        ];

        // Batch fetch curator profiles
        const connectionCuratorProfilesResult =
          await profileEnricher.buildProfileMap(
            connectionCuratorIds,
            query.callingUserId,
            {
              skipFailures: true,
              mapToUser: false,
            },
          );

        if (connectionCuratorProfilesResult.isErr()) {
          return err(
            AppError.UnexpectedError.create(
              connectionCuratorProfilesResult.error,
            ),
          );
        }

        connectionCuratorProfiles = connectionCuratorProfilesResult.value;
      }

      // Transform activities to FeedItem in chronological order
      const feedItems: FeedItem[] = [];
      for (const activity of feed.activities) {
        const actor = actorProfiles.get(activity.actorId.value);
        if (!actor) {
          continue; // Skip if we can't get actor
        }

        if (activity.cardCollected) {
          // Handle CARD_COLLECTED activity
          const metadata = activity.metadata as CardCollectedMetadata;
          const cardView = cardDataMap.get(metadata.cardId);

          if (!cardView) {
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
            urlConnectionCount: cardView.urlConnectionCount,
            urlIsConnected: cardView.urlIsConnected,
            createdAt: cardView.createdAt.toISOString(),
            updatedAt: cardView.updatedAt.toISOString(),
            author: cardAuthor,
            note: cardView.note,
          };

          const collections = (metadata.collectionIds || [])
            .map((collectionId) => collectionDataMap.get(collectionId))
            .filter((collection) => !!collection)
            .filter((collection) => collection.cardIds.has(metadata.cardId))
            .map((collection) => ({
              id: collection.id,
              uri: collection.uri,
              name: collection.name,
              description: collection.description,
              accessType: collection.accessType,
              author: collection.author,
              cardCount: collection.cardCount,
              createdAt: collection.createdAt,
              updatedAt: collection.updatedAt,
            }));

          feedItems.push({
            id: activity.activityId.getStringValue(),
            activityType: 'CARD_COLLECTED' as const,
            user: actor,
            card: cardDTO,
            createdAt: activity.createdAt,
            collections,
          } as CardCollectedFeedItem);
        } else if (activity.connectionCreated) {
          // Handle CONNECTION_CREATED activity
          const metadata = activity.metadata as ConnectionCreatedMetadata;
          const connectionData = connectionDataMap.get(metadata.connectionId);

          if (!connectionData) {
            continue; // Skip if we can't hydrate required data
          }

          const curator = connectionCuratorProfiles.get(
            connectionData.curatorId,
          );
          if (!curator) {
            continue; // Skip if we can't get curator profile
          }

          // Build UrlView for source and target
          // Extract metadata props to avoid the value object wrapper
          const sourceUrlView = {
            url: connectionData.sourceUrl,
            metadata: connectionData.sourceUrlMetadata?.props ||
              connectionData.sourceUrlMetadata || {
                url: connectionData.sourceUrl,
              },
            urlLibraryCount: 0, // TODO: Fetch from DB if needed
            urlInLibrary: undefined,
            urlConnectionCount: undefined,
            urlIsConnected: undefined,
          };

          const targetUrlView = {
            url: connectionData.targetUrl,
            metadata: connectionData.targetUrlMetadata?.props ||
              connectionData.targetUrlMetadata || {
                url: connectionData.targetUrl,
              },
            urlLibraryCount: 0, // TODO: Fetch from DB if needed
            urlInLibrary: undefined,
            urlConnectionCount: undefined,
            urlIsConnected: undefined,
          };

          feedItems.push({
            id: activity.activityId.getStringValue(),
            activityType: 'CONNECTION_CREATED' as const,
            user: actor,
            createdAt: activity.createdAt,
            connection: {
              connection: {
                id: connectionData.id,
                type: connectionData.type,
                note: connectionData.note,
                createdAt: connectionData.createdAt,
                updatedAt: connectionData.updatedAt,
                curator,
              },
              source: sourceUrlView,
              target: targetUrlView,
            },
          } as ConnectionCreatedFeedItem);
        }
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
