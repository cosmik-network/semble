import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { INotificationRepository } from '../../../domain/INotificationRepository';
import { CuratorId } from '../../../../cards/domain/value-objects/CuratorId';
import { IProfileService } from '../../../../cards/domain/services/IProfileService';
import { ICardRepository } from '../../../../cards/domain/ICardRepository';
import { ICollectionRepository } from '../../../../cards/domain/ICollectionRepository';
import { CardId } from '../../../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../../../cards/domain/value-objects/CollectionId';

export interface GetMyNotificationsDTO {
  userId: string;
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export interface NotificationItemDTO {
  id: string;
  user: {
    id: string;
    name: string;
    handle: string;
    avatarUrl?: string;
    description?: string;
  };
  card: {
    id: string;
    type: 'URL';
    url: string;
    cardContent: {
      url: string;
      title?: string;
      description?: string;
      author?: string;
      thumbnailUrl?: string;
    };
    libraryCount: number;
    urlLibraryCount: number;
    urlInLibrary?: boolean;
    createdAt: string;
    updatedAt: string;
    author: {
      id: string;
      name: string;
      handle: string;
      avatarUrl?: string;
      description?: string;
    };
    note?: {
      id: string;
      text: string;
    };
  };
  createdAt: string;
  collections: Array<{
    id: string;
    uri?: string;
    name: string;
    author: {
      id: string;
      name: string;
      handle: string;
      avatarUrl?: string;
      description?: string;
    };
    description?: string;
    cardCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
  type: string;
  read: boolean;
}

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
    private cardRepository: ICardRepository,
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
        return err(new ValidationError(`Invalid user ID: ${userIdResult.error.message}`));
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
            continue; // Skip this notification if we can't get the actor profile
          }

          // Get card data
          const cardIdResult = CardId.createFromString(notification.metadata.cardId);
          if (cardIdResult.isErr()) {
            continue;
          }

          const cardResult = await this.cardRepository.findById(cardIdResult.value);
          if (cardResult.isErr() || !cardResult.value) {
            continue;
          }

          const card = cardResult.value;

          // Get card author profile
          const cardAuthorProfileResult = await this.profileService.getProfile(
            card.curatorId.value,
          );
          if (cardAuthorProfileResult.isErr()) {
            continue;
          }

          // Get collections if any
          const collections = [];
          if (notification.metadata.collectionIds) {
            for (const collectionIdStr of notification.metadata.collectionIds) {
              const collectionIdResult = CollectionId.createFromString(collectionIdStr);
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
              const collectionAuthorProfileResult = await this.profileService.getProfile(
                collection.authorId.value,
              );
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
              id: card.cardId.getStringValue(),
              type: 'URL' as const,
              url: card.url?.value || '',
              cardContent: {
                url: card.url?.value || '',
                title: card.content.title,
                description: card.content.description,
                author: card.content.author,
                thumbnailUrl: card.content.thumbnailUrl,
              },
              libraryCount: card.libraryCount,
              urlLibraryCount: card.libraryCount,
              urlInLibrary: card.isInLibrary(userIdResult.value),
              createdAt: card.createdAt.toISOString(),
              updatedAt: card.updatedAt.toISOString(),
              author: {
                id: cardAuthorProfileResult.value.id,
                name: cardAuthorProfileResult.value.name,
                handle: cardAuthorProfileResult.value.handle,
                avatarUrl: cardAuthorProfileResult.value.avatarUrl,
                description: cardAuthorProfileResult.value.bio,
              },
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
