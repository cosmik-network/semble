import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { ConnectionCreatedEvent } from '../../../cards/domain/events/ConnectionCreatedEvent';
import { Result, ok, err } from '../../../../shared/core/Result';
import { NotificationService } from '../../domain/services/NotificationService';
import { IConnectionRepository } from '../../../cards/domain/IConnectionRepository';
import { ICardQueryRepository } from '../../../cards/domain/ICardQueryRepository';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { EnvironmentConfigService } from '../../../../shared/infrastructure/config/EnvironmentConfigService';
import { IIdentityResolutionService } from '../../../atproto/domain/services/IIdentityResolutionService';
import { DIDOrHandle } from '../../../atproto/domain/DIDOrHandle';
import {
  TEAM_HANDLES,
  EARLY_TESTERS_HANDLES,
} from '../../../../shared/constants/featureFlags';

export class ConnectionCreatedEventHandler
  implements IEventHandler<ConnectionCreatedEvent>
{
  constructor(
    private notificationService: NotificationService,
    private connectionRepository: IConnectionRepository,
    private cardQueryRepository: ICardQueryRepository,
    private environmentConfigService: EnvironmentConfigService,
    private identityResolutionService: IIdentityResolutionService,
  ) {}

  async handle(event: ConnectionCreatedEvent): Promise<Result<void>> {
    try {
      // Get the connection details
      const connectionResult = await this.connectionRepository.findById(
        event.connectionId,
      );
      if (connectionResult.isErr()) {
        console.error('Failed to find connection:', connectionResult.error);
        return err(connectionResult.error);
      }

      const connection = connectionResult.value;
      if (!connection) {
        console.warn(
          'Connection not found:',
          event.connectionId.getStringValue(),
        );
        return ok(undefined);
      }

      // Only create notifications if both source and target are URLs
      if (!connection.source.url || !connection.target.url) {
        // One or both are cards, not URLs - skip notification
        return ok(undefined);
      }

      const sourceUrl = connection.source.url.value;
      const targetUrl = connection.target.url.value;
      const curatorId = connection.curatorId;

      // Find all users who have either URL in their library
      const recipientUserIds = new Set<string>();

      // Get users with source URL
      const sourceLibrariesResult =
        await this.cardQueryRepository.getLibrariesForUrl(sourceUrl, {
          page: 1,
          limit: 1000, // Get all users, consider pagination for large datasets
          sortBy: 'CREATED_AT' as any,
          sortOrder: 'DESC' as any,
        });

      if (sourceLibrariesResult.items) {
        sourceLibrariesResult.items.forEach((library) => {
          // Exclude the curator who created the connection
          if (library.userId !== curatorId.value) {
            recipientUserIds.add(library.userId);
          }
        });
      }

      // Get users with target URL
      const targetLibrariesResult =
        await this.cardQueryRepository.getLibrariesForUrl(targetUrl, {
          page: 1,
          limit: 1000, // Get all users, consider pagination for large datasets
          sortBy: 'CREATED_AT' as any,
          sortOrder: 'DESC' as any,
        });

      if (targetLibrariesResult.items) {
        targetLibrariesResult.items.forEach((library) => {
          // Exclude the curator who created the connection
          if (library.userId !== curatorId.value) {
            recipientUserIds.add(library.userId);
          }
        });
      }

      // Filter recipients based on environment
      let filteredRecipientUserIds = Array.from(recipientUserIds);

      // In production, only notify team and early testers
      const isProduction =
        this.environmentConfigService.get().environment === 'prod';
      if (isProduction) {
        const allowedHandles = new Set([
          ...TEAM_HANDLES,
          ...EARLY_TESTERS_HANDLES,
        ]);

        // Filter to only allowed recipients
        const filteredRecipients = await Promise.all(
          filteredRecipientUserIds.map(async (recipientUserId) => {
            const didOrHandleResult = DIDOrHandle.create(recipientUserId);
            if (didOrHandleResult.isErr()) {
              return null;
            }

            const handleResult =
              await this.identityResolutionService.resolveToHandle(
                didOrHandleResult.value,
              );
            if (handleResult.isErr()) {
              return null;
            }

            const handle = handleResult.value.value;
            return allowedHandles.has(handle) ? recipientUserId : null;
          }),
        );

        filteredRecipientUserIds = filteredRecipients.filter(
          (id): id is string => id !== null,
        );
      }

      // Create notifications for each filtered recipient
      const notificationPromises = filteredRecipientUserIds.map(
        async (recipientUserId) => {
          const recipientIdResult = CuratorId.create(recipientUserId);
          if (recipientIdResult.isErr()) {
            console.error('Invalid recipient ID:', recipientIdResult.error);
            return err(recipientIdResult.error);
          }
          const recipientId = recipientIdResult.value;

          const notificationResult =
            await this.notificationService.createUserConnectedYourUrlNotification(
              recipientId,
              curatorId,
              event.connectionId,
            );

          if (notificationResult.isErr()) {
            console.error(
              'Failed to create connection notification:',
              notificationResult.error,
            );
            // Continue creating other notifications even if one fails
          }

          return notificationResult;
        },
      );

      // Wait for all notifications to be created
      await Promise.all(notificationPromises);

      return ok(undefined);
    } catch (error) {
      console.error('Error handling ConnectionCreatedEvent:', error);
      return err(error as Error);
    }
  }
}
