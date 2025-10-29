import { Result, ok, err } from '../../../../shared/core/Result';
import { Card } from '../Card';
import { Collection } from '../Collection';
import { CuratorId } from '../value-objects/CuratorId';
import { CollectionId } from '../value-objects/CollectionId';
import { ICollectionRepository } from '../ICollectionRepository';
import { ICollectionPublisher } from '../../application/ports/ICollectionPublisher';
import { AppError } from '../../../../shared/core/AppError';
import { DomainService } from '../../../../shared/domain/DomainService';
import { AuthenticationError } from '../../../../shared/core/AuthenticationError';

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
  ) {}

  async addCardToCollection(
    card: Card,
    collectionId: CollectionId,
    curatorId: CuratorId,
  ): Promise<
    Result<Collection, CardCollectionValidationError | AuthenticationError | AppError.UnexpectedError>
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
      const addCardResult = collection.addCard(card.cardId, curatorId);
      if (addCardResult.isErr()) {
        return err(
          new CardCollectionValidationError(
            `Failed to add card to collection: ${addCardResult.error.message}`,
          ),
        );
      }

      // Publish the collection link
      const publishLinkResult =
        await this.collectionPublisher.publishCardAddedToCollection(
          card,
          collection,
          curatorId,
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
      collection.markCardLinkAsPublished(card.cardId, publishLinkResult.value);

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
  ): Promise<
    Result<
      Collection[],
      CardCollectionValidationError | AuthenticationError | AppError.UnexpectedError
    >
  > {
    const updatedCollections: Collection[] = [];

    for (const collectionId of collectionIds) {
      const result = await this.addCardToCollection(
        card,
        collectionId,
        curatorId,
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
  ): Promise<
    Result<
      Collection | null,
      CardCollectionValidationError | AuthenticationError | AppError.UnexpectedError
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

      // If the card link was published, unpublish it
      if (cardLink.publishedRecordId) {
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
  ): Promise<
    Result<
      Collection[],
      CardCollectionValidationError | AuthenticationError | AppError.UnexpectedError
    >
  > {
    const updatedCollections: Collection[] = [];

    for (const collectionId of collectionIds) {
      const result = await this.removeCardFromCollection(
        card,
        collectionId,
        curatorId,
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
