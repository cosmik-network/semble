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
import {
  ICardQueryRepository,
  AnnotationCardView,
} from '../../../../cards/domain/ICardQueryRepository';

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

/** Stored URL metadata (domain props or raw JSONB) as the wire DTO */
function toNotificationUrlMetadata(meta: any, fallbackUrl: string) {
  if (!meta) {
    return { url: fallbackUrl };
  }
  // Convert all dates to strings
  return {
    url: meta.url || fallbackUrl,
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
}

/**
 * Selector rows as the wire shape — only TextQuoteSelectors exist today, so
 * the literal is safe.
 */
function toWireSelectors(
  selectors: Array<{
    type: string;
    exact: string;
    prefix?: string;
    suffix?: string;
  }>,
) {
  return selectors.map((selector) => ({
    ...selector,
    type: 'TextQuoteSelector' as const,
  }));
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class GetMyNotificationsUseCase implements UseCase<
  GetMyNotificationsDTO,
  Result<
    GetMyNotificationsResponseDTO,
    ValidationError | AppError.UnexpectedError
  >
> {
  constructor(
    private notificationRepository: INotificationRepository,
    private profileService: IProfileService,
    private connectionRepository: IConnectionRepository,
    private cardQueryRepository: ICardQueryRepository,
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
        if (notification.mentionCollection) {
          userIds.add(notification.mentionCollection.authorId);
        }
        notification.annotations?.forEach((annotation) => {
          userIds.add(annotation.authorId);
        });
      });

      // Batch fetch all connections for connection notifications — CARD
      // endpoints resolve to annotation cards whose authors also need
      // profiles, so this runs before the profile map is built
      const connectionNotifications = notifications.filter(
        (n) =>
          (n as any).connectionId !== undefined &&
          (n.type === 'USER_CONNECTED_YOUR_URL' ||
            n.type === 'USER_CONNECTED_YOUR_POST' ||
            n.type === 'USER_CONNECTED_YOUR_COLLECTION' ||
            n.type === 'USER_CONNECTED_YOUR_ANNOTATION' ||
            n.type === 'USER_CONNECTED_SUBSCRIBED_COLLECTION' ||
            n.type === 'SUBSCRIBED_USER_MADE_CONNECTION' ||
            n.type === 'USER_MENTIONED_YOU'),
      );

      const connectionMap = new Map<string, any>();
      const connectionUrlStatsMap = new Map<
        string,
        {
          urlLibraryCount: number;
          urlInLibrary?: boolean;
          urlConnectionCount?: number;
          urlIsConnected?: boolean;
        }
      >();
      const annotationViewMap = new Map<string, AnnotationCardView>();

      if (connectionNotifications.length > 0) {
        const connectionIds: ConnectionId[] = [];
        for (const notification of connectionNotifications) {
          const metadata = notification as any;
          const connectionIdResult = ConnectionId.createFromString(
            metadata.connectionId,
          );
          if (connectionIdResult.isOk()) {
            connectionIds.push(connectionIdResult.value);
          }
        }

        if (connectionIds.length > 0) {
          const connectionsResult =
            await this.connectionRepository.findByIds(connectionIds);
          if (connectionsResult.isOk()) {
            const connections = connectionsResult.value;
            // Build connection map
            for (const connection of connections) {
              connectionMap.set(
                connection.connectionId.getStringValue(),
                connection,
              );
            }

            // Resolve CARD endpoints to annotation card views
            const connectionCardIds = new Set<string>();
            connections.forEach((connection) => {
              if (connection.source.cardId) {
                connectionCardIds.add(
                  connection.source.cardId.getStringValue(),
                );
              }
              if (connection.target.cardId) {
                connectionCardIds.add(
                  connection.target.cardId.getStringValue(),
                );
              }
            });
            if (connectionCardIds.size > 0) {
              const annotationViews =
                await this.cardQueryRepository.getBatchAnnotationCardViews(
                  Array.from(connectionCardIds),
                );
              annotationViews.forEach((view, cardId) => {
                annotationViewMap.set(cardId, view);
                userIds.add(view.authorId);
              });
            }

            // Collect all unique URLs from URL endpoints
            const connectionUrls = Array.from(
              new Set(
                connections.flatMap((c) =>
                  [c.source.url?.value, c.target.url?.value].filter(
                    (url): url is string => Boolean(url),
                  ),
                ),
              ),
            );

            // Fetch URL stats
            if (connectionUrls.length > 0) {
              const connectionUrlLibraryInfoMap =
                await this.cardQueryRepository.getBatchUrlLibraryInfo(
                  connectionUrls,
                  request.userId,
                );

              // Build stats map
              connectionUrls.forEach((url) => {
                const urlInfo = connectionUrlLibraryInfoMap.get(url);
                if (urlInfo) {
                  connectionUrlStatsMap.set(url, {
                    urlLibraryCount: urlInfo.urlLibraryCount,
                    urlInLibrary: urlInfo.urlInLibrary,
                    urlConnectionCount: urlInfo.urlConnectionCount,
                    urlIsConnected: urlInfo.urlIsConnected,
                  });
                }
              });
            }
          }
        }
      }

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
            (notification.type === 'USER_CONNECTED_YOUR_URL' ||
              notification.type === 'USER_CONNECTED_YOUR_POST' ||
              notification.type === 'USER_CONNECTED_YOUR_COLLECTION' ||
              notification.type === 'USER_CONNECTED_YOUR_ANNOTATION' ||
              notification.type === 'USER_CONNECTED_SUBSCRIBED_COLLECTION' ||
              notification.type === 'SUBSCRIBED_USER_MADE_CONNECTION' ||
              notification.type === 'USER_MENTIONED_YOU')
          ) {
            // Get the connection from the pre-fetched map
            const connection = connectionMap.get(metadata.connectionId);
            if (!connection) {
              continue; // Skip if connection not found
            }

            // Endpoints as the notification item shape: URL endpoints carry
            // metadata + viewer stats, CARD endpoints carry the annotation
            // card in full
            const buildUrlEndpoint = (url: string, rawMeta: any) => {
              const stats = connectionUrlStatsMap.get(url) || {
                urlLibraryCount: 0,
                urlInLibrary: undefined,
                urlConnectionCount: undefined,
                urlIsConnected: undefined,
              };

              return {
                type: 'URL' as const,
                url,
                metadata: toNotificationUrlMetadata(rawMeta, url),
                urlLibraryCount: stats.urlLibraryCount,
                urlInLibrary: stats.urlInLibrary,
                urlConnectionCount: stats.urlConnectionCount,
                urlIsConnected: stats.urlIsConnected,
              };
            };

            const buildCardEndpoint = (cardId: string) => {
              const view = annotationViewMap.get(cardId);
              if (!view) return null;
              const author = profileMap.get(view.authorId);
              if (!author) return null;

              return {
                type: 'CARD' as const,
                card: {
                  id: view.id,
                  type: 'ANNOTATION' as const,
                  url: view.url,
                  uri: view.uri,
                  libraryCount: view.libraryCount,
                  connectionCount: view.connectionCount,
                  selectors: toWireSelectors(view.selectors),
                  note: view.note,
                  createdAt: view.createdAt.toISOString(),
                  updatedAt: view.updatedAt.toISOString(),
                  author,
                },
              };
            };

            const sourceEndpoint = connection.source.url
              ? buildUrlEndpoint(
                  connection.source.url.value,
                  connection.sourceUrlMetadata?.props ||
                    connection.sourceUrlMetadata,
                )
              : connection.source.cardId
                ? buildCardEndpoint(connection.source.cardId.getStringValue())
                : null;
            const targetEndpoint = connection.target.url
              ? buildUrlEndpoint(
                  connection.target.url.value,
                  connection.targetUrlMetadata?.props ||
                    connection.targetUrlMetadata,
                )
              : connection.target.cardId
                ? buildCardEndpoint(connection.target.cardId.getStringValue())
                : null;

            // Skip if either endpoint can't be displayed
            if (!sourceEndpoint || !targetEndpoint) {
              continue;
            }

            // Build connection notification item. mentionSource rides along
            // via spread so connection items (which have no such field) and
            // connection mentions (which require it) both typecheck.
            const connectionNotificationItem: NotificationItem = {
              ...(notification.mentionSource
                ? { mentionSource: notification.mentionSource }
                : {}),
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
                source: sourceEndpoint,
                target: targetEndpoint,
              },
            };

            notificationItems.push(connectionNotificationItem);
            continue;
          }

          // Handle collection-description mention notifications
          if (
            notification.mentionSource === 'COLLECTION' &&
            notification.mentionCollection
          ) {
            const collectionAuthorProfile = profileMap.get(
              notification.mentionCollection.authorId,
            );
            if (!collectionAuthorProfile) {
              continue;
            }

            notificationItems.push({
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
              mentionSource: notification.mentionSource,
              mentionCollection: {
                id: notification.mentionCollection.id,
                uri: notification.mentionCollection.uri,
                name: notification.mentionCollection.name,
                description: notification.mentionCollection.description,
                accessType: notification.mentionCollection
                  .accessType as CollectionAccessType,
                cardCount: notification.mentionCollection.cardCount,
                createdAt:
                  notification.mentionCollection.createdAt.toISOString(),
                updatedAt:
                  notification.mentionCollection.updatedAt.toISOString(),
                author: {
                  id: collectionAuthorProfile.id,
                  name: collectionAuthorProfile.name,
                  handle: collectionAuthorProfile.handle,
                  avatarUrl: collectionAuthorProfile.avatarUrl,
                  bannerUrl: collectionAuthorProfile.bannerUrl,
                  description: collectionAuthorProfile.description,
                },
              },
            } as NotificationItemDTO);
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

          // Handle USER_ANNOTATED_YOUR_URL batches — the annotations were
          // pre-enriched; they only need author profiles
          if (notification.annotations) {
            const annotations = notification.annotations
              .map((entry) => {
                const author = profileMap.get(entry.authorId);
                if (!author) return null;

                return {
                  id: entry.cardId,
                  type: 'ANNOTATION' as const,
                  url: entry.url,
                  uri: entry.uri,
                  libraryCount: entry.libraryCount,
                  selectors: toWireSelectors(entry.selectors),
                  note: entry.note,
                  createdAt: entry.createdAt.toISOString(),
                  updatedAt: entry.updatedAt.toISOString(),
                  author,
                };
              })
              .filter(
                (annotation): annotation is NonNullable<typeof annotation> =>
                  annotation !== null,
              );

            if (annotations.length === 0) continue;

            notificationItems.push({
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
              url: notification.annotatedUrl || '',
              annotations,
            } as NotificationItemDTO);
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
            card:
              notification.cardKind === 'ANNOTATION'
                ? {
                    id: notification.cardId!,
                    type: 'ANNOTATION' as const,
                    url: notification.cardUrl || '',
                    uri: notification.cardUri,
                    libraryCount: notification.cardLibraryCount || 0,
                    selectors: notification.cardSelectors || [],
                    note: notification.cardNoteText,
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
                  }
                : {
                    id: notification.cardId,
                    type: 'URL' as const,
                    url: notification.cardUrl || '',
                    uri: notification.cardUri,
                    cardContent: {
                      url: notification.cardUrl || '',
                      title: notification.cardTitle,
                      description: notification.cardDescription,
                      author: notification.cardAuthor,
                      publishedDate:
                        notification.cardPublishedDate?.toISOString(),
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
            mentionSource: notification.mentionSource,
          } as NotificationItemDTO;

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
