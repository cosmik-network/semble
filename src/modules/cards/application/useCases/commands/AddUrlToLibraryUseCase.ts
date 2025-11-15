import { Result, ok, err } from '../../../../../shared/core/Result';
import { BaseUseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IEventPublisher } from '../../../../../shared/application/events/IEventPublisher';
import { ICardRepository } from '../../../domain/ICardRepository';
import {
  CardFactory,
  IUrlCardInput,
  INoteCardInput,
} from '../../../domain/CardFactory';
import { CollectionId } from '../../../domain/value-objects/CollectionId';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { IMetadataService } from '../../../domain/services/IMetadataService';
import { CardTypeEnum } from '../../../domain/value-objects/CardType';
import { URL } from '../../../domain/value-objects/URL';
import { CardLibraryService } from '../../../domain/services/CardLibraryService';
import { CardCollectionService } from '../../../domain/services/CardCollectionService';
import { CardContent } from '../../../domain/value-objects/CardContent';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';
import { Card } from 'src/modules/cards/domain/Card';

export interface AddUrlToLibraryDTO {
  url: string;
  note?: string;
  collectionIds?: string[];
  curatorId: string;
}

export interface AddUrlToLibraryResponseDTO {
  urlCardId: string;
  noteCardId?: string;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class AddUrlToLibraryUseCase extends BaseUseCase<
  AddUrlToLibraryDTO,
  Result<
    AddUrlToLibraryResponseDTO,
    ValidationError | AuthenticationError | AppError.UnexpectedError
  >
> {
  constructor(
    private cardRepository: ICardRepository,
    private metadataService: IMetadataService,
    private cardLibraryService: CardLibraryService,
    private cardCollectionService: CardCollectionService,
    eventPublisher: IEventPublisher,
  ) {
    super(eventPublisher);
  }

  async execute(
    request: AddUrlToLibraryDTO,
  ): Promise<
    Result<
      AddUrlToLibraryResponseDTO,
      ValidationError | AuthenticationError | AppError.UnexpectedError
    >
  > {
    try {
      // Validate and create CuratorId
      const curatorIdResult = CuratorId.create(request.curatorId);
      if (curatorIdResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid curator ID: ${curatorIdResult.error.message}`,
          ),
        );
      }
      const curatorId = curatorIdResult.value;

      // Validate URL
      const urlResult = URL.create(request.url);
      if (urlResult.isErr()) {
        return err(
          new ValidationError(`Invalid URL: ${urlResult.error.message}`),
        );
      }
      const url = urlResult.value;

      // Check if URL card already exists
      const existingUrlCardResult =
        await this.cardRepository.findUsersUrlCardByUrl(url, curatorId);
      if (existingUrlCardResult.isErr()) {
        return err(
          AppError.UnexpectedError.create(existingUrlCardResult.error),
        );
      }

      let urlCard = existingUrlCardResult.value;
      let isNewUrlCard = false;

      if (!urlCard) {
        // Fetch metadata for URL
        const metadataResult = await this.metadataService.fetchMetadata(url);
        if (metadataResult.isErr()) {
          return err(
            new ValidationError(
              `Failed to fetch metadata: ${metadataResult.error.message}`,
            ),
          );
        }

        // Create URL card
        const urlCardInput: IUrlCardInput = {
          type: CardTypeEnum.URL,
          url: url.value,
          metadata: metadataResult.value,
        };

        const urlCardResult = CardFactory.create({
          curatorId: request.curatorId,
          cardInput: urlCardInput,
        });

        if (urlCardResult.isErr()) {
          return err(new ValidationError(urlCardResult.error.message));
        }

        urlCard = urlCardResult.value;
        isNewUrlCard = true;

        // Save URL card
        const saveUrlCardResult = await this.cardRepository.save(urlCard);
        if (saveUrlCardResult.isErr()) {
          return err(AppError.UnexpectedError.create(saveUrlCardResult.error));
        }
      }

      // Add URL card to library using domain service
      const addUrlCardToLibraryResult =
        await this.cardLibraryService.addCardToLibrary(urlCard, curatorId);
      if (addUrlCardToLibraryResult.isErr()) {
        // Rollback: Delete the URL card if we created it
        if (isNewUrlCard) {
          await this.rollbackUrlCard(urlCard, curatorId);
        }

        // Propagate authentication errors
        if (addUrlCardToLibraryResult.error instanceof AuthenticationError) {
          return err(addUrlCardToLibraryResult.error);
        }
        if (
          addUrlCardToLibraryResult.error instanceof AppError.UnexpectedError
        ) {
          return err(addUrlCardToLibraryResult.error);
        }
        return err(
          new ValidationError(addUrlCardToLibraryResult.error.message),
        );
      }

      // Update urlCard reference to the one returned by the service
      urlCard = addUrlCardToLibraryResult.value;

      let noteCard;
      let isNewNoteCard = false;

      // Handle note card creation or update if note is provided
      if (request.note) {
        // Check if note card already exists for this URL and curator
        const existingNoteCardResult =
          await this.cardRepository.findUsersNoteCardByUrl(url, curatorId);
        if (existingNoteCardResult.isErr()) {
          // Rollback URL card if we created it
          if (isNewUrlCard) {
            await this.rollbackUrlCard(urlCard, curatorId);
          }
          return err(
            AppError.UnexpectedError.create(existingNoteCardResult.error),
          );
        }

        noteCard = existingNoteCardResult.value;

        if (noteCard) {
          // Update existing note card
          const newContentResult = CardContent.createNoteContent(request.note);
          if (newContentResult.isErr()) {
            // Rollback URL card if we created it
            if (isNewUrlCard) {
              await this.rollbackUrlCard(urlCard, curatorId);
            }
            return err(new ValidationError(newContentResult.error.message));
          }

          const updateContentResult = noteCard.updateContent(
            newContentResult.value,
          );
          if (updateContentResult.isErr()) {
            // Rollback URL card if we created it
            if (isNewUrlCard) {
              await this.rollbackUrlCard(urlCard, curatorId);
            }
            return err(new ValidationError(updateContentResult.error.message));
          }

          // Save updated note card
          const saveNoteCardResult = await this.cardRepository.save(noteCard);
          if (saveNoteCardResult.isErr()) {
            // Rollback URL card if we created it
            if (isNewUrlCard) {
              await this.rollbackUrlCard(urlCard, curatorId);
            }
            return err(
              AppError.UnexpectedError.create(saveNoteCardResult.error),
            );
          }
        } else {
          // Create new note card
          const noteCardInput: INoteCardInput = {
            type: CardTypeEnum.NOTE,
            text: request.note,
            parentCardId: urlCard.cardId.getStringValue(),
            url: url.value,
          };

          const noteCardResult = CardFactory.create({
            curatorId: request.curatorId,
            cardInput: noteCardInput,
          });

          if (noteCardResult.isErr()) {
            // Rollback URL card if we created it
            if (isNewUrlCard) {
              await this.rollbackUrlCard(urlCard, curatorId);
            }
            return err(new ValidationError(noteCardResult.error.message));
          }

          noteCard = noteCardResult.value;
          isNewNoteCard = true;

          // Save note card
          const saveNoteCardResult = await this.cardRepository.save(noteCard);
          if (saveNoteCardResult.isErr()) {
            // Rollback URL card if we created it
            if (isNewUrlCard) {
              await this.rollbackUrlCard(urlCard, curatorId);
            }
            return err(
              AppError.UnexpectedError.create(saveNoteCardResult.error),
            );
          }

          // Add note card to library using domain service
          const addNoteCardToLibraryResult =
            await this.cardLibraryService.addCardToLibrary(noteCard, curatorId);
          if (addNoteCardToLibraryResult.isErr()) {
            // Rollback note card creation
            const deleteNoteResult = await this.cardRepository.delete(
              noteCard.cardId,
            );
            if (deleteNoteResult.isErr()) {
              console.error(
                'Failed to rollback note card creation:',
                deleteNoteResult.error,
              );
            }

            // Rollback URL card if we created it
            if (isNewUrlCard) {
              await this.rollbackUrlCard(urlCard, curatorId);
            }

            // Propagate authentication errors
            if (
              addNoteCardToLibraryResult.error instanceof AuthenticationError
            ) {
              return err(addNoteCardToLibraryResult.error);
            }
            if (
              addNoteCardToLibraryResult.error instanceof
              AppError.UnexpectedError
            ) {
              return err(addNoteCardToLibraryResult.error);
            }
            return err(
              new ValidationError(addNoteCardToLibraryResult.error.message),
            );
          }

          // Update noteCard reference to the one returned by the service
          noteCard = addNoteCardToLibraryResult.value;
        }
      }

      // Handle collection additions if specified
      if (request.collectionIds && request.collectionIds.length > 0) {
        // Always add the URL card to collections
        const cardToAdd = urlCard;

        // Validate and create CollectionIds
        const collectionIds: CollectionId[] = [];
        for (const collectionIdStr of request.collectionIds) {
          const collectionIdResult =
            CollectionId.createFromString(collectionIdStr);
          if (collectionIdResult.isErr()) {
            // Rollback everything we've created
            await this.rollbackAllCards(
              urlCard,
              noteCard,
              curatorId,
              isNewUrlCard,
              isNewNoteCard,
            );
            return err(
              new ValidationError(
                `Invalid collection ID: ${collectionIdResult.error.message}`,
              ),
            );
          }
          collectionIds.push(collectionIdResult.value);
        }

        // Add card to collections using domain service
        const addToCollectionsResult =
          await this.cardCollectionService.addCardToCollections(
            cardToAdd,
            collectionIds,
            curatorId,
          );
        if (addToCollectionsResult.isErr()) {
          // Rollback everything we've created
          await this.rollbackAllCards(
            urlCard,
            noteCard,
            curatorId,
            isNewUrlCard,
            isNewNoteCard,
          );

          // Propagate authentication errors
          if (addToCollectionsResult.error instanceof AuthenticationError) {
            return err(addToCollectionsResult.error);
          }
          if (
            addToCollectionsResult.error instanceof AppError.UnexpectedError
          ) {
            return err(addToCollectionsResult.error);
          }
          return err(new ValidationError(addToCollectionsResult.error.message));
        }

        // Publish events for all affected collections
        const updatedCollections = addToCollectionsResult.value;
        for (const collection of updatedCollections) {
          const publishResult =
            await this.publishEventsForAggregate(collection);
          if (publishResult.isErr()) {
            console.error(
              'Failed to publish events for collection:',
              publishResult.error,
            );
            // Don't fail the operation if event publishing fails
          }
        }
      }

      // Publish events for URL card (events are raised in addToLibrary method)
      const publishUrlCardResult =
        await this.publishEventsForAggregate(urlCard);
      if (publishUrlCardResult.isErr()) {
        console.error(
          'Failed to publish events for URL card:',
          publishUrlCardResult.error,
        );
        // Don't fail the operation if event publishing fails
      }

      return ok({
        urlCardId: urlCard.cardId.getStringValue(),
        noteCardId: noteCard?.cardId.getStringValue(),
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  // Helper method to rollback URL card
  private async rollbackUrlCard(
    urlCard: Card,
    curatorId: CuratorId,
  ): Promise<void> {
    try {
      // Remove from library first (this will unpublish if published)
      const removeFromLibraryResult =
        await this.cardLibraryService.removeCardFromLibrary(urlCard, curatorId);
      if (removeFromLibraryResult.isErr()) {
        console.error(
          'Failed to remove URL card from library during rollback:',
          removeFromLibraryResult.error,
        );
      }

      // Then delete from repository
      const deleteResult = await this.cardRepository.delete(urlCard.cardId);
      if (deleteResult.isErr()) {
        console.error(
          'Failed to delete URL card during rollback:',
          deleteResult.error,
        );
      }
    } catch (error) {
      console.error('Error during URL card rollback:', error);
    }
  }

  // Helper method to rollback all cards
  private async rollbackAllCards(
    urlCard: Card,
    noteCard: Card | undefined,
    curatorId: CuratorId,
    isNewUrlCard: boolean,
    isNewNoteCard: boolean,
  ): Promise<void> {
    // Rollback note card if we created it
    if (noteCard && isNewNoteCard) {
      try {
        const removeNoteFromLibraryResult =
          await this.cardLibraryService.removeCardFromLibrary(
            noteCard,
            curatorId,
          );
        if (removeNoteFromLibraryResult.isErr()) {
          console.error(
            'Failed to remove note card from library during rollback:',
            removeNoteFromLibraryResult.error,
          );
        }

        const deleteNoteResult = await this.cardRepository.delete(
          noteCard.cardId,
        );
        if (deleteNoteResult.isErr()) {
          console.error(
            'Failed to delete note card during rollback:',
            deleteNoteResult.error,
          );
        }
      } catch (error) {
        console.error('Error during note card rollback:', error);
      }
    }

    // Rollback URL card if we created it
    if (isNewUrlCard) {
      await this.rollbackUrlCard(urlCard, curatorId);
    }
  }
}
