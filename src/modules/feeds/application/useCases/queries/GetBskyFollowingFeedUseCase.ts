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
  UserAnnotatedUrlFeedItem,
} from '@semble/types';
import { CollectionAccessType } from '../../../../cards/domain/Collection';
import { IFollowsRepository } from 'src/modules/user/domain/repositories/IFollowsRepository';
import { IBskyFollowsService } from 'src/modules/user/application/services/IBskyFollowsService';
import { FollowTargetType } from 'src/modules/user/domain/value-objects/FollowTargetType';
import { ProfileEnricher } from '../../../../cards/application/services/ProfileEnricher';
import {
  CardCollectedMetadata,
  ConnectionCreatedMetadata,
  UserAnnotatedUrlMetadata,
} from '../../../domain/FeedActivity';
import { ActivityType as ActivityTypeEnum } from '@semble/types';
import { toAnnotationCardDTO } from '../../services/AnnotationCardDto';
import {
  ConnectionFeedData,
  hydrateConnectionFeedData,
} from '../../services/ConnectionFeedData';
import { IIdentityResolutionService } from 'src/modules/atproto/domain/services/IIdentityResolutionService';
import { DIDOrHandle } from 'src/modules/atproto/domain/DIDOrHandle';

export interface GetBskyFollowingFeedQuery {
  callingUserId?: string; // Viewer, if authenticated
  identifier?: string; // DID or handle whose Bluesky follows define the feed
  page?: number;
  limit?: number;
  beforeActivityId?: string; // For cursor-based pagination
  urlType?: string; // Filter by URL type
  source?: ActivitySource; // Filter by activity source
  activityTypes?: string[]; // Filter by activity types
  includeKnownBots?: boolean; // Include known bots in feed (default: false)
}

// Use the shared API type directly
export type GetBskyFollowingFeedResult = GetGlobalFeedResponse;

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Activity feed scoped to the Semble users a subject follows on Bluesky.
 *
 * Identical to the global feed except the actor filter isn't supplied by the
 * caller — it's resolved from the subject's Bluesky follows (intersected with
 * Semble users) and passed to the feed repository as actorIds.
 *
 * The subject is the `identifier` query param when given, otherwise the
 * authenticated caller. The caller remains the viewer for hydration (library
 * membership, follow status), so viewing someone else's feed shows their
 * follows through your own eyes.
 */
export class GetBskyFollowingFeedUseCase implements UseCase<
  GetBskyFollowingFeedQuery,
  Result<GetBskyFollowingFeedResult, ValidationError | AppError.UnexpectedError>
