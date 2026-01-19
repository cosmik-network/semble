import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { INotificationRepository } from '../../../domain/INotificationRepository';
import { CuratorId } from '../../../../cards/domain/value-objects/CuratorId';
import { IProfileService } from '../../../../cards/domain/services/IProfileService';
import { ICardQueryRepository } from '../../../../cards/domain/ICardQueryRepository';
import { ICollectionRepository } from '../../../../cards/domain/ICollectionRepository';
import { CollectionId } from '../../../../cards/domain/value-objects/CollectionId';
import { NotificationItem } from '@semble/types';

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
    private cardQueryRepository: ICardQueryRepository,
    private collectionRepository: ICollectionRepository,
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
      notifications.forEach(notification => {
        userIds.add(notification.actorUserId);
        userIds.add(notification.cardAuthorId);
        notification.collections.forEach(collection => {
          userIds.add(collection.authorId);
        });
      });

      // Bulk fetch all profiles
      const profilePromises = Array.from(userIds).map(id => 
        this.profileService.getProfile(id)
      );
      const profileResults = await Promise.all(profilePromises);
      
      // Build profile lookup map
      const profileMap = new Map<string, any>();
      profileResults.forEach(result => {
        if (result.isOk()) {
          profileMap.set(result.value.id, result.value);
        }
      });

      // Transform enriched notifications to DTOs
      const notificationItems: NotificationItemDTO[] = [];

      for (const notification of notifications) {
        try {
          const actorProfile = profileMap.get(notification.actorUserId);
          const cardAuthorProfile = profileMap.get(notification.cardAuthorId);

          if (!actorProfile || !cardAuthorProfile) {
            // Skip notifications with missing profiles
            continue;
          }

          // Transform collections with author profiles
          const collections = notification.collections
            .map(collection => {
              const collectionAuthorProfile = profileMap.get(collection.authorId);
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
                  description: collectionAuthorProfile.bio,
                },
                description: collection.description,
                cardCount: collection.cardCount,
                createdAt: collection.createdAt.toISOString(),
                updatedAt: collection.updatedAt.toISOString(),
              };
            })
            .filter(Boolean);

          const notificationItem: NotificationItemDTO = {
            id: notification.id,
            user: {
              id: actorProfile.id,
              name: actorProfile.name,
              handle: actorProfile.handle,
              avatarUrl: actorProfile.avatarUrl,
              description: actorProfile.bio,
            },
            card: {
              id: notification.cardId,
              type: 'URL' as const,
              url: notification.cardUrl,
              cardContent: {
                url: notification.cardUrl,
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
              libraryCount: notification.cardLibraryCount,
              urlLibraryCount: notification.cardUrlLibraryCount,
              urlInLibrary: notification.cardUrlInLibrary,
              createdAt: notification.cardCreatedAt.toISOString(),
              updatedAt: notification.cardUpdatedAt.toISOString(),
              author: {
                id: cardAuthorProfile.id,
                name: cardAuthorProfile.name,
                handle: cardAuthorProfile.handle,
                avatarUrl: cardAuthorProfile.avatarUrl,
                description: cardAuthorProfile.bio,
              },
              note: notification.cardNote,
            },
            createdAt: notification.createdAt.toISOString(),
            collections,
            type: notification.type,
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
