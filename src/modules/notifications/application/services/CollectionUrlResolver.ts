import { EnvironmentConfigService } from '../../../../shared/infrastructure/config/EnvironmentConfigService';
import { IIdentityResolutionService } from '../../../atproto/domain/services/IIdentityResolutionService';
import { IAtUriResolutionService } from '../../../cards/domain/services/IAtUriResolutionService';
import { ICollectionRepository } from '../../../cards/domain/ICollectionRepository';
import { DIDOrHandle } from '../../../atproto/domain/DIDOrHandle';
import { DID } from '../../../atproto/domain/DID';
import { NotificationUrlParser } from './NotificationUrlParser';

export interface ResolvedCollection {
  collectionId: string;
  authorDid: string;
}

/**
 * Resolves a candidate URL into a Semble collection (id + author DID) if the URL
 * matches the SEMBLE_COLLECTION pattern AND the collection exists in our system.
 * Returns null otherwise. Shared by subscription / connection notification paths
 * to avoid divergence across handlers.
 */
export class CollectionUrlResolver {
  constructor(
    private identityResolutionService: IIdentityResolutionService,
    private atUriResolutionService: IAtUriResolutionService,
    private collectionRepository: ICollectionRepository,
    private configService: EnvironmentConfigService,
  ) {}

  async resolve(url: string): Promise<ResolvedCollection | null> {
    const appUrl = this.configService.getAppConfig().appUrl;
    const parsed = NotificationUrlParser.extractMentionedEntityFromUrl(
      url,
      appUrl,
    );
    if (!parsed || parsed.type !== 'SEMBLE_COLLECTION') return null;

    const didOrHandleResult = DIDOrHandle.create(parsed.handleOrDid);
    if (didOrHandleResult.isErr()) return null;
    const didOrHandle = didOrHandleResult.value;

    let authorDid: DID;
    if (didOrHandle.isDID) {
      authorDid = didOrHandle.getDID()!;
    } else {
      const resolveResult =
        await this.identityResolutionService.resolveToDID(didOrHandle);
      if (resolveResult.isErr()) return null;
      authorDid = resolveResult.value;
    }

    const atprotoCollection =
      this.configService.getAtProtoCollections().collection;
    const atUri = `at://${authorDid.value}/${atprotoCollection}/${parsed.rkey}`;

    const collectionIdResult =
      await this.atUriResolutionService.resolveCollectionId(atUri);
    if (collectionIdResult.isErr() || !collectionIdResult.value) return null;

    const collection = await this.collectionRepository.findById(
      collectionIdResult.value,
    );
    if (collection.isErr() || !collection.value) return null;

    return {
      collectionId: collection.value.collectionId.getStringValue(),
      authorDid: collection.value.authorId.value,
    };
  }
}