> {
  constructor(
    private feedRepository: IFeedRepository,
    private profileService: IProfileService,
    private cardQueryRepository: ICardQueryRepository,
    private collectionRepository: ICollectionRepository,
    private connectionRepository: IConnectionRepository,
    private followsRepository: IFollowsRepository,
    private bskyFollowsService: IBskyFollowsService,
    private identityResolutionService: IIdentityResolutionService,
  ) {}

  async execute(
    query: GetBskyFollowingFeedQuery,
  ): Promise<
    Result<
      GetBskyFollowingFeedResult,
      ValidationError | AppError.UnexpectedError
    >
  > {
    try {
      // Resolve the subject whose Bluesky follows define this feed: the
      // explicit identifier if given, otherwise the authenticated caller.
      let subjectDid: string;
      if (query.identifier) {
        const identifierResult = DIDOrHandle.create(query.identifier);
        if (identifierResult.isErr()) {
          return err(
            new ValidationError(
              `Invalid identifier: ${identifierResult.error.message}`,
            ),
          );
        }

        const didResult = await this.identityResolutionService.resolveToDID(
          identifierResult.value,
        );
        if (didResult.isErr()) {
          return err(
            new ValidationError(
              `Could not resolve identifier: ${didResult.error.message}`,
            ),
          );
        }

        subjectDid = didResult.value.value;
      } else if (query.callingUserId) {
        subjectDid = query.callingUserId;
      } else {
        return err(
          new ValidationError('identifier is required when unauthenticated'),
        );
      }

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

      // Resolve the Semble users the subject follows on Bluesky. These become
      // the actor filter for the feed.
      const followedResult =
        await this.bskyFollowsService.getSembleUsersFollowedOnBsky(
          subjectDid,
          undefined,
          query.callingUserId,
        );
      if (followedResult.isErr()) {
        return err(AppError.UnexpectedError.create(followedResult.error));
      }

      const bskyFollowedDids = Array.from(followedResult.value.keys()).filter(
        (did) => did !== subjectDid,
      );

      // No Semble users followed on Bluesky → empty feed. Returning early
      // avoids passing an empty actorIds array, which the repository treats
      // as "no filter" (i.e. the full global feed).
      if (bskyFollowedDids.length === 0) {
        return ok({
          activities: [],
          pagination: {
            currentPage: page,
            hasMore: false,
            limit,
          },
        });
      }

      // Fetch activities from repository
      const feedResult = await this.feedRepository.getGlobalFeed({
        page,
        limit,
        beforeActivityId,
        urlType,
        source: query.source,
        activityTypes,
        actorIds: bskyFollowedDids,
        includeKnownBots: query.includeKnownBots,
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

      // Annotation card views: the ids batched inside USER_ANNOTATED_URL
      // activities, plus CARD_COLLECTED activities whose card is an
      // annotation (the URL view lookup above doesn't resolve those)
      const annotationIds = new Set<string>();
      for (const activity of feed.activities) {
        if (activity.userAnnotatedUrl) {
          const metadata = activity.metadata as UserAnnotatedUrlMetadata;
          metadata.annotationIds.forEach((id) => annotationIds.add(id));
        } else if (activity.cardCollected) {
          const metadata = activity.metadata as CardCollectedMetadata;
          if (!cardDataMap.has(metadata.cardId)) {
            annotationIds.add(metadata.cardId);
          }
        }
      }
      const annotationViewMap =
        await this.cardQueryRepository.getBatchAnnotationCardViews([
          ...annotationIds,
        ]);

      // Get unique card author IDs
      const cardAuthorIds = [
        ...new Set([
          ...Array.from(cardDataMap.values()).map((card) => card.authorId),
          ...Array.from(annotationViewMap.values()).map(
            (card) => card.authorId,
          ),
        ]),
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

      // Batch fetch connection data for CONNECTION_CREATED activities
      const connectionActivities = feed.activities.filter(
        (activity) => activity.connectionCreated,
      );

      let connectionDataMap = new Map<string, ConnectionFeedData>();
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

        // Hydrate typed endpoints (URL or annotation card); the shared
        // annotation view and card author maps are extended in place
        connectionDataMap = await hydrateConnectionFeedData(
          connectionsResult.value,
          this.cardQueryRepository,
          profileEnricher,
          annotationViewMap,
          cardAuthorProfiles,
          query.callingUserId,
        );

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
          // Collected annotation cards don't appear in the URL view map
          const annotationView = cardView
            ? undefined
            : annotationViewMap.get(metadata.cardId);

          if (!cardView && !annotationView) {
            continue; // Skip if we can't hydrate required data
          }

          // Get card author
          const cardAuthor = cardAuthorProfiles.get(
            (cardView ?? annotationView)!.authorId,
          );
          if (!cardAuthor) {
            continue; // Skip if we can't get card author
          }

          // Transform UrlCardView to UrlCardDTO, or AnnotationCardView to
          // the annotation card shape
          const cardDTO = cardView
            ? {
                id: cardView.id,
                type: 'URL' as const,
                url: cardView.url,
                uri: cardView.uri,
                cardContent: {
                  url: cardView.cardContent.url,
                  title: cardView.cardContent.title,
                  description: cardView.cardContent.description,
                  author: cardView.cardContent.author,
                  publishedDate:
                    cardView.cardContent.publishedDate?.toISOString(),
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
              }
            : toAnnotationCardDTO(annotationView!, cardAuthor);

          const collections = (metadata.collectionIds || [])
            .map((collectionId) => {
              const collection = collectionDataMap.get(collectionId);
              if (!collection) return null;

              return {
                collection,
                collectionId,
              };
            })
            .filter((item) => !!item)
            .filter((item) => item.collection.cardIds.has(metadata.cardId))
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
            activityType: ActivityTypeEnum.CARD_COLLECTED,
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
              source: connectionData.source,
              target: connectionData.target,
            },
          } as ConnectionCreatedFeedItem);
        } else if (activity.userAnnotatedUrl) {
          // Handle USER_ANNOTATED_URL activity — batched annotations on one URL
          const metadata = activity.metadata as UserAnnotatedUrlMetadata;

          const annotations = metadata.annotationIds
            .map((annotationId) => {
              const view = annotationViewMap.get(annotationId);
              if (!view) return null;
              const author = cardAuthorProfiles.get(view.authorId);
              if (!author) return null;
              return toAnnotationCardDTO(view, author);
            })
            .filter(
              (annotation): annotation is NonNullable<typeof annotation> =>
                annotation !== null,
            );

          if (annotations.length === 0) {
            continue; // Skip if we can't hydrate any annotations
          }

          feedItems.push({
            id: activity.activityId.getStringValue(),
            activityType: ActivityTypeEnum.USER_ANNOTATED_URL,
            user: actor,
            createdAt: activity.createdAt,
            url: metadata.url,
            annotations,
          } as UserAnnotatedUrlFeedItem);
        }
      }

      return ok({
        activities: feedItems,
        pagination: {
          currentPage: page,
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
