import { Result, ok } from '../../../../shared/core/Result';
import { ICardRepository } from '../../../cards/domain/ICardRepository';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { ICollectionRepository } from '../../../cards/domain/ICollectionRepository';
import { IUserRepository } from '../../../user/domain/repositories/IUserRepository';
import { IIdentityResolutionService } from '../../../atproto/domain/services/IIdentityResolutionService';
import { IAtUriResolutionService } from '../../../cards/domain/services/IAtUriResolutionService';
import { DIDOrHandle } from '../../../atproto/domain/DIDOrHandle';
import { DID } from '../../../atproto/domain/DID';
import { EnvironmentConfigService } from '../../../../shared/infrastructure/config/EnvironmentConfigService';
import { NotificationUrlParser } from '../services/NotificationUrlParser';
import { CreateNotificationUseCase } from '../useCases/commands/CreateNotificationUseCase';
import { NotificationType } from '@semble/types';
import {
  CardActivityBundle,
  ICardActivityBundleHandler,
} from './ICardActivityBundleHandler';

/**
 * If the card's URL mentions a known user (bluesky post) or a Semble collection,
 * notify the referenced user / collection author. Only fires when the card has
 * no viaCardId (matching prior behavior — viaCard wins).
 */
export class UrlMentionBundleHandler implements ICardActivityBundleHandler {
  constructor(
    private cardRepository: ICardRepository,
    private collectionRepository: ICollectionRepository,
    private userRepository: IUserRepository,
    private identityResolutionService: IIdentityResolutionService,
    private atUriResolutionService: IAtUriResolutionService,
    private configService: EnvironmentConfigService,
    private createNotificationUseCase: CreateNotificationUseCase,
  ) {}

  async handle(bundle: CardActivityBundle): Promise<Result<void>> {
    try {
      const cardIdResult = CardId.createFromString(bundle.cardId);
      if (cardIdResult.isErr()) return ok(undefined);

      const cardResult = await this.cardRepository.findById(cardIdResult.value);
      if (cardResult.isErr() || !cardResult.value) return ok(undefined);

      const card = cardResult.value;
      if (card.viaCardId) return ok(undefined); // viaCard handler covers this
      if (!card.url) return ok(undefined);

      const appUrl = this.configService.getAppConfig().appUrl;
      const parsedUrl = NotificationUrlParser.extractMentionedEntityFromUrl(
        card.url.toString(),
        appUrl,
      );
      if (!parsedUrl) return ok(undefined);

      let recipientDid: string | null = null;
      let notificationType:
        | NotificationType.USER_ADDED_YOUR_BSKY_POST
        | NotificationType.USER_ADDED_YOUR_COLLECTION
        | null = null;

      if (parsedUrl.type === 'BLUESKY_POST') {
        const didOrHandleResult = DIDOrHandle.create(parsedUrl.handleOrDid);
        if (didOrHandleResult.isErr()) return ok(undefined);
        const didOrHandle = didOrHandleResult.value;

        let did: DID;
        if (didOrHandle.isDID) {
          did = didOrHandle.getDID()!;
        } else {
          const resolveResult =
            await this.identityResolutionService.resolveToDID(didOrHandle);
          if (resolveResult.isErr()) return ok(undefined);
          did = resolveResult.value;
        }

        recipientDid = did.value;
        notificationType = NotificationType.USER_ADDED_YOUR_BSKY_POST;
      } else if (parsedUrl.type === 'SEMBLE_COLLECTION') {
        const didOrHandleResult = DIDOrHandle.create(parsedUrl.handleOrDid);
        if (didOrHandleResult.isErr()) return ok(undefined);
        const didOrHandle = didOrHandleResult.value;

        let collectionAuthorDid: DID;
        if (didOrHandle.isDID) {
          collectionAuthorDid = didOrHandle.getDID()!;
        } else {
          const resolveResult =
            await this.identityResolutionService.resolveToDID(didOrHandle);
          if (resolveResult.isErr()) return ok(undefined);
          collectionAuthorDid = resolveResult.value;
        }

        const atprotoCollection =
          this.configService.getAtProtoCollections().collection;
        const atUri = `at://${collectionAuthorDid.value}/${atprotoCollection}/${parsedUrl.rkey}`;

        const collectionIdResult =
          await this.atUriResolutionService.resolveCollectionId(atUri);
        if (collectionIdResult.isErr() || !collectionIdResult.value) {
          return ok(undefined);
        }

        const collectionResult = await this.collectionRepository.findById(
          collectionIdResult.value,
        );
        if (collectionResult.isErr() || !collectionResult.value) {
          return ok(undefined);
        }

        recipientDid = collectionResult.value.authorId.value;
        notificationType = NotificationType.USER_ADDED_YOUR_COLLECTION;
      }

      if (!recipientDid || !notificationType) return ok(undefined);
      if (recipientDid === bundle.actorId) return ok(undefined);

      const recipientDidResult = DID.create(recipientDid);
      if (recipientDidResult.isErr()) return ok(undefined);

      const userResult = await this.userRepository.findByDID(
        recipientDidResult.value,
      );
      if (userResult.isErr() || !userResult.value) return ok(undefined);

      await this.createNotificationUseCase.execute({
        type: notificationType,
        recipientUserId: recipientDid,
        actorUserId: bundle.actorId,
        cardId: bundle.cardId,
        collectionIds:
          bundle.collectionIds.length > 0 ? bundle.collectionIds : undefined,
      });

      return ok(undefined);
    } catch (error) {
      console.error('Error in UrlMentionBundleHandler:', error);
      return ok(undefined);
    }
  }
}
