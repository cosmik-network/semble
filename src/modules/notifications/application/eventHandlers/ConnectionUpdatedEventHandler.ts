import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { ConnectionUpdatedEvent } from '../../../cards/domain/events/ConnectionUpdatedEvent';
import { Result, ok } from '../../../../shared/core/Result';
import { IConnectionRepository } from '../../../cards/domain/IConnectionRepository';
import { NotificationService } from '../../domain/services/NotificationService';
import { MentionRecipientResolver } from '../services/MentionRecipientResolver';

/**
 * On connection edit, re-parse the note for @handle mentions and reconcile
 * mention notifications.
 */
export class ConnectionUpdatedEventHandler implements IEventHandler<ConnectionUpdatedEvent> {
  constructor(
    private connectionRepository: IConnectionRepository,
    private mentionRecipientResolver: MentionRecipientResolver,
    private notificationService: NotificationService,
  ) {}

  async handle(event: ConnectionUpdatedEvent): Promise<Result<void>> {
    try {
      const connectionResult = await this.connectionRepository.findById(
        event.connectionId,
      );
      if (connectionResult.isErr() || !connectionResult.value) {
        return ok(undefined);
      }
      const connection = connectionResult.value;

      const text = connection.note?.value ?? '';
      const recipients =
        await this.mentionRecipientResolver.resolveMentionedUsers(text);

      const reconcileResult =
        await this.notificationService.reconcileMentionNotifications(
          event.curatorId,
          { mentionSource: 'CONNECTION', connectionId: event.connectionId },
          recipients,
        );
      if (reconcileResult.isErr()) {
        console.error(
          'Failed to reconcile connection mention notifications:',
          reconcileResult.error.message,
        );
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error handling ConnectionUpdatedEvent:', error);
      return ok(undefined);
    }
  }
}
