import { Result, ok, err } from '../../../../shared/core/Result';
import { CardAddedToLibraryEvent } from '../../../cards/domain/events/CardAddedToLibraryEvent';
import { CardAddedToCollectionEvent } from '../../../cards/domain/events/CardAddedToCollectionEvent';
import { CardRemovedFromLibraryEvent } from '../../../cards/domain/events/CardRemovedFromLibraryEvent';
import {
  CreateNotificationUseCase,
  CreateUserAddedYourCardNotificationDTO,
  CreateUserAddedYourBskyPostNotificationDTO,
  CreateUserAddedYourCollectionNotificationDTO,
} from '../useCases/commands/CreateNotificationUseCase';
import { NotificationType } from '@semble/types';
import { ISagaStateStore } from '../../../feeds/application/sagas/ISagaStateStore';
import { ICardRepository } from '../../../cards/domain/ICardRepository';
import { INotificationRepository } from '../../domain/INotificationRepository';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { IUserRepository } from '../../../user/domain/repositories/IUserRepository';
import { IIdentityResolutionService } from '../../../atproto/domain/services/IIdentityResolutionService';
import { ICollectionRepository } from '../../../cards/domain/ICollectionRepository';
import { IAtUriResolutionService } from '../../../cards/domain/services/IAtUriResolutionService';
import { EnvironmentConfigService } from '../../../../shared/infrastructure/config/EnvironmentConfigService';
import { NotificationUrlParser } from '../services/NotificationUrlParser';
import { DIDOrHandle } from '../../../atproto/domain/DIDOrHandle';
import { DID } from '../../../atproto/domain/DID';

interface PendingCardNotification {
  cardId: string;
  actorId: string;
  recipientUserId: string;
  collectionIds: string[];
  timestamp: Date;
  hasLibraryEvent: boolean;
  hasCollectionEvents: boolean;
}

export class CardNotificationSaga {
  private readonly AGGREGATION_WINDOW_MS = 3000;
  private readonly REDIS_KEY_PREFIX = 'saga:notification';

  constructor(
    private createNotificationUseCase: CreateNotificationUseCase,
    private stateStore: ISagaStateStore,
    private cardRepository: ICardRepository,
    private notificationRepository: INotificationRepository,
    private userRepository: IUserRepository,
    private identityResolutionService: IIdentityResolutionService,
    private collectionRepository: ICollectionRepository,
    private atUriResolutionService: IAtUriResolutionService,
    private configService: EnvironmentConfigService,
  ) {}

  async handleCardEvent(
    event:
      | CardAddedToLibraryEvent
      | CardAddedToCollectionEvent
      | CardRemovedFromLibraryEvent,
  ): Promise<Result<void>> {
    // Handle card removal events
    if (event instanceof CardRemovedFromLibraryEvent) {
      return this.handleCardRemovedEvent(event);
    }

    // Handle card addition events (existing logic)
    return this.handleCardAddedEvent(event);
  }

  private async handleCardRemovedEvent(
    event: CardRemovedFromLibraryEvent,
  ): Promise<Result<void>> {
    try {
      const actorUserId = CuratorId.create(event.curatorId.value);

      if (actorUserId.isErr()) {
        console.error('Invalid curator ID in CardRemovedFromLibraryEvent');
        return ok(undefined);
      }

      // Find and delete any existing notifications for this card/actor combination
      const existingNotificationsResult =
        await this.notificationRepository.findByCardAndActor(
          event.cardId.getStringValue(),
          actorUserId.value,
        );

      if (existingNotificationsResult.isOk()) {
        const notifications = existingNotificationsResult.value;
        for (const notification of notifications) {
          // Delete any pending notification in the saga state for this specific notification
          const aggregationKey = this.createKey(
            event,
            notification.recipientUserId.value,
          );
          await this.deletePendingNotification(aggregationKey);

          // Delete the existing notification
          const deleteResult = await this.notificationRepository.delete(
            notification.notificationId,
          );
          if (deleteResult.isErr()) {
            console.error('Failed to delete notification:', deleteResult.error);
            // Continue with other notifications even if one fails
          }
        }
      }

      return ok(undefined);
    } catch (error) {
      console.error(
        'Error in CardNotificationSaga handleCardRemovedEvent:',
        error,
      );
      return err(error as Error);
    }
  }

