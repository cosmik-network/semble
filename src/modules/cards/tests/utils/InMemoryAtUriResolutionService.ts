import { Result, ok, err } from '../../../../shared/core/Result';
import {
  IAtUriResolutionService,
  AtUriResourceType,
  AtUriResolutionResult,
} from '../../domain/services/IAtUriResolutionService';
import { CollectionId } from '../../domain/value-objects/CollectionId';
import { CardId } from '../../domain/value-objects/CardId';
import { ConnectionId } from '../../domain/value-objects/ConnectionId';
import { FollowTargetType } from '../../../user/domain/value-objects/FollowTargetType';
import { InMemoryCollectionRepository } from './InMemoryCollectionRepository';
import { InMemoryCardRepository } from './InMemoryCardRepository';
import { InMemoryConnectionRepository } from './InMemoryConnectionRepository';

export class InMemoryAtUriResolutionService implements IAtUriResolutionService {
  constructor(
    private collectionRepository: InMemoryCollectionRepository,
    private cardRepository: InMemoryCardRepository,
    private connectionRepository: InMemoryConnectionRepository,
  ) {}

  async resolveAtUri(
    atUri: string,
  ): Promise<Result<AtUriResolutionResult | null>> {
    try {
      // Check cards first
      const allCards = this.cardRepository.getAllCards();
      for (const card of allCards) {
        if (card.publishedRecordId?.uri === atUri) {
          return ok({
            type: AtUriResourceType.CARD,
            id: card.cardId,
          });
        }
      }

      // Check collections
      const allCollections = this.collectionRepository.getAllCollections();
      for (const collection of allCollections) {
        if (collection.publishedRecordId?.uri === atUri) {
          return ok({
            type: AtUriResourceType.COLLECTION,
            id: collection.collectionId,
          });
        }

        // Check collection links (cards within collections)
        for (const cardLink of collection.cardLinks) {
          if (cardLink.publishedRecordId?.uri === atUri) {
            return ok({
              type: AtUriResourceType.COLLECTION_LINK,
              id: {
                collectionId: collection.collectionId,
                cardId: cardLink.cardId,
              },
            });
          }
        }
      }

      // Check connections
      const allConnections = this.connectionRepository.getAllConnections();
      for (const connection of allConnections) {
        if (connection.publishedRecordId?.uri === atUri) {
          return ok({
            type: AtUriResourceType.CONNECTION,
            id: connection.connectionId,
          });
        }
      }

      return ok(null);
    } catch (error) {
      return err(error as Error);
    }
  }

  async resolveCollectionId(
    atUri: string,
  ): Promise<Result<CollectionId | null>> {
    const result = await this.resolveAtUri(atUri);

    if (result.isErr()) {
      return err(result.error);
    }

    if (!result.value || result.value.type !== AtUriResourceType.COLLECTION) {
      return ok(null);
    }

    return ok(result.value.id as CollectionId);
  }

  async resolveCardId(atUri: string): Promise<Result<CardId | null>> {
    const result = await this.resolveAtUri(atUri);

    if (result.isErr()) {
      return err(result.error);
    }

    if (!result.value || result.value.type !== AtUriResourceType.CARD) {
      return ok(null);
    }

    return ok(result.value.id as CardId);
  }

  async resolveCollectionLinkId(
    atUri: string,
  ): Promise<Result<{ collectionId: CollectionId; cardId: CardId } | null>> {
    const result = await this.resolveAtUri(atUri);

    if (result.isErr()) {
      return err(result.error);
    }

    if (
      !result.value ||
      result.value.type !== AtUriResourceType.COLLECTION_LINK
    ) {
      return ok(null);
    }

    return ok(
      result.value.id as { collectionId: CollectionId; cardId: CardId },
    );
  }

  async resolveFollowId(atUri: string): Promise<
    Result<{
      followerDid: string;
      targetId: string;
      targetType: FollowTargetType;
    } | null>
  > {
    // For testing purposes, return null (follow not found)
    // In a real implementation, this would search through follow records
    return ok(null);
  }

  async resolveConnectionId(
    atUri: string,
  ): Promise<Result<ConnectionId | null>> {
    const result = await this.resolveAtUri(atUri);

    if (result.isErr()) {
      return err(result.error);
    }

    if (!result.value || result.value.type !== AtUriResourceType.CONNECTION) {
      return ok(null);
    }

    return ok(result.value.id as ConnectionId);
  }
}
