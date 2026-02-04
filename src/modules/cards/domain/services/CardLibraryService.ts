import { Result, ok, err } from '../../../../shared/core/Result';
import { Card } from '../Card';
import { CuratorId } from '../value-objects/CuratorId';
import { ICardPublisher } from '../../application/ports/ICardPublisher';
import { ICardRepository } from '../ICardRepository';
import { ICollectionRepository } from '../ICollectionRepository';
import { AppError } from '../../../../shared/core/AppError';
import { DomainService } from '../../../../shared/domain/DomainService';
import { CardCollectionService } from './CardCollectionService';
import { PublishedRecordId } from '../value-objects/PublishedRecordId';
import { AuthenticationError } from '../../../../shared/core/AuthenticationError';

export interface CardLibraryServiceOptions {
  skipPublishing?: boolean;
  publishedRecordId?: PublishedRecordId;
  skipUnpublishing?: boolean;
  skipCollectionUnpublishing?: boolean;
  timestamp?: Date;
}

export class CardLibraryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CardLibraryValidationError';
  }
}

export class CardLibraryService implements DomainService {
  constructor(
    private cardRepository: ICardRepository,
    private cardPublisher: ICardPublisher,
    private collectionRepository: ICollectionRepository,
    private cardCollectionService: CardCollectionService,
  ) {}