  private async handleCardAddedEvent(
    event: CardAddedToLibraryEvent | CardAddedToCollectionEvent,
  ): Promise<Result<void>> {
    try {
      // Get the card to check if it has a viaCardId
      const cardIdResult = event.cardId;
      const cardResult = await this.cardRepository.findById(cardIdResult);

      if (cardResult.isErr() || !cardResult.value) {
        // Card not found, skip notification
        return ok(undefined);
      }

      const card = cardResult.value;

      // Only create notifications for cards that have a viaCardId
      if (!card.viaCardId) {
        // If no viaCardId but there's a URL, check if it mentions a user/collection
        if (card.url) {
          return this.handleUrlMentionNotification(event, card);
        }
        return ok(undefined);
      }

      // Get the via card to determine the recipient
      const viaCardResult = await this.cardRepository.findById(card.viaCardId);
      if (viaCardResult.isErr() || !viaCardResult.value) {
        // Via card not found, skip notification
        return ok(undefined);
      }

      const viaCard = viaCardResult.value;
      const recipientUserId = viaCard.curatorId.value;
      const actorId = this.getActorId(event);

      // Don't create notification if user is adding their own card
      if (recipientUserId === actorId) {
        return ok(undefined);
      }

      const aggregationKey = this.createKey(event, recipientUserId);

      // Retry lock acquisition with longer delays and more attempts for high concurrency
      const maxRetries = 15;
      const baseDelay = 100;
      const maxDelay = 2000;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const lockAcquired = await this.acquireLock(aggregationKey);

        if (lockAcquired) {
          try {
            const existing = await this.getPendingNotification(aggregationKey);

            if (existing && this.isWithinWindow(existing)) {
              this.mergeNotification(existing, event);
              await this.setPendingNotification(aggregationKey, existing);
            } else {
              const newNotification = this.createNewPendingNotification(
                event,
                recipientUserId,
              );
              await this.setPendingNotification(
                aggregationKey,
                newNotification,
              );
              await this.scheduleFlush(aggregationKey);
            }

            return ok(undefined);
          } finally {
            await this.releaseLock(aggregationKey);
          }
        }

        // Lock not acquired, wait and retry
        if (attempt < maxRetries - 1) {
          const exponentialDelay = baseDelay * Math.pow(1.5, attempt);
          const jitter = Math.random() * 50;
          const delay = Math.min(exponentialDelay + jitter, maxDelay);

          console.log(
            `Lock acquisition failed for ${aggregationKey}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      console.warn(
        `Failed to acquire lock after ${maxRetries} attempts for ${aggregationKey}`,
      );
      return ok(undefined);
    } catch (error) {
      console.error('Error in CardNotificationSaga:', error);
      return err(error as Error);
    }
  }

  // Key helpers
  private getPendingKey(aggregationKey: string): string {
    return `${this.REDIS_KEY_PREFIX}:pending:${aggregationKey}`;
  }

  private getLockKey(aggregationKey: string): string {
    return `${this.REDIS_KEY_PREFIX}:lock:${aggregationKey}`;
  }

  // State management
  private async getPendingNotification(
    aggregationKey: string,
  ): Promise<PendingCardNotification | null> {
    const data = await this.stateStore.get(this.getPendingKey(aggregationKey));
    if (!data) return null;

    const parsed = JSON.parse(data);
    parsed.timestamp = new Date(parsed.timestamp);
    return parsed;
  }

  private async setPendingNotification(
    aggregationKey: string,
    notification: PendingCardNotification,
  ): Promise<void> {
    const key = this.getPendingKey(aggregationKey);
    const ttlSeconds = Math.ceil(this.AGGREGATION_WINDOW_MS / 1000) + 5;
    await this.stateStore.setex(key, ttlSeconds, JSON.stringify(notification));
  }

  private async deletePendingNotification(
    aggregationKey: string,
  ): Promise<void> {
    await this.stateStore.del(this.getPendingKey(aggregationKey));
  }

  // Distributed locking
  private async acquireLock(aggregationKey: string): Promise<boolean> {
    const lockKey = this.getLockKey(aggregationKey);
    const lockTtl = Math.ceil(this.AGGREGATION_WINDOW_MS / 1000) + 5;
    const result = await this.stateStore.set(lockKey, '1', 'EX', lockTtl, 'NX');
    return result === 'OK';
  }

  private async releaseLock(aggregationKey: string): Promise<void> {
    await this.stateStore.del(this.getLockKey(aggregationKey));
  }

  private createKey(
    event:
      | CardAddedToLibraryEvent
      | CardAddedToCollectionEvent
      | CardRemovedFromLibraryEvent,
    recipientUserId: string,
  ): string {
    const cardId = event.cardId.getStringValue();
    const actorId = this.getActorId(event);
    return `${cardId}-${actorId}-${recipientUserId}`;
  }

  private getActorId(
    event:
      | CardAddedToLibraryEvent
      | CardAddedToCollectionEvent
      | CardRemovedFromLibraryEvent,
  ): string {
    if ('curatorId' in event) {
      return event.curatorId.value; // CardAddedToLibraryEvent or CardRemovedFromLibraryEvent
    } else {
      return event.addedBy.value; // CardAddedToCollectionEvent
    }
  }

  private isWithinWindow(pending: PendingCardNotification): boolean {
    const now = new Date();
    const timeDiff = now.getTime() - pending.timestamp.getTime();
    return timeDiff <= this.AGGREGATION_WINDOW_MS;
  }

  private createNewPendingNotification(
    event: CardAddedToLibraryEvent | CardAddedToCollectionEvent,
    recipientUserId: string,
  ): PendingCardNotification {
    const cardId = event.cardId.getStringValue();
    const actorId = this.getActorId(event);

    const pending: PendingCardNotification = {
      cardId,
      actorId,
      recipientUserId,
      collectionIds: [],
      timestamp: new Date(),
      hasLibraryEvent: false,
      hasCollectionEvents: false,
    };

    this.mergeNotification(pending, event);
    return pending;
  }

  private mergeNotification(
    existing: PendingCardNotification,
    event: CardAddedToLibraryEvent | CardAddedToCollectionEvent,
  ): void {
    if ('curatorId' in event && event instanceof CardAddedToLibraryEvent) {
      // CardAddedToLibraryEvent
      existing.hasLibraryEvent = true;
    } else if (event instanceof CardAddedToCollectionEvent) {
      // CardAddedToCollectionEvent
      existing.hasCollectionEvents = true;
      const collectionId = event.collectionId.getStringValue();
      if (!existing.collectionIds.includes(collectionId)) {
        existing.collectionIds.push(collectionId);
      }
    }
  }

  private async scheduleFlush(aggregationKey: string): Promise<void> {
    setTimeout(async () => {
      await this.flushNotification(aggregationKey);
    }, this.AGGREGATION_WINDOW_MS);
  }

  private async flushNotification(aggregationKey: string): Promise<void> {
    const lockAcquired = await this.acquireLock(aggregationKey);
    if (!lockAcquired) return;

    try {
      const pending = await this.getPendingNotification(aggregationKey);
      if (!pending) return;

      const request: CreateUserAddedYourCardNotificationDTO = {
        type: NotificationType.USER_ADDED_YOUR_CARD,
        recipientUserId: pending.recipientUserId,
        actorUserId: pending.actorId,
        cardId: pending.cardId,
        collectionIds:
          pending.collectionIds.length > 0 ? pending.collectionIds : undefined,
      };

      await this.createNotificationUseCase.execute(request);
    } finally {
      await this.deletePendingNotification(aggregationKey);
      await this.releaseLock(aggregationKey);
    }
  }

  /**
   * Handle notifications for URLs that mention users (Bluesky posts) or collections
   */
  private async handleUrlMentionNotification(
    event: CardAddedToLibraryEvent | CardAddedToCollectionEvent,
    card: any,
  ): Promise<Result<void>> {
    try {
      const appUrl = this.configService.getAppConfig().appUrl;
      const urlString = card.url.toString();

      // Parse URL to detect if it mentions a user/collection
      console.log('Parsing URL for potential notification:', urlString, appUrl);
      const parsedUrl = NotificationUrlParser.extractMentionedEntityFromUrl(
        urlString,
        appUrl,
      );
      console.log('Parsed URL result:', parsedUrl);

      if (!parsedUrl) {
        // URL doesn't match any known pattern
        return ok(undefined);
      }

      // Determine recipient based on URL type
      let recipientDid: string | null = null;
      let notificationType:
        | NotificationType.USER_ADDED_YOUR_BSKY_POST
        | NotificationType.USER_ADDED_YOUR_COLLECTION
        | null = null;

      if (parsedUrl.type === 'BLUESKY_POST') {
        // Extract handle/DID and resolve to DID
        const didOrHandleResult = DIDOrHandle.create(parsedUrl.handleOrDid);
        if (didOrHandleResult.isErr()) {
          console.warn(
            `Failed to parse DID/handle from Bluesky URL: ${parsedUrl.handleOrDid}`,
          );
          return ok(undefined);
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
            return ok(undefined);
          }
          did = resolveResult.value;
        }

        recipientDid = did.value;
        notificationType = NotificationType.USER_ADDED_YOUR_BSKY_POST;
      } else if (parsedUrl.type === 'SEMBLE_COLLECTION') {
        // Resolve handle to DID first
        const didOrHandleResult = DIDOrHandle.create(parsedUrl.handleOrDid);
        if (didOrHandleResult.isErr()) {
          console.warn(
            `Failed to parse DID/handle from Semble URL: ${parsedUrl.handleOrDid}`,
          );
          return ok(undefined);
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
            return ok(undefined);
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
          return ok(undefined);
        }

        const collectionId = collectionIdResult.value;

        // Fetch collection to get author DID
        const collectionResult =
          await this.collectionRepository.findById(collectionId);

        if (collectionResult.isErr() || !collectionResult.value) {
          console.warn(`Collection not found for ID: ${collectionId}`);
          return ok(undefined);
        }

        const collection = collectionResult.value;
        recipientDid = collection.authorId.value;
        notificationType = NotificationType.USER_ADDED_YOUR_COLLECTION;
      }

      if (!recipientDid || !notificationType) {
        return ok(undefined);
      }

      // Check if user exists in our system
      const recipientDidResult = DID.create(recipientDid);
      if (recipientDidResult.isErr()) {
        console.warn(`Invalid recipient DID: ${recipientDid}`);
        return ok(undefined);
      }

      const userResult = await this.userRepository.findByDID(
        recipientDidResult.value,
      );
      if (userResult.isErr() || !userResult.value) {
        // User doesn't exist in our system, don't create notification
        return ok(undefined);
      }

      const actorId = this.getActorId(event);

      // Don't create notification if user is adding their own content
      if (recipientDid === actorId) {
        return ok(undefined);
      }

      // Use aggregation logic similar to viaCard notifications
      const aggregationKey = this.createKey(event, recipientDid);

      // Retry lock acquisition
      const maxRetries = 15;
      const baseDelay = 100;
      const maxDelay = 2000;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const lockAcquired = await this.acquireLock(aggregationKey);

        if (lockAcquired) {
          try {
            const existing = await this.getPendingNotification(aggregationKey);

            if (existing && this.isWithinWindow(existing)) {
              this.mergeNotification(existing, event);
              await this.setPendingNotification(aggregationKey, existing);
            } else {
              const newNotification = this.createNewPendingNotification(
                event,
                recipientDid,
              );
              await this.setPendingNotification(
                aggregationKey,
                newNotification,
              );
              await this.scheduleFlushForUrlMention(
                aggregationKey,
                notificationType,
              );
            }

            return ok(undefined);
          } finally {
            await this.releaseLock(aggregationKey);
          }
        }

        // Lock not acquired, wait and retry
        if (attempt < maxRetries - 1) {
          const exponentialDelay = baseDelay * Math.pow(1.5, attempt);
          const jitter = Math.random() * 50;
          const delay = Math.min(exponentialDelay + jitter, maxDelay);

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      console.warn(
        `Failed to acquire lock after ${maxRetries} attempts for ${aggregationKey}`,
      );
      return ok(undefined);
    } catch (error) {
      console.error('Error in handleUrlMentionNotification:', error);
      return err(error as Error);
    }
  }

  /**
   * Schedule flush for URL mention notifications
   */
  private async scheduleFlushForUrlMention(
    aggregationKey: string,
    notificationType:
      | NotificationType.USER_ADDED_YOUR_BSKY_POST
      | NotificationType.USER_ADDED_YOUR_COLLECTION,
  ): Promise<void> {
    setTimeout(async () => {
      await this.flushUrlMentionNotification(aggregationKey, notificationType);
    }, this.AGGREGATION_WINDOW_MS);
  }

  /**
   * Flush URL mention notification
   */
  private async flushUrlMentionNotification(
    aggregationKey: string,
    notificationType:
      | NotificationType.USER_ADDED_YOUR_BSKY_POST
      | NotificationType.USER_ADDED_YOUR_COLLECTION,
  ): Promise<void> {
    const lockAcquired = await this.acquireLock(aggregationKey);
    if (!lockAcquired) return;

    try {
      const pending = await this.getPendingNotification(aggregationKey);
      if (!pending) return;

      let request:
        | CreateUserAddedYourBskyPostNotificationDTO
        | CreateUserAddedYourCollectionNotificationDTO;

      if (notificationType === NotificationType.USER_ADDED_YOUR_BSKY_POST) {
        request = {
          type: NotificationType.USER_ADDED_YOUR_BSKY_POST,
          recipientUserId: pending.recipientUserId,
          actorUserId: pending.actorId,
          cardId: pending.cardId,
          collectionIds:
            pending.collectionIds.length > 0
              ? pending.collectionIds
              : undefined,
        };
      } else {
        request = {
          type: NotificationType.USER_ADDED_YOUR_COLLECTION,
          recipientUserId: pending.recipientUserId,
          actorUserId: pending.actorId,
          cardId: pending.cardId,
          collectionIds:
            pending.collectionIds.length > 0
              ? pending.collectionIds
              : undefined,
        };
      }

      await this.createNotificationUseCase.execute(request);
    } finally {
      await this.deletePendingNotification(aggregationKey);
      await this.releaseLock(aggregationKey);
    }
  }
}
