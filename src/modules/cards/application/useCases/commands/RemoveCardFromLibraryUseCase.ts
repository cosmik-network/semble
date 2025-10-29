import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { ICardRepository } from '../../../domain/ICardRepository';
import { CardId } from '../../../domain/value-objects/CardId';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { CardLibraryService } from '../../../domain/services/CardLibraryService';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export interface RemoveCardFromLibraryDTO {
  cardId: string;
  curatorId: string;
}

export interface RemoveCardFromLibraryResponseDTO {
  cardId: string;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class RemoveCardFromLibraryUseCase
  implements
    UseCase<
      RemoveCardFromLibraryDTO,
      Result<
        RemoveCardFromLibraryResponseDTO,
        ValidationError | AuthenticationError | AppError.UnexpectedError
      >
    >
{
  constructor(
    private cardRepository: ICardRepository,
    private cardLibraryService: CardLibraryService,
  ) {}

  async execute(
    request: RemoveCardFromLibraryDTO,
  ): Promise<
    Result<
      RemoveCardFromLibraryResponseDTO,
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

      // Remove card from library using domain service (this handles cascading for URL cards)
      const removeFromLibraryResult =
        await this.cardLibraryService.removeCardFromLibrary(card, curatorId);
      if (removeFromLibraryResult.isErr()) {
        // Propagate authentication errors
        if (removeFromLibraryResult.error instanceof AuthenticationError) {
          return err(removeFromLibraryResult.error);
        }
        if (removeFromLibraryResult.error instanceof AppError.UnexpectedError) {
          return err(removeFromLibraryResult.error);
        }
        return err(new ValidationError(removeFromLibraryResult.error.message));
      }

      const updatedCard = removeFromLibraryResult.value;

      // Handle deletion with proper ordering for URL cards
      if (
        updatedCard.libraryCount === 0 &&
        updatedCard.curatorId.equals(curatorId)
      ) {
        if (updatedCard.isUrlCard && updatedCard.url) {
          // First, delete any associated note card that also has no library memberships
          const noteCardResult =
            await this.cardRepository.findUsersNoteCardByUrl(
              updatedCard.url,
              curatorId,
            );

          if (noteCardResult.isOk() && noteCardResult.value) {
            const noteCard = noteCardResult.value;
            if (
              noteCard.libraryCount === 0 &&
              noteCard.curatorId.equals(curatorId)
            ) {
              // Delete note card first (child before parent)
              const deleteNoteResult = await this.cardRepository.delete(
                noteCard.cardId,
              );
              if (deleteNoteResult.isErr()) {
                return err(
                  AppError.UnexpectedError.create(deleteNoteResult.error),
                );
              }
            }
          }
        }

        // Then delete the main card (URL card or any other card type)
        const deleteResult = await this.cardRepository.delete(
          updatedCard.cardId,
        );
        if (deleteResult.isErr()) {
          return err(AppError.UnexpectedError.create(deleteResult.error));
        }
      }

      return ok({
        cardId: card.cardId.getStringValue(),
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
