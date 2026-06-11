import { ICardRepository } from '../../../cards/domain/ICardRepository';
import { ICollectionRepository } from '../../../cards/domain/ICollectionRepository';
import { IUserRepository } from '../../../user/domain/repositories/IUserRepository';
import { IIdentityResolutionService } from '../../../atproto/domain/services/IIdentityResolutionService';
import { IAtUriResolutionService } from '../../../cards/domain/services/IAtUriResolutionService';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';
import { CollectionAccessType } from '../../../cards/domain/Collection';
import { DIDOrHandle } from '../../../atproto/domain/DIDOrHandle';
import { DID } from '../../../atproto/domain/DID';
import { EnvironmentConfigService } from '../../../../shared/infrastructure/config/EnvironmentConfigService';
import { NotificationUrlParser } from './NotificationUrlParser';
import { CardActivityBundle } from '../bundleHandlers/ICardActivityBundleHandler';

/**
 * Resolves the set of recipients that will receive a "specific" notification
 * for a card-activity bundle (via-card curator, URL-mention author, OPEN-
 * collection authors). Consumed by SubscriptionBundleHandler as an exclusion
 * set so subscribers who already get a specific notification don't also get
 * the generic subscription one.
 */
export class BundleRecipientResolver {
  constructor(
    private cardRepository: ICardRepository,
    private collectionRepository: ICollectionRepository,
    private userRepository: IUserRepository,
    private identityResolutionService: IIdentityResolutionService,
    private atUriResolutionService: IAtUriResolutionService,
    private configService: EnvironmentConfigService,
  ) {}

  async resolveSpecificRecipients(
    bundle: CardActivityBundle,
  ): Promise<Set<string>> {
    const recipients = new Set<string>();

    const cardIdResult = CardId.createFromString(bundle.cardId);
    if (cardIdResult.isErr()) return recipients;

    const cardResult = await this.cardRepository.findById(cardIdResult.value);
    if (cardResult.isErr() || !cardResult.value) {
      await this.addOpenCollectionAuthors(bundle, recipients);
      return recipients;
    }

    const card = cardResult.value;

    if (card.viaCardId) {
      const viaCardResult = await this.cardRepository.findById(card.viaCardId);
      if (viaCardResult.isOk() && viaCardResult.value) {
        recipients.add(viaCardResult.value.curatorId.value);
      }
    } else if (card.url) {
      const mentionedDid = await this.resolveMentionedAuthor(
        card.url.toString(),
      );
      if (mentionedDid) recipients.add(mentionedDid);
    }

    await this.addOpenCollectionAuthors(bundle, recipients);
    return recipients;
  }

  private async addOpenCollectionAuthors(
    bundle: CardActivityBundle,
    recipients: Set<string>,
  ): Promise<void> {
    for (const collectionIdStr of bundle.collectionIds) {
      const collectionIdResult = CollectionId.createFromString(collectionIdStr);
      if (collectionIdResult.isErr()) continue;
      const collectionResult = await this.collectionRepository.findById(
        collectionIdResult.value,
      );
      if (collectionResult.isErr() || !collectionResult.value) continue;
      const collection = collectionResult.value;
      if (collection.accessType !== CollectionAccessType.OPEN) continue;
      recipients.add(collection.authorId.value);
    }
  }

  private async resolveMentionedAuthor(url: string): Promise<string | null> {
    const appUrl = this.configService.getAppConfig().appUrl;
    const parsed = NotificationUrlParser.extractMentionedEntityFromUrl(
      url,
      appUrl,
    );
    if (!parsed) return null;

    const didOrHandleResult = DIDOrHandle.create(parsed.handleOrDid);
    if (didOrHandleResult.isErr()) return null;
    const didOrHandle = didOrHandleResult.value;

    let did: DID;
    if (didOrHandle.isDID) {
      did = didOrHandle.getDID()!;
    } else {
      const resolveResult =
        await this.identityResolutionService.resolveToDID(didOrHandle);
      if (resolveResult.isErr()) return null;
      did = resolveResult.value;
    }

    if (parsed.type === 'BLUESKY_POST') {
      const userResult = await this.userRepository.findByDID(did);
      if (userResult.isErr() || !userResult.value) return null;
      return did.value;
    }

    // SEMBLE_COLLECTION — resolve to collection and return its author DID.
    const atprotoCollection =
      this.configService.getAtProtoCollections().collection;
    const atUri = `at://${did.value}/${atprotoCollection}/${parsed.rkey}`;
    const collectionIdResult =
      await this.atUriResolutionService.resolveCollectionId(atUri);
    if (collectionIdResult.isErr() || !collectionIdResult.value) return null;
    const collectionResult = await this.collectionRepository.findById(
      collectionIdResult.value,
    );
    if (collectionResult.isErr() || !collectionResult.value) return null;
    return collectionResult.value.authorId.value;
  }
}
