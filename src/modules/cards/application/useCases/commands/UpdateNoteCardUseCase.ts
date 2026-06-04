import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { ICardRepository } from '../../../domain/ICardRepository';
import { CardId } from '../../../domain/value-objects/CardId';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { CardTypeEnum } from '../../../domain/value-objects/CardType';
import { CardContent } from '../../../domain/value-objects/CardContent';
import { ICardPublisher } from '../../ports/ICardPublisher';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export interface UpdateNoteCardDTO {
  cardId: string;
  note: string;
  curatorId: string;
}

export interface UpdateNoteCardResponseDTO {
  cardId: string;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class UpdateNoteCardUseCase implements UseCase<
  UpdateNoteCardDTO,
  Result<
    UpdateNoteCardResponseDTO,
    ValidationError | AuthenticationError | AppError.UnexpectedError
  >
> {
  constructor(
    private cardRepository: ICardRepository,
    private cardPublisher: ICardPublisher,
  ) {}

  async execute(
    request: UpdateNoteCardDTO,
  ): Promise<
    Result<
      UpdateNoteCardResponseDTO,
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

      // Validate and create CardId
      const cardIdResult = CardId.createFromString(request.cardId);
      if (cardIdResult.isErr()) {
        return err(
          new ValidationError(`Invalid card ID: ${cardIdResult.error.message}`),
        );
      }
      const cardId = cardIdResult.value;

      // Find the card
      const cardResult = await this.cardRepository.findById(cardId);
      if (cardResult.isErr()) {
        return err(AppError.UnexpectedError.create(cardResult.error));
      }

      const card = cardResult.value;
      if (!card) {
        return err(new ValidationError(`Card not found: ${request.cardId}`));
      }

      // Verify it's a note card
      if (card.type.value !== CardTypeEnum.NOTE) {
        return err(
          new ValidationError('Card is not a note card and cannot be updated'),
        );
      }

      // Get the note content and verify authorship
      const noteContent = card.content.noteContent;
      if (!noteContent) {
        return err(
          new ValidationError('Card does not have valid note content'),
        );
      }

      if (!card.curatorId.equals(curatorId)) {
        return err(
          new ValidationError('Only the author can update this note card'),
        );
      }

      // Update the note content
      const updatedNoteContentResult = noteContent.updateText(request.note);
      if (updatedNoteContentResult.isErr()) {
        return err(new ValidationError(updatedNoteContentResult.error.message));
      }

      // Create new card content with updated note
      const updatedCardContentResult = CardContent.createNoteContent(
        request.note,
      );
      if (updatedCardContentResult.isErr()) {
        return err(new ValidationError(updatedCardContentResult.error.message));
      }

      // Update the card content
      const updateResult = card.updateContent(updatedCardContentResult.value);
      if (updateResult.isErr()) {
        return err(new ValidationError(updateResult.error.message));
      }

      // Publish the updated card to library first
      const publishResult = await this.cardPublisher.publishCardToLibrary(
        card,
        curatorId,
        card.publishedRecordId,
      );
      if (publishResult.isErr()) {
        // Propagate authentication errors
        if (publishResult.error instanceof AuthenticationError) {
          return err(publishResult.error);
        }
        return err(AppError.UnexpectedError.create(publishResult.error));
      }

      // Mark the card in library as published with the new record ID
      const markPublishedResult = card.markCardInLibraryAsPublished(
        curatorId,
        publishResult.value,
      );
      if (markPublishedResult.isErr()) {
        return err(new ValidationError(markPublishedResult.error.message));
      }

      // Save the updated card to repository
      const saveResult = await this.cardRepository.save(card);
      if (saveResult.isErr()) {
        return err(AppError.UnexpectedError.create(saveResult.error));
      }

      return ok({
        cardId: card.cardId.getStringValue(),
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
