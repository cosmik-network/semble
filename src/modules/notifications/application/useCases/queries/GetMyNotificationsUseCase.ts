import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { INotificationRepository } from '../../../domain/INotificationRepository';
import { CuratorId } from '../../../../cards/domain/value-objects/CuratorId';
import { IProfileService } from '../../../../cards/domain/services/IProfileService';
import { NotificationItem } from '@semble/types';
import { CollectionAccessType } from '../../../../cards/domain/Collection';
import { ProfileEnricher } from '../../../../cards/application/services/ProfileEnricher';
import { IConnectionRepository } from '../../../../cards/domain/IConnectionRepository';
import { ConnectionId } from '../../../../cards/domain/value-objects/ConnectionId';

export interface GetMyNotificationsDTO {
  userId: string;
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

type NotificationItemDTO = NotificationItem;

export interface GetMyNotificationsResponseDTO {
  notifications: NotificationItemDTO[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
    limit: number;
  };
  unreadCount: number;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class GetMyNotificationsUseCase
  implements
    UseCase<
      GetMyNotificationsDTO,
      Result<
        GetMyNotificationsResponseDTO,
        ValidationError | AppError.UnexpectedError
      >
    >
{
  constructor(
    private notificationRepository: INotificationRepository,
    private profileService: IProfileService,
    private connectionRepository: IConnectionRepository,
  ) {}

  async execute(
    request: GetMyNotificationsDTO,
  ): Promise<
    Result<
      GetMyNotificationsResponseDTO,
      ValidationError | AppError.UnexpectedError
    >
  > {
    try {
      const userIdResult = CuratorId.create(request.userId);
      if (userIdResult.isErr()) {
        return err(
          new ValidationError(`Invalid user ID: ${userIdResult.error.message}`),
        );
      }

      const page = request.page || 1;
      const limit = request.limit || 20;

      // Use enriched query to get notifications with card and collection data
      const result = await this.notificationRepository.findByRecipientEnriched(
        userIdResult.value,
        {
          page,
          limit,
          unreadOnly: request.unreadOnly,
        },
      );

      if (result.isErr()) {
        return err(new ValidationError(result.error.message));
      }

      const { notifications, totalCount, hasMore, unreadCount } = result.value;

      // Collect all unique user IDs for bulk profile fetching
      const userIds = new Set<string>();
      notifications.forEach((notification) => {
        userIds.add(notification.actorUserId);
        if (notification.cardAuthorId) {
          userIds.add(notification.cardAuthorId);
        }
        notification.collections?.forEach((collection) => {
          userIds.add(collection.authorId);
        });
        notification.followCollections?.forEach((collection) => {
          userIds.add(collection.authorId);
        });
      });

      // Bulk fetch all profiles using ProfileEnricher
      const profileEnricher = new ProfileEnricher(this.profileService);
      const profileMapResult = await profileEnricher.buildProfileMap(
        Array.from(userIds),
        request.userId,
        {
          skipFailures: true, // Skip profiles that fail to load
          mapToUser: true, // Use full User DTO with isFollowing
        },
      );

      if (profileMapResult.isErr()) {
        return err(AppError.UnexpectedError.create(profileMapResult.error));
      }

      const profileMap = profileMapResult.value;

      // Transform enriched notifications to DTOs
      const notificationItems: NotificationItemDTO[] = [];

      for (const notification of notifications) {
        try {
          const actorProfile = profileMap.get(notification.actorUserId);

          if (!actorProfile) {
            // Skip notifications with missing actor profile
            continue;
          }

          // Handle connection notifications
          const metadata = notification as any;
          if (
            metadata.connectionId !== undefined &&
            notification.type === 'USER_CONNECTED_YOUR_URL'
          ) {
            // Get the connection data
            const connectionIdResult = ConnectionId.createFromString(
              metadata.connectionId,
            );
            if (connectionIdResult.isErr()) {
              continue; // Skip if invalid connection ID
            }

            const connectionResult = await this.connectionRepository.findById(
              connectionIdResult.value,
            );
            if (connectionResult.isErr() || !connectionResult.value) {
              continue; // Skip if connection not found
            }

            const connection = connectionResult.value;

            // Only handle URL connections
            if (!connection.source.url || !connection.target.url) {
              continue; // Skip if not both URLs
            }

            // Build connection notification item
            const connectionNotificationItem: NotificationItem = {
              id: notification.id,
              user: {
                id: actorProfile.id,
                name: actorProfile.name,
                handle: actorProfile.handle,
                avatarUrl: actorProfile.avatarUrl,
                bannerUrl: actorProfile.bannerUrl,
                description: actorProfile.description,
                isFollowing: actorProfile.isFollowing,
              },
              createdAt: notification.createdAt.toISOString(),
              type: notification.type as any,
              read: notification.read,
              connection: {
                connection: {
                  id: connection.connectionId.getStringValue(),
                  type: connection.type?.value,
                  note: connection.note?.value,
                  createdAt: connection.createdAt.toISOString(),
                  updatedAt: connection.updatedAt.toISOString(),
                  curator: actorProfile,
                },
                source: {
                  url: connection.source.url.value,
                  metadata: (() => {
                    const meta =
                      connection.sourceUrlMetadata?.props ||
                      connection.sourceUrlMetadata;
                    if (!meta) {
                      return { url: connection.source.url.value };
                    }
                    // Convert all dates to strings
                    return {
                      url: meta.url || connection.source.url.value,
                      title: meta.title,
                      description: meta.description,
                      author: meta.author,
                      publishedDate:
                        meta.publishedDate instanceof Date
                          ? meta.publishedDate.toISOString()
                          : meta.publishedDate,
                      siteName: meta.siteName,
                      imageUrl: meta.imageUrl,
                      type: meta.type,
                      retrievedAt:
                        meta.retrievedAt instanceof Date
                          ? meta.retrievedAt.toISOString()
                          : meta.retrievedAt,
                      doi: meta.doi,
                      isbn: meta.isbn,
                    };
                  })(),
                  urlLibraryCount: 0, // TODO: Could fetch if needed
                  urlInLibrary: undefined,
                  urlConnectionCount: undefined,
                  urlIsConnected: undefined,
                },
                target: {
                  url: connection.target.url.value,
                  metadata: (() => {
                    const meta =
                      connection.targetUrlMetadata?.props ||
                      connection.targetUrlMetadata;
                    if (!meta) {
                      return { url: connection.target.url.value };
                    }
                    // Convert all dates to strings
                    return {
                      url: meta.url || connection.target.url.value,
                      title: meta.title,
                      description: meta.description,
                      author: meta.author,
                      publishedDate:
                        meta.publishedDate instanceof Date
                          ? meta.publishedDate.toISOString()
                          : meta.publishedDate,
                      siteName: meta.siteName,
                      imageUrl: meta.imageUrl,
                      type: meta.type,
                      retrievedAt:
                        meta.retrievedAt instanceof Date
                          ? meta.retrievedAt.toISOString()
                          : meta.retrievedAt,
                      doi: meta.doi,
                      isbn: meta.isbn,
                    };
                  })(),
                  urlLibraryCount: 0, // TODO: Could fetch if needed
                  urlInLibrary: undefined,
                  urlConnectionCount: undefined,
                  urlIsConnected: undefined,
                },
              },
            };

            notificationItems.push(connectionNotificationItem);
            continue;
          }

          // Handle follow notifications (no card data)
          if (notification.followTargetType) {
            // Transform follow collections with author profiles
            const followCollections = (notification.followCollections || [])
              .map((collection) => {
                const collectionAuthorProfile = profileMap.get(
                  collection.authorId,
                );
                if (!collectionAuthorProfile) {
                  return null;
                }

                return {
                  id: collection.id,
                  uri: collection.uri,
                  name: collection.name,
                  author: {
                    id: collectionAuthorProfile.id,
                    name: collectionAuthorProfile.name,
                    handle: collectionAuthorProfile.handle,
                    avatarUrl: collectionAuthorProfile.avatarUrl,
                    bannerUrl: collectionAuthorProfile.bannerUrl,
                    description: collectionAuthorProfile.description,
                  },
                  description: collection.description,
                  accessType: collection.accessType as CollectionAccessType,
                  cardCount: collection.cardCount,
                  createdAt: collection.createdAt.toISOString(),
                  updatedAt: collection.updatedAt.toISOString(),
                };
              })
              .filter(
                (collection): collection is NonNullable<typeof collection> =>
                  collection !== null,
              );

            const notificationItem: NotificationItemDTO = {
              id: notification.id,
              user: {
                id: actorProfile.id,
                name: actorProfile.name,
                handle: actorProfile.handle,
                avatarUrl: actorProfile.avatarUrl,
                bannerUrl: actorProfile.bannerUrl,
                description: actorProfile.description,
                isFollowing: actorProfile.isFollowing,
              },
              createdAt: notification.createdAt.toISOString(),
              type: notification.type as any,
              read: notification.read,
              followTargetType: notification.followTargetType,
              followTargetId: notification.followTargetId,
              collections:
                followCollections.length > 0 ? followCollections : undefined,
            };

            notificationItems.push(notificationItem);
            continue;
          }

          // Handle card-based notifications
          const cardAuthorProfile = notification.cardAuthorId
            ? profileMap.get(notification.cardAuthorId)
            : undefined;

          if (!cardAuthorProfile || !notification.cardId) {
            // Skip notifications with missing card author profile or card data
            continue;
          }

          // Transform collections with author profiles
          const collections = (notification.collections || [])
            .map((collection) => {
              const collectionAuthorProfile = profileMap.get(
                collection.authorId,
              );
              if (!collectionAuthorProfile) {
                return null;
              }

              return {
                id: collection.id,
                uri: collection.uri,
                name: collection.name,
                author: {
                  id: collectionAuthorProfile.id,
                  name: collectionAuthorProfile.name,
                  handle: collectionAuthorProfile.handle,
                  avatarUrl: collectionAuthorProfile.avatarUrl,
                  bannerUrl: collectionAuthorProfile.bannerUrl,
                  description: collectionAuthorProfile.description,
                },
                description: collection.description,
                accessType: collection.accessType as CollectionAccessType,
                cardCount: collection.cardCount,
                createdAt: collection.createdAt.toISOString(),
                updatedAt: collection.updatedAt.toISOString(),
              };
            })
            .filter(
              (collection): collection is NonNullable<typeof collection> =>
                collection !== null,
            );

          const notificationItem: NotificationItemDTO = {
            id: notification.id,
            user: {
              id: actorProfile.id,
              name: actorProfile.name,
              handle: actorProfile.handle,
              avatarUrl: actorProfile.avatarUrl,
              bannerUrl: actorProfile.bannerUrl,
              description: actorProfile.description,
              isFollowing: actorProfile.isFollowing,
            },
            card: {
              id: notification.cardId,
              type: 'URL' as const,
              url: notification.cardUrl || '',
              uri: notification.cardUri,
              cardContent: {
                url: notification.cardUrl || '',
                title: notification.cardTitle,
                description: notification.cardDescription,
                author: notification.cardAuthor,
                publishedDate: notification.cardPublishedDate?.toISOString(),
                siteName: notification.cardSiteName,
                imageUrl: notification.cardImageUrl,
                type: notification.cardType,
                retrievedAt: notification.cardRetrievedAt?.toISOString(),
                doi: notification.cardDoi,
                isbn: notification.cardIsbn,
              },
              libraryCount: notification.cardLibraryCount || 0,
              urlLibraryCount: notification.cardUrlLibraryCount || 0,
              urlInLibrary: notification.cardUrlInLibrary,
              urlConnectionCount: notification.cardUrlConnectionCount,
              urlIsConnected: notification.cardUrlIsConnected,
              createdAt: notification.cardCreatedAt?.toISOString() || '',
              updatedAt: notification.cardUpdatedAt?.toISOString() || '',
              author: {
                id: cardAuthorProfile.id,
                name: cardAuthorProfile.name,
                handle: cardAuthorProfile.handle,
                avatarUrl: cardAuthorProfile.avatarUrl,
                bannerUrl: cardAuthorProfile.bannerUrl,
                description: cardAuthorProfile.description,
              },
              note: notification.cardNote,
            },
            createdAt: notification.createdAt.toISOString(),
            collections,
            type: notification.type as any, // Cast to NotificationType enum
            read: notification.read,
          };

          notificationItems.push(notificationItem);
        } catch (error) {
          // Skip this notification if there's an error processing it
          console.error('Error processing notification:', error);
          continue;
        }
      }

      const totalPages = Math.ceil(totalCount / limit);

      return ok({
        notifications: notificationItems,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasMore,
          limit,
        },
        unreadCount,
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
