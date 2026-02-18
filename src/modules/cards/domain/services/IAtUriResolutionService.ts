import { Result } from 'src/shared/core/Result';
import { CollectionId } from '../value-objects/CollectionId';

import { CardId } from '../value-objects/CardId';
import { FollowTargetType } from '../../../user/domain/value-objects/FollowTargetType';

export enum AtUriResourceType {
  CARD = 'card',
  COLLECTION = 'collection',
  COLLECTION_LINK = 'collection_link',
}

export interface AtUriResolutionResult {
  type: AtUriResourceType;
  id: CollectionId | CardId | { collectionId: CollectionId; cardId: CardId };
}

export interface IAtUriResolutionService {
  resolveAtUri(atUri: string): Promise<Result<AtUriResolutionResult | null>>;

  // Convenience methods for specific types
  resolveCardId(atUri: string): Promise<Result<CardId | null>>;
  resolveCollectionId(atUri: string): Promise<Result<CollectionId | null>>;
  resolveCollectionLinkId(
    atUri: string,
  ): Promise<Result<{ collectionId: CollectionId; cardId: CardId } | null>>;
  resolveFollowId(atUri: string): Promise<
    Result<{
      followerDid: string;
      targetId: string;
      targetType: FollowTargetType;
    } | null>
  >;
}