  async updateCardInLibrary(
    card: Card,
    curatorId: CuratorId,
    options?: CardLibraryServiceOptions,
  ): Promise<
    Result<
      Card,
      | CardLibraryValidationError
      | AuthenticationError
      | AppError.UnexpectedError
    >
  > {
    try {
      // Check if card is in curator's library
      const isInLibrary = card.isInLibrary(curatorId);
      const libraryInfo = card.getLibraryInfo(curatorId);

      if (!isInLibrary) {
        return err(
          new CardLibraryValidationError(
            'Card is not in library and cannot be updated',
          ),
        );
      }

      let parentCardPublishedRecordId: PublishedRecordId | undefined =
        undefined;
      let viaCardPublishedRecordId: PublishedRecordId | undefined = undefined;

      if (card.parentCardId) {
        // Ensure parent card is in the curator's library
        const parentCardResult = await this.cardRepository.findById(
          card.parentCardId,
        );
        if (parentCardResult.isErr()) {
          return err(
            new CardLibraryValidationError(
              `Failed to fetch parent card: ${parentCardResult.error.message}`,
            ),
          );
        }
        const parentCardValue = parentCardResult.value;

        if (!parentCardValue) {
          return err(new CardLibraryValidationError(`Parent card not found`));
        }
        parentCardPublishedRecordId = parentCardValue.publishedRecordId;
      }

      if (card.viaCardId) {
        // Get via card published record ID
        const viaCardResult = await this.cardRepository.findById(
          card.viaCardId,
        );
        if (viaCardResult.isErr()) {
          return err(
            new CardLibraryValidationError(
              `Failed to fetch via card: ${viaCardResult.error.message}`,
            ),
          );
        }
        const viaCardValue = viaCardResult.value;

        if (!viaCardValue) {
          return err(new CardLibraryValidationError(`Via card not found`));
        }
        viaCardPublishedRecordId = viaCardValue.publishedRecordId;
      }

      if (libraryInfo?.publishedRecordId) {
        // Handle republishing based on options
        if (options?.skipPublishing && options?.publishedRecordId) {
          // Skip republishing and use provided record ID
          const updatePublishedResult = card.markCardInLibraryAsPublished(
            curatorId,
            options.publishedRecordId,
          );
          if (updatePublishedResult.isErr()) {
            return err(
              new CardLibraryValidationError(
                `Failed to update published record: ${updatePublishedResult.error.message}`,
              ),
            );
          }
        } else {
          // Card is published - republish to update it
          const republishResult = await this.cardPublisher.publishCardToLibrary(
            card,
            curatorId,
            parentCardPublishedRecordId,
            viaCardPublishedRecordId,
          );
          if (republishResult.isErr()) {
            if (republishResult.error instanceof AuthenticationError) {
              return err(republishResult.error);
            }
            return err(
              new CardLibraryValidationError(
                `Failed to republish updated card: ${republishResult.error.message}`,
              ),
            );
          }

          // Update the published record ID if it changed
          const updatePublishedResult = card.markCardInLibraryAsPublished(
            curatorId,
            republishResult.value,
          );
          if (updatePublishedResult.isErr()) {
            return err(
              new CardLibraryValidationError(
                `Failed to update published record: ${updatePublishedResult.error.message}`,
              ),
            );
          }
        }
      }

      // Save updated card
      const saveResult = await this.cardRepository.save(card);
      if (saveResult.isErr()) {
        return err(AppError.UnexpectedError.create(saveResult.error));
      }

      return ok(card);
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  async addCardToLibrary(
    card: Card,
    curatorId: CuratorId,
    options?: CardLibraryServiceOptions,
  ): Promise<
    Result<
      Card,
      | CardLibraryValidationError
      | AuthenticationError
      | AppError.UnexpectedError
    >
  > {
    try {
      // Check if card is already in curator's library
      const isInLibrary = card.isInLibrary(curatorId);
      const libraryInfo = card.getLibraryInfo(curatorId);

      let parentCardPublishedRecordId: PublishedRecordId | undefined =
        undefined;
      let viaCardPublishedRecordId: PublishedRecordId | undefined = undefined;

      if (card.parentCardId) {
        // Ensure parent card is in the curator's library
        const parentCardResult = await this.cardRepository.findById(
          card.parentCardId,
        );
        if (parentCardResult.isErr()) {
          return err(
            new CardLibraryValidationError(
              `Failed to fetch parent card: ${parentCardResult.error.message}`,
            ),
          );
        }
        const parentCardValue = parentCardResult.value;

        if (!parentCardValue) {
          return err(new CardLibraryValidationError(`Parent card not found`));
        }
        parentCardPublishedRecordId = parentCardValue.publishedRecordId;
      }

      if (card.viaCardId) {
        // Get via card published record ID
        const viaCardResult = await this.cardRepository.findById(
          card.viaCardId,
        );
        if (viaCardResult.isErr()) {
          return err(
            new CardLibraryValidationError(
              `Failed to fetch via card: ${viaCardResult.error.message}`,
            ),
          );
        }
        const viaCardValue = viaCardResult.value;

        if (!viaCardValue) {
          return err(new CardLibraryValidationError(`Via card not found`));
        }
        viaCardPublishedRecordId = viaCardValue.publishedRecordId;
      }

      if (isInLibrary && libraryInfo?.publishedRecordId) {
        // Card is already in library and published - republish to update it
        const republishResult = await this.cardPublisher.publishCardToLibrary(
          card,
          curatorId,
          parentCardPublishedRecordId,
          viaCardPublishedRecordId,
        );
        if (republishResult.isErr()) {
          if (republishResult.error instanceof AuthenticationError) {
            return err(republishResult.error);
          }
          return err(
            new CardLibraryValidationError(
              `Failed to republish updated card: ${republishResult.error.message}`,
            ),
          );
        }

        // Update the published record ID if it changed
        const updatePublishedResult = card.markCardInLibraryAsPublished(
          curatorId,
          republishResult.value,
        );
        if (updatePublishedResult.isErr()) {
          return err(
            new CardLibraryValidationError(
              `Failed to update published record: ${updatePublishedResult.error.message}`,
            ),
          );
        }

        // Save updated card
        const saveResult = await this.cardRepository.save(card);
        if (saveResult.isErr()) {
          return err(AppError.UnexpectedError.create(saveResult.error));
        }

        return ok(card);
      }

      if (isInLibrary) {
        // Card is already in library but not published, nothing to do
        return ok(card);
      }
      const addToLibResult = card.addToLibrary(curatorId, options?.timestamp);
      if (addToLibResult.isErr()) {
        return err(
          new CardLibraryValidationError(
            `Failed to add card to library: ${addToLibResult.error.message}`,
          ),
        );
      }

      // Handle publishing based on options
      if (options?.skipPublishing && options?.publishedRecordId) {
        // Skip publishing and use provided record ID
        const markCardAsPublishedResult = card.markCardInLibraryAsPublished(
          curatorId,
          options.publishedRecordId,
        );
        if (markCardAsPublishedResult.isErr()) {
          return err(
            new CardLibraryValidationError(
              `Failed to mark card as published in library: ${markCardAsPublishedResult.error.message}`,
            ),
          );
        }
      } else {
        // Publish card to library normally
        const publishResult = await this.cardPublisher.publishCardToLibrary(
          card,
          curatorId,
          parentCardPublishedRecordId,
          viaCardPublishedRecordId,
        );
        if (publishResult.isErr()) {
          // Propagate authentication errors
          if (publishResult.error instanceof AuthenticationError) {
            return err(publishResult.error);
          }
          return err(
            new CardLibraryValidationError(
              `Failed to publish card to library: ${publishResult.error.message}`,
            ),
          );
        }

        // Mark card as published in library
        const markCardAsPublishedResult = card.markCardInLibraryAsPublished(
          curatorId,
          publishResult.value,
        );
        if (markCardAsPublishedResult.isErr()) {
          return err(
            new CardLibraryValidationError(
              `Failed to mark card as published in library: ${markCardAsPublishedResult.error.message}`,
            ),
          );
        }
      }

      // Save updated card
      const saveResult = await this.cardRepository.save(card);
      if (saveResult.isErr()) {
        return err(AppError.UnexpectedError.create(saveResult.error));
      }

      return ok(card);
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  async removeCardFromLibrary(
    card: Card,
    curatorId: CuratorId,
    options?: CardLibraryServiceOptions,
  ): Promise<
    Result<
      Card,
      | CardLibraryValidationError
      | AuthenticationError
      | AppError.UnexpectedError
    >
  > {
    try {
      // Check if card is in curator's library
      const isInLibrary = card.isInLibrary(curatorId);

      if (!isInLibrary) {
        // Card is not in library, nothing to do
        return ok(card);
      }

      // Get all collections owned by the curator that contain this card
      const collectionsResult =
        await this.collectionRepository.findByCuratorIdContainingCard(
          curatorId,
          card.cardId,
        );
      if (collectionsResult.isErr()) {
        return err(AppError.UnexpectedError.create(collectionsResult.error));
      }

      // Remove card from all curator's collections
      const collections = collectionsResult.value;
      const collectionIds = collections.map(
        (collection) => collection.collectionId,
      );

      if (collectionIds.length > 0) {
        const removeFromCollectionsResult =
          await this.cardCollectionService.removeCardFromCollections(
            card,
            collectionIds,
            curatorId,
            { skipPublishing: options?.skipCollectionUnpublishing },
          );
        if (removeFromCollectionsResult.isErr()) {
          return err(
            new CardLibraryValidationError(
              `Failed to remove card from collections: ${removeFromCollectionsResult.error.message}`,
            ),
          );
        }
      }

      // Handle cascading removal for URL cards
      if (card.isUrlCard && card.url) {
        const noteCardResult = await this.cardRepository.findUsersNoteCardByUrl(
          card.url,
          curatorId,
        );

        if (noteCardResult.isOk() && noteCardResult.value) {
          const noteCard = noteCardResult.value;

          // Recursively remove note card from library (this will handle its unpublishing)
          const removeNoteResult = await this.removeCardFromLibrary(
            noteCard,
            curatorId,
            options, // Pass the options down to maintain skipUnpublishing behavior
          );
          if (removeNoteResult.isErr()) {
            return err(
              new CardLibraryValidationError(
                `Failed to remove associated note card: ${removeNoteResult.error.message}`,
              ),
            );
          }
        }
      }

      // Handle unpublishing based on options
      const libraryInfo = card.getLibraryInfo(curatorId);
      if (libraryInfo?.publishedRecordId && !options?.skipUnpublishing) {
        // Unpublish card from library
        const unpublishResult =
          await this.cardPublisher.unpublishCardFromLibrary(
            libraryInfo.publishedRecordId,
            libraryInfo.curatorId,
          );
        if (unpublishResult.isErr()) {
          // Propagate authentication errors
          if (unpublishResult.error instanceof AuthenticationError) {
            return err(unpublishResult.error);
          }
          return err(
            new CardLibraryValidationError(
              `Failed to unpublish card from library: ${unpublishResult.error.message}`,
            ),
          );
        }
      }

      // Remove card from library
      const removeResult = card.removeFromLibrary(curatorId);
      if (removeResult.isErr()) {
        return err(
          new CardLibraryValidationError(
            `Failed to remove card from library: ${removeResult.error.message}`,
          ),
        );
      }

      // Save updated card
      const saveResult = await this.cardRepository.save(card);
      if (saveResult.isErr()) {
        return err(AppError.UnexpectedError.create(saveResult.error));
      }

      return ok(card);
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
