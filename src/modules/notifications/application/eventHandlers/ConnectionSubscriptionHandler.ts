import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { ConnectionCreatedEvent } from '../../../cards/domain/events/ConnectionCreatedEvent';
import { Result, ok, err } from '../../../../shared/core/Result';
import { IConnectionRepository } from '../../../cards/domain/IConnectionRepository';
import { IFollowsRepository } from '../../../user/domain/repositories/IFollowsRepository';
import { FollowTargetType } from '../../../user/domain/value-objects/FollowTargetType';
import { SubscriptionScopeEnum } from '../../../user/domain/value-objects/SubscriptionScope';
import { CreateNotificationUseCase } from '../useCases/commands/CreateNotificationUseCase';
import { NotificationType } from '@semble/types';
import { CollectionUrlResolver } from '../services/CollectionUrlResolver';

/**
 * Connection-scoped subscription notifications. Runs as a plain event handler
 * (not inside the bundling saga) since connections don't have natural sibling
 * events to aggregate.
 *
 * Fan-out:
 * - USER subscribers with CONNECTION scope on the curator →
 *   SUBSCRIBED_USER_MADE_CONNECTION.
 * - For each side of the connection that resolves to a Semble collection,
 *   COLLECTION subscribers with CONNECTION scope →
 *   USER_CONNECTED_SUBSCRIBED_COLLECTION. Excludes the curator and the
 *   collection author (who already gets USER_CONNECTED_YOUR_COLLECTION via
 *   the existing ConnectionCreatedEventHandler).
 */
export class ConnectionSubscriptionHandler implements IEventHandler<ConnectionCreatedEvent> {
  constructor(
    private connectionRepository: IConnectionRepository,
    private followsRepository: IFollowsRepository,
    private createNotificationUseCase: CreateNotificationUseCase,
    private collectionUrlResolver: CollectionUrlResolver,
  ) {}

  async handle(event: ConnectionCreatedEvent): Promise<Result<void>> {
    try {
      const connectionResult = await this.connectionRepository.findById(
        event.connectionId,
      );
      if (connectionResult.isErr() || !connectionResult.value) {
        return ok(undefined);
      }
      const connection = connectionResult.value;
      const curatorId = connection.curatorId.value;
      const connectionIdStr = event.connectionId.getStringValue();

      const handledRecipients = new Set<string>([curatorId]);

      // Collection-side fan-out first (more specific than user-CONNECTION).
      const candidateUrls = [
        connection.source.url?.value,
        connection.target.url?.value,
      ].filter((u): u is string => !!u);

      for (const url of candidateUrls) {
        const resolved = await this.collectionUrlResolver.resolve(url);
        if (!resolved) continue;

        // Collection author already gets USER_CONNECTED_YOUR_COLLECTION.
        const localExcluded = new Set(handledRecipients);
        localExcluded.add(resolved.authorDid);

        const subs = await this.followsRepository.getSubscribersForScope(
          resolved.collectionId,
          FollowTargetType.COLLECTION,
          SubscriptionScopeEnum.CONNECTION,
        );
        if (subs.isErr()) continue;
        for (const follow of subs.value) {
          const recipientId = follow.followerId.value;
          if (localExcluded.has(recipientId)) continue;
          if (handledRecipients.has(recipientId)) continue;
          handledRecipients.add(recipientId);
          await this.createNotificationUseCase.execute({
            type: NotificationType.USER_CONNECTED_SUBSCRIBED_COLLECTION,
            recipientUserId: recipientId,
            actorUserId: curatorId,
            connectionId: connectionIdStr,
          });
        }
      }

      // User-CONNECTION fan-out.
      const userSubs = await this.followsRepository.getSubscribersForScope(
        curatorId,
        FollowTargetType.USER,
        SubscriptionScopeEnum.CONNECTION,
      );
      if (userSubs.isOk()) {
        for (const follow of userSubs.value) {
          const recipientId = follow.followerId.value;
          if (handledRecipients.has(recipientId)) continue;
          handledRecipients.add(recipientId);
          await this.createNotificationUseCase.execute({
            type: NotificationType.SUBSCRIBED_USER_MADE_CONNECTION,
            recipientUserId: recipientId,
            actorUserId: curatorId,
            connectionId: connectionIdStr,
          });
        }
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error in ConnectionSubscriptionHandler:', error);
      return err(error as Error);
    }
  }
}
