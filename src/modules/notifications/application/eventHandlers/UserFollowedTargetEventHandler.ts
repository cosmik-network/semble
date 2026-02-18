import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { UserFollowedTargetEvent } from '../../../user/domain/events/UserFollowedTargetEvent';
import { Result, ok, err } from '../../../../shared/core/Result';
import { NotificationService } from '../../domain/services/NotificationService';
import { IUserRepository } from '../../../user/domain/repositories/IUserRepository';
import { ICollectionRepository } from '../../../cards/domain/ICollectionRepository';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';

export class UserFollowedTargetEventHandler
  implements IEventHandler<UserFollowedTargetEvent>
{
  constructor(
    private notificationService: NotificationService,
    private userRepository: IUserRepository,
    private collectionRepository: ICollectionRepository,
  ) {}

  async handle(event: UserFollowedTargetEvent): Promise<Result<void>> {
    try {
      const actorIdResult = CuratorId.create(event.followerId.value);
      if (actorIdResult.isErr()) {
        console.error('Invalid actor ID:', actorIdResult.error);
        return err(actorIdResult.error);
      }
      const actorId = actorIdResult.value;

      if (event.targetType.value === 'USER') {
        // User followed another user - notify the followed user
        const recipientIdResult = CuratorId.create(event.targetId);
        if (recipientIdResult.isErr()) {
          console.error('Invalid recipient ID:', recipientIdResult.error);
          return err(recipientIdResult.error);
        }
        const recipientId = recipientIdResult.value;

        // Skip if user is following themselves (shouldn't happen due to validation)
        if (actorId.equals(recipientId)) {
          return ok(undefined);
        }

        const notificationResult =
          await this.notificationService.createUserFollowedYouNotification(
            recipientId,
            actorId,
          );

        if (notificationResult.isErr()) {
          console.error(
            'Failed to create user followed notification:',
            notificationResult.error,
          );
          return err(notificationResult.error);
        }
      } else if (event.targetType.value === 'COLLECTION') {
        // User followed a collection - notify the collection author
        const collectionIdResult = CollectionId.createFromString(
          event.targetId,
        );
        if (collectionIdResult.isErr()) {
          console.error('Invalid collection ID:', collectionIdResult.error);
          return err(collectionIdResult.error);
        }
        const collectionId = collectionIdResult.value;

        const collectionResult =
          await this.collectionRepository.findById(collectionId);
        if (collectionResult.isErr()) {
          console.error('Failed to find collection:', collectionResult.error);
          return err(collectionResult.error);
        }

        const collection = collectionResult.value;
        if (!collection) {
          console.warn(
            'Collection not found for notification:',
            event.targetId,
          );
          return ok(undefined);
        }

        const recipientId = collection.authorId;

        // Skip if user is following their own collection
        if (actorId.equals(recipientId)) {
          return ok(undefined);
        }

        const notificationResult =
          await this.notificationService.createUserFollowedYourCollectionNotification(
            recipientId,
            actorId,
            collectionId,
          );

        if (notificationResult.isErr()) {
          console.error(
            'Failed to create collection followed notification:',
            notificationResult.error,
          );
          return err(notificationResult.error);
        }
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error handling UserFollowedTargetEvent:', error);
      return err(error as Error);
    }
  }
}
