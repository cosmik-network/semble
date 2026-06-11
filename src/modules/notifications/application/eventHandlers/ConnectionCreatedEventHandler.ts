import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { ConnectionCreatedEvent } from '../../../cards/domain/events/ConnectionCreatedEvent';
import { Result, ok, err } from '../../../../shared/core/Result';
import { NotificationService } from '../../domain/services/NotificationService';
import { IConnectionRepository } from '../../../cards/domain/IConnectionRepository';
import { ICardQueryRepository } from '../../../cards/domain/ICardQueryRepository';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { NotificationUrlParser } from '../services/NotificationUrlParser';
import { EnvironmentConfigService } from '../../../../shared/infrastructure/config/EnvironmentConfigService';
import { IUserRepository } from '../../../user/domain/repositories/IUserRepository';
import { IIdentityResolutionService } from '../../../atproto/domain/services/IIdentityResolutionService';
import { ICollectionRepository } from '../../../cards/domain/ICollectionRepository';
import { IAtUriResolutionService } from '../../../cards/domain/services/IAtUriResolutionService';
import { DIDOrHandle } from '../../../atproto/domain/DIDOrHandle';
import { DID } from '../../../atproto/domain/DID';
import { IFollowsRepository } from '../../../user/domain/repositories/IFollowsRepository';
import { FollowTargetType } from '../../../user/domain/value-objects/FollowTargetType';
import { SubscriptionScopeEnum } from '../../../user/domain/value-objects/SubscriptionScope';
import { CollectionUrlResolver } from '../services/CollectionUrlResolver';
import { CreateNotificationUseCase } from '../useCases/commands/CreateNotificationUseCase';
import { NotificationType } from '@semble/types';
import { ConnectionId } from '../../../cards/domain/value-objects/ConnectionId';

