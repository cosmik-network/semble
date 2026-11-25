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
import { MentionRecipientResolver } from '../services/MentionRecipientResolver';
import { UrlOrCardId } from '../../../cards/domain/value-objects/UrlOrCardId';
import { normalizeQuotedText } from '../../../cards/domain/value-objects/selectors/normalizeQuotedText';

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
    private mentionRecipientResolver: MentionRecipientResolver,
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

      // Mention pass runs before the URL guard: card-to-card connections can
      // still carry a mentioning note.
      const mentionedDids = new Set<string>();
      if (connection.note?.value) {
        const mentionRecipients =
          await this.mentionRecipientResolver.resolveMentionedUsers(
            connection.note.value,
          );
        const reconcileResult =
          await this.notificationService.reconcileMentionNotifications(
            connection.curatorId,
            { mentionSource: 'CONNECTION', connectionId: event.connectionId },
            mentionRecipients,
          );
        if (reconcileResult.isErr()) {
          console.error(
            'Failed to reconcile connection mention notifications:',
            reconcileResult.error.message,
          );
        } else {
          mentionRecipients.forEach((id) => mentionedDids.add(id.value));
        }
      }

      // Resolve endpoints — URL endpoints carry a url, CARD endpoints
      // reference an annotation card (its url + passage). A CARD endpoint
      // that no longer resolves to an annotation is skipped on that side.
      const endpoints = await Promise.all(
        [connection.source, connection.target].map((endpoint) =>
          this.resolveEndpoint(endpoint),
        ),
      );

      // Unresolvable on both sides — nothing to notify about
      if (endpoints[0] === null && endpoints[1] === null) {
        return ok(undefined);
      }

      const curatorId = connection.curatorId;
      const appUrl = this.configService.getAppConfig().appUrl;

      // Track content owners to exclude from generic notifications.
      // Mentioned users are seeded here so they get exactly one notification
      // (the mention) rather than a second generic one.
      const contentOwnerDids = new Set<string>(mentionedDids);

      // Parse URL endpoints to detect Bluesky posts or Semble collections
      // (deduped — a CARD endpoint can anchor to the same URL as the other
      // side)
      const urlEndpoints = [
        ...new Set(
          endpoints
            .filter(
              (endpoint): endpoint is NonNullable<typeof endpoint> =>
                endpoint !== null && endpoint.kind === 'URL',
            )
            .map((endpoint) => endpoint.url),
        ),
      ];

      for (const url of urlEndpoints) {
        const parsedUrl = NotificationUrlParser.extractMentionedEntityFromUrl(
          url,
          appUrl,
        );
        if (!parsedUrl) continue;

        const ownerDid = await this.handleUrlOwnerNotification(
          parsedUrl,
          event.connectionId,
          curatorId,
        );
        if (ownerDid) {
          contentOwnerDids.add(ownerDid);
        }
      }

      // Users who have any passage-matching annotation card in their
      // library — they get USER_CONNECTED_YOUR_ANNOTATION. A user with both
      // endpoints' annotations in their library still gets one notification.
      const annotationRecipientIds = new Set<string>();
      for (const endpoint of endpoints) {
        if (!endpoint || endpoint.kind !== 'CARD') continue;

        const librariesResult =
          await this.cardQueryRepository.getLibrariesForAnnotation(
            endpoint.url,
            endpoint.exactNormalized,
            {
              page: 1,
              limit: 1000,
              sortBy: 'CREATED_AT' as any,
              sortOrder: 'DESC' as any,
            },
          );

        if (librariesResult.items) {
          librariesResult.items.forEach((library) => {
            if (
              library.userId !== curatorId.value &&
              !contentOwnerDids.has(library.userId)
            ) {
              annotationRecipientIds.add(library.userId);
            }
          });
        }
      }

      await Promise.all(
        Array.from(annotationRecipientIds).map(async (recipientUserId) => {
          const recipientIdResult = CuratorId.create(recipientUserId);
          if (recipientIdResult.isErr()) {
            console.error('Invalid recipient ID:', recipientIdResult.error);
            return;
          }

          const notificationResult =
            await this.notificationService.createUserConnectedYourAnnotationNotification(
              recipientIdResult.value,
              curatorId,
              event.connectionId,
            );

          if (notificationResult.isErr()) {
            console.error(
              'Failed to create annotation connection notification:',
              notificationResult.error,
            );
          }
        }),
      );

      // Find all users who have a connection URL in their library.
      // Annotation-library users are excluded — the annotation notification
      // is the more specific one.
      const recipientUserIds = new Set<string>();

      for (const url of urlEndpoints) {
        const librariesResult =
          await this.cardQueryRepository.getLibrariesForUrl(url, {
            page: 1,
            limit: 1000, // Get all users, consider pagination for large datasets
            sortBy: 'CREATED_AT' as any,
            sortOrder: 'DESC' as any,
          });

        if (librariesResult.items) {
          librariesResult.items.forEach((library) => {
            // Exclude the curator who created the connection, content
            // owners, and annotation-notification recipients
            if (
              library.userId !== curatorId.value &&
              !contentOwnerDids.has(library.userId) &&
              !annotationRecipientIds.has(library.userId)
            ) {
              recipientUserIds.add(library.userId);
            }
          });
        }
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
      // notification above (content owners + library recipients) and the
      // curator themselves. CARD endpoints fan out via their anchor URL.
      const alreadyNotified = new Set<string>([curatorId.value]);
      for (const owner of contentOwnerDids) alreadyNotified.add(owner);
      for (const recipient of recipientUserIds) alreadyNotified.add(recipient);
      for (const recipient of annotationRecipientIds) {
        alreadyNotified.add(recipient);
      }

      const anchorUrls = endpoints
        .filter(
          (endpoint): endpoint is NonNullable<typeof endpoint> => !!endpoint,
        )
        .map((endpoint) => endpoint.url);
      if (anchorUrls.length > 0) {
        await this.emitSubscriptionNotifications(
          anchorUrls[0]!,
          anchorUrls[1] ?? anchorUrls[0]!,
          curatorId.value,
          event.connectionId,
          alreadyNotified,
        );
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error handling ConnectionCreatedEvent:', error);
      return err(error as Error);
    }
  }

  /**
   * A connection endpoint as the notification policies see it: a URL, or an
   * annotation card reduced to its anchor URL + normalized passage. Null
   * when a CARD endpoint doesn't resolve to an annotation card.
   */
  private async resolveEndpoint(
    endpoint: UrlOrCardId,
  ): Promise<
    | { kind: 'URL'; url: string }
    | { kind: 'CARD'; url: string; exactNormalized: string }
    | null
  > {
    if (endpoint.url) {
      return { kind: 'URL', url: endpoint.url.value };
    }

    const cardId = endpoint.cardId;
    if (!cardId) {
      return null;
    }

    const view = await this.cardQueryRepository.getAnnotationCardById(
      cardId.getStringValue(),
    );
    if (!view) {
      return null;
    }

    const primary = view.selectors.find(
      (selector) => selector.type === 'TextQuoteSelector',
    );
    if (!primary) {
      return null;
    }

    return {
      kind: 'CARD',
      url: view.url,
      exactNormalized: normalizeQuotedText(primary.exact),
    };
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
