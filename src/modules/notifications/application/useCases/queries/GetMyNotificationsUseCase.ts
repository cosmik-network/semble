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

      const result = await this.notificationRepository.findByRecipient(
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

      // Build notification items with full data
      const notificationItems: NotificationItemDTO[] = [];

      for (const notification of notifications) {
        try {
          // Get actor profile
          const actorProfileResult = await this.profileService.getProfile(
            notification.actorUserId.value,
          );
          if (actorProfileResult.isErr()) {
            // Delete notification if we can't resolve the actor profile
            await this.notificationRepository.delete(notification.notificationId);
            continue;
          }

          // Get card data
          const cardView = await this.cardQueryRepository.getUrlCardBasic(
            notification.metadata.cardId,
            request.userId,
          );
          if (!cardView) {
            continue;
          }

          // Get card author profile
          const cardAuthorProfileResult = await this.profileService.getProfile(
            cardView.authorId,
          );
          if (cardAuthorProfileResult.isErr()) {
            // Delete notification if we can't resolve the card author profile
            await this.notificationRepository.delete(notification.notificationId);
            continue;
          }

          // Get collections if any
          const collections = [];
          if (notification.metadata.collectionIds) {
            for (const collectionIdStr of notification.metadata.collectionIds) {
              const collectionIdResult =
                CollectionId.createFromString(collectionIdStr);
              if (collectionIdResult.isErr()) {
                continue;
              }

              const collectionResult = await this.collectionRepository.findById(
                collectionIdResult.value,
              );
              if (collectionResult.isErr() || !collectionResult.value) {
                continue;
              }

              const collection = collectionResult.value;
              const collectionAuthorProfileResult =
                await this.profileService.getProfile(collection.authorId.value);
              if (collectionAuthorProfileResult.isErr()) {
                continue;
              }

              collections.push({
                id: collection.collectionId.getStringValue(),
                uri: collection.publishedRecordId?.uri,
                name: collection.name.value,
                author: {
                  id: collectionAuthorProfileResult.value.id,
                  name: collectionAuthorProfileResult.value.name,
                  handle: collectionAuthorProfileResult.value.handle,
                  avatarUrl: collectionAuthorProfileResult.value.avatarUrl,
                  description: collectionAuthorProfileResult.value.bio,
                },
                description: collection.description?.value,
                cardCount: collection.cardCount,
                createdAt: collection.createdAt.toISOString(),
                updatedAt: collection.updatedAt.toISOString(),
              });
            }
          }

          const notificationItem: NotificationItemDTO = {
            id: notification.notificationId.getStringValue(),
            user: {
              id: actorProfileResult.value.id,
              name: actorProfileResult.value.name,
              handle: actorProfileResult.value.handle,
              avatarUrl: actorProfileResult.value.avatarUrl,
              description: actorProfileResult.value.bio,
            },
            card: {
              id: cardView.id,
              type: 'URL' as const,
              url: cardView.url,
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
              createdAt: cardView.createdAt.toISOString(),
              updatedAt: cardView.updatedAt.toISOString(),
              author: {
                id: cardAuthorProfileResult.value.id,
                name: cardAuthorProfileResult.value.name,
                handle: cardAuthorProfileResult.value.handle,
                avatarUrl: cardAuthorProfileResult.value.avatarUrl,
                description: cardAuthorProfileResult.value.bio,
              },
              note: cardView.note,
            },
            createdAt: notification.createdAt.toISOString(),
            collections,
            type: notification.type.value,
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
