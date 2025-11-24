import { Result, ok, err } from '../../../../shared/core/Result';
import { Card } from '../Card';
import { Collection } from '../Collection';
import { CuratorId } from '../value-objects/CuratorId';
import { CollectionId } from '../value-objects/CollectionId';
import { CardId } from '../value-objects/CardId';
import { ICollectionRepository } from '../ICollectionRepository';
import { ICollectionPublisher } from '../../application/ports/ICollectionPublisher';
import { ICardRepository } from '../ICardRepository';
import { AppError } from '../../../../shared/core/AppError';
import { DomainService } from '../../../../shared/domain/DomainService';
import {
  PublishedRecordId,
  PublishedRecordIdProps,
} from '../value-objects/PublishedRecordId';
import { AuthenticationError } from '../../../../shared/core/AuthenticationError';

export interface CardCollectionServiceOptions {
  skipPublishing?: boolean;
  publishedRecordIds?: Map<string, PublishedRecordId>; // collectionId -> publishedRecordId
}

export class CardCollectionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CardCollectionValidationError';
  }
}

export class CardCollectionService implements DomainService {
  constructor(
    private collectionRepository: ICollectionRepository,
    private collectionPublisher: ICollectionPublisher,
    private cardRepository: ICardRepository,
  ) {}

  async addCardToCollection(
    card: Card,
    collectionId: CollectionId,
    curatorId: CuratorId,
    viaCardId?: CardId,
    options?: CardCollectionServiceOptions,
  ): Promise<
    Result<
      Collection,
      | CardCollectionValidationError
      | AuthenticationError
      | AppError.UnexpectedError
    >
  > {
    try {
      // Find the collection
      const collectionResult =
        await this.collectionRepository.findById(collectionId);
      if (collectionResult.isErr()) {
        return err(AppError.UnexpectedError.create(collectionResult.error));
      }

      const collection = collectionResult.value;
      if (!collection) {
        return err(
          new CardCollectionValidationError(
            `Collection not found: ${collectionId.getStringValue()}`,
          ),
        );
      }

      // Add card to collection
      const addCardResult = collection.addCard(
        card.cardId,
        curatorId,
        viaCardId,
      );
      if (addCardResult.isErr()) {
        return err(
          new CardCollectionValidationError(
            `Failed to add card to collection: ${addCardResult.error.message}`,
          ),
        );
      }

      // Handle publishing based on options
      if (options?.skipPublishing && options?.publishedRecordIds) {
        const publishedRecordId = options.publishedRecordIds.get(
          collectionId.getStringValue(),
        );
        if (publishedRecordId) {
          // Skip publishing and use provided record ID
          collection.markCardLinkAsPublished(card.cardId, publishedRecordId);
        }
      } else {
        // Resolve via card published record ID if needed
        let viaCardPublishedRecordId: PublishedRecordIdProps | undefined;
        if (viaCardId) {
          const viaCardResult = await this.cardRepository.findById(viaCardId);
          if (viaCardResult.isOk() && viaCardResult.value?.publishedRecordId) {
            viaCardPublishedRecordId =
              viaCardResult.value.publishedRecordId.getValue();
          }
        }

        // Publish the collection link normally
        const publishLinkResult =
          await this.collectionPublisher.publishCardAddedToCollection(
            card,
            collection,
            curatorId,
            viaCardPublishedRecordId,
          );
        if (publishLinkResult.isErr()) {
          // Propagate authentication errors
          if (publishLinkResult.error instanceof AuthenticationError) {
            return err(publishLinkResult.error);
          }
          return err(
            new CardCollectionValidationError(
              `Failed to publish collection link: ${publishLinkResult.error.message}`,
            ),
          );
        }

        // Mark the card link as published in the collection
        collection.markCardLinkAsPublished(
          card.cardId,
          publishLinkResult.value,
        );
      }

      // Save the updated collection
      const saveCollectionResult =
        await this.collectionRepository.save(collection);
      if (saveCollectionResult.isErr()) {
        return err(AppError.UnexpectedError.create(saveCollectionResult.error));
      }

      return ok(collection);
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  async addCardToCollections(
    card: Card,
    collectionIds: CollectionId[],
    curatorId: CuratorId,
    viaCardId?: CardId,
    options?: CardCollectionServiceOptions,
  ): Promise<
    Result<
      Collection[],
      | CardCollectionValidationError
      | AuthenticationError
      | AppError.UnexpectedError
    >
  > {
    const updatedCollections: Collection[] = [];

    for (const collectionId of collectionIds) {
      const result = await this.addCardToCollection(
        card,
        collectionId,
        curatorId,
        viaCardId,
        options,
      );
      if (result.isErr()) {
        return err(result.error);
      }
      updatedCollections.push(result.value);
    }
    return ok(updatedCollections);
  }

  async removeCardFromCollection(
    card: Card,
    collectionId: CollectionId,
    curatorId: CuratorId,
    options?: CardCollectionServiceOptions,
  ): Promise<
    Result<
      Collection | null,
      | CardCollectionValidationError
      | AuthenticationError
      | AppError.UnexpectedError
    >
  > {
    try {
      // Find the collection
      const collectionResult =
        await this.collectionRepository.findById(collectionId);
      if (collectionResult.isErr()) {
        return err(AppError.UnexpectedError.create(collectionResult.error));
      }

      const collection = collectionResult.value;
      if (!collection) {
        return err(
          new CardCollectionValidationError(
            `Collection not found: ${collectionId.getStringValue()}`,
          ),
        );
      }

      // Check if card is in collection
      const cardLink = collection.cardLinks.find((link) =>
        link.cardId.equals(card.cardId),
      );
      if (!cardLink) {
        // Card is not in collection, nothing to do
        return ok(null);
      }

      // Handle unpublishing based on options
      if (!options?.skipPublishing && cardLink.publishedRecordId) {
        const unpublishLinkResult =
          await this.collectionPublisher.unpublishCardAddedToCollection(
            cardLink.publishedRecordId,
          );
        if (unpublishLinkResult.isErr()) {
          // Propagate authentication errors
          if (unpublishLinkResult.error instanceof AuthenticationError) {
            return err(unpublishLinkResult.error);
          }
          return err(
            new CardCollectionValidationError(
              `Failed to unpublish collection link: ${unpublishLinkResult.error.message}`,
            ),
          );
        }
      }

      // Remove card from collection
      const removeCardResult = collection.removeCard(card.cardId, curatorId);
      if (removeCardResult.isErr()) {
        return err(
          new CardCollectionValidationError(
            `Failed to remove card from collection: ${removeCardResult.error.message}`,
          ),
        );
      }

      // Save the updated collection
      const saveCollectionResult =
        await this.collectionRepository.save(collection);
      if (saveCollectionResult.isErr()) {
        return err(AppError.UnexpectedError.create(saveCollectionResult.error));
      }

      return ok(collection);
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  async removeCardFromCollections(
    card: Card,
    collectionIds: CollectionId[],
    curatorId: CuratorId,
    options?: CardCollectionServiceOptions,
  ): Promise<
    Result<
      Collection[],
      | CardCollectionValidationError
      | AuthenticationError
      | AppError.UnexpectedError
    >
  > {
    const updatedCollections: Collection[] = [];

    for (const collectionId of collectionIds) {
      const result = await this.removeCardFromCollection(
        card,
        collectionId,
        curatorId,
        options,
      );
      if (result.isErr()) {
        return err(result.error);
      }
      if (result.value !== null) {
        updatedCollections.push(result.value);
      }
    }
    return ok(updatedCollections);
  }
}