export class ConnectionCreatedEventHandler implements IEventHandler<ConnectionCreatedEvent> {
  constructor(
    private notificationService: NotificationService,
    private connectionRepository: IConnectionRepository,
    private cardQueryRepository: ICardQueryRepository,
    private configService: EnvironmentConfigService,
    private userRepository: IUserRepository,
    private identityResolutionService: IIdentityResolutionService,
    private collectionRepository: ICollectionRepository,
    private atUriResolutionService: IAtUriResolutionService,
    private followsRepository: IFollowsRepository,
    private collectionUrlResolver: CollectionUrlResolver,
    private createNotificationUseCase: CreateNotificationUseCase,
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
      const appUrl = this.configService.getAppConfig().appUrl;

      // Track content owners to exclude from generic notifications
      const contentOwnerDids = new Set<string>();

      // Parse URLs to detect Bluesky posts or Semble collections
      const parsedSourceUrl =
        NotificationUrlParser.extractMentionedEntityFromUrl(sourceUrl, appUrl);
      const parsedTargetUrl =
        NotificationUrlParser.extractMentionedEntityFromUrl(targetUrl, appUrl);

      // Handle source URL if it's a Bluesky post or Semble collection
      if (parsedSourceUrl) {
        const sourceOwnerDid = await this.handleUrlOwnerNotification(
          parsedSourceUrl,
          event.connectionId,
          curatorId,
        );
        if (sourceOwnerDid) {
          contentOwnerDids.add(sourceOwnerDid);
        }
      }

      // Handle target URL if it's a Bluesky post or Semble collection
      if (parsedTargetUrl) {
        const targetOwnerDid = await this.handleUrlOwnerNotification(
          parsedTargetUrl,
          event.connectionId,
          curatorId,
        );
        if (targetOwnerDid) {
          contentOwnerDids.add(targetOwnerDid);
        }
      }

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
          // Exclude the curator who created the connection and content owners
          if (
            library.userId !== curatorId.value &&
            !contentOwnerDids.has(library.userId)
          ) {
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
          // Exclude the curator who created the connection and content owners
          if (
            library.userId !== curatorId.value &&
            !contentOwnerDids.has(library.userId)
          ) {
            recipientUserIds.add(library.userId);
          }
        });
      }

      // Filter recipients based on environment
      let filteredRecipientUserIds = Array.from(recipientUserIds);

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

      // Subscription fan-out — exclude anyone who already got a more specific
      // notification above (content owners + library-URL recipients) and the
      // curator themselves.
      const alreadyNotified = new Set<string>([curatorId.value]);
      for (const owner of contentOwnerDids) alreadyNotified.add(owner);
      for (const recipient of recipientUserIds) alreadyNotified.add(recipient);

      await this.emitSubscriptionNotifications(
        connection.source.url.value,
        connection.target.url.value,
        curatorId.value,
        event.connectionId,
        alreadyNotified,
      );

      return ok(undefined);
    } catch (error) {
      console.error('Error handling ConnectionCreatedEvent:', error);
      return err(error as Error);
    }
  }

  /**
   * Fans out connection-scoped subscription notifications, skipping any
   * recipient already targeted by a more specific notification above.
   *
   * - For each side of the connection that resolves to a Semble collection,
   *   COLLECTION subscribers with CONNECTION scope →
   *   USER_CONNECTED_SUBSCRIBED_COLLECTION.
   * - USER subscribers with CONNECTION scope on the curator →
   *   SUBSCRIBED_USER_MADE_CONNECTION.
   */
  private async emitSubscriptionNotifications(
    sourceUrl: string,
    targetUrl: string,
    curatorId: string,
    connectionId: ConnectionId,
    alreadyNotified: Set<string>,
  ): Promise<void> {
    const connectionIdStr = connectionId.getStringValue();
    const handled = new Set<string>(alreadyNotified);

    // Collection-side fan-out first (more specific than user-CONNECTION).
    for (const url of [sourceUrl, targetUrl]) {
      const resolved = await this.collectionUrlResolver.resolve(url);
      if (!resolved) continue;

      // Collection author already gets USER_CONNECTED_YOUR_COLLECTION via the
      // owner-notification pass above.
      const localExcluded = new Set(handled);
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
        if (handled.has(recipientId)) continue;
        handled.add(recipientId);
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
        if (handled.has(recipientId)) continue;
        handled.add(recipientId);
        await this.createNotificationUseCase.execute({
          type: NotificationType.SUBSCRIBED_USER_MADE_CONNECTION,
          recipientUserId: recipientId,
          actorUserId: curatorId,
          connectionId: connectionIdStr,
        });
      }
    }
  }

  /**
   * Handle notification for URL owner (Bluesky post or Semble collection)
   * Returns the owner DID if successful, null otherwise
   */
  private async handleUrlOwnerNotification(
    parsedUrl: {
      type: 'BLUESKY_POST' | 'SEMBLE_COLLECTION';
      handleOrDid: string;
      postId?: string;
      rkey?: string;
    },
    connectionId: any,
    curatorId: CuratorId,
  ): Promise<string | null> {
    try {
      if (parsedUrl.type === 'BLUESKY_POST') {
        // Extract handle/DID and resolve to DID
        const didOrHandleResult = DIDOrHandle.create(parsedUrl.handleOrDid);
        if (didOrHandleResult.isErr()) {
          console.warn(
            `Failed to parse DID/handle from Bluesky URL: ${parsedUrl.handleOrDid}`,
          );
          return null;
        }

        const didOrHandle = didOrHandleResult.value;

        // Resolve to DID if it's a handle
        let did: DID;
        if (didOrHandle.isDID) {
          did = didOrHandle.getDID()!;
        } else {
          const resolveResult =
            await this.identityResolutionService.resolveToDID(didOrHandle);
          if (resolveResult.isErr()) {
            console.warn(
              `Failed to resolve handle to DID: ${parsedUrl.handleOrDid}`,
            );
            return null;
          }
          did = resolveResult.value;
        }

        const recipientDid = did.value;

        // Check if user exists in our system
        const recipientDidResult = DID.create(recipientDid);
        if (recipientDidResult.isErr()) {
          console.warn(`Invalid recipient DID: ${recipientDid}`);
          return null;
        }

        const userResult = await this.userRepository.findByDID(
          recipientDidResult.value,
        );
        if (userResult.isErr() || !userResult.value) {
          // User doesn't exist in our system, don't create notification
          return null;
        }

        // Don't create notification if user is connecting their own post
        if (recipientDid === curatorId.value) {
          return null;
        }

        const recipientIdResult = CuratorId.create(recipientDid);
        if (recipientIdResult.isErr()) {
          console.error('Invalid recipient ID:', recipientIdResult.error);
          return null;
        }

        // Create USER_CONNECTED_YOUR_POST notification
        const notificationResult =
          await this.notificationService.createUserConnectedYourPostNotification(
            recipientIdResult.value,
            curatorId,
            connectionId,
          );

        if (notificationResult.isErr()) {
          console.error(
            'Failed to create post connection notification:',
            notificationResult.error,
          );
          return null;
        }

        return recipientDid;
      } else if (parsedUrl.type === 'SEMBLE_COLLECTION') {
        // Resolve handle to DID first
        const didOrHandleResult = DIDOrHandle.create(parsedUrl.handleOrDid);
        if (didOrHandleResult.isErr()) {
          console.warn(
            `Failed to parse DID/handle from Semble URL: ${parsedUrl.handleOrDid}`,
          );
          return null;
        }

        const didOrHandle = didOrHandleResult.value;

        // Resolve to DID if it's a handle
        let collectionAuthorDid: DID;
        if (didOrHandle.isDID) {
          collectionAuthorDid = didOrHandle.getDID()!;
        } else {
          const resolveResult =
            await this.identityResolutionService.resolveToDID(didOrHandle);
          if (resolveResult.isErr()) {
            console.warn(
              `Failed to resolve handle to DID: ${parsedUrl.handleOrDid}`,
            );
            return null;
          }
          collectionAuthorDid = resolveResult.value;
        }

        // Build AT URI: at://{did}/network.cosmik.local.collection/{rkey}
        const atprotoCollection =
          this.configService.getAtProtoCollections().collection;
        const atUri = `at://${collectionAuthorDid.value}/${atprotoCollection}/${parsedUrl.rkey}`;

        // Resolve AT URI to get CollectionId
        const collectionIdResult =
          await this.atUriResolutionService.resolveCollectionId(atUri);

        if (collectionIdResult.isErr() || !collectionIdResult.value) {
          console.warn(`Collection not found for AT URI: ${atUri}`);
          return null;
        }

        const collectionId = collectionIdResult.value;

        // Fetch collection to get author DID
        const collectionResult =
          await this.collectionRepository.findById(collectionId);

        if (collectionResult.isErr() || !collectionResult.value) {
          console.warn(`Collection not found for ID: ${collectionId}`);
          return null;
        }

        const collection = collectionResult.value;
        const recipientDid = collection.authorId.value;

        // Check if user exists in our system
        const recipientDidResult = DID.create(recipientDid);
        if (recipientDidResult.isErr()) {
          console.warn(`Invalid recipient DID: ${recipientDid}`);
          return null;
        }

        const userResult = await this.userRepository.findByDID(
          recipientDidResult.value,
        );
        if (userResult.isErr() || !userResult.value) {
          // User doesn't exist in our system, don't create notification
          return null;
        }

        // Don't create notification if user is connecting their own collection
        if (recipientDid === curatorId.value) {
          return null;
        }

        const recipientIdResult = CuratorId.create(recipientDid);
        if (recipientIdResult.isErr()) {
          console.error('Invalid recipient ID:', recipientIdResult.error);
          return null;
        }

        // Create USER_CONNECTED_YOUR_COLLECTION notification
        const notificationResult =
          await this.notificationService.createUserConnectedYourCollectionNotification(
            recipientIdResult.value,
            curatorId,
            connectionId,
          );

        if (notificationResult.isErr()) {
          console.error(
            'Failed to create collection connection notification:',
            notificationResult.error,
          );
          return null;
        }

        return recipientDid;
      }

      return null;
    } catch (error) {
      console.error('Error in handleUrlOwnerNotification:', error);
      return null;
    }
  }
}
