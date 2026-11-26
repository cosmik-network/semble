import { CardRemovedFromLibraryEvent } from '../../../cards/domain/events/CardRemovedFromLibraryEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok } from '../../../../shared/core/Result';
import { DeleteAnnotationFromSearchUseCase } from '../useCases/commands/DeleteAnnotationFromSearchUseCase';
import { CardTypeEnum } from '../../../cards/domain/value-objects/CardType';

/**
 * Cleans up annotation passage vectors when annotation cards are removed from
 * libraries. The event carries a snapshot of the removed card because the row
 * (and its cascading selectors) may already be hard-deleted by the time the
 * search worker processes it. The use case only deletes the vector when no
 * other annotation card shares the passage.
 */
export class CardRemovedFromLibraryEventHandler implements IEventHandler<CardRemovedFromLibraryEvent> {
  constructor(
    private deleteAnnotationFromSearchUseCase: DeleteAnnotationFromSearchUseCase,
  ) {}

  async handle(event: CardRemovedFromLibraryEvent): Promise<Result<void>> {
    const removedCard = event.removedCard;
    if (
      !removedCard ||
      removedCard.cardType !== CardTypeEnum.ANNOTATION ||
      !removedCard.url ||
      !removedCard.exactNormalized?.length
    ) {
      return ok(undefined);
    }

    for (const exactNormalized of removedCard.exactNormalized) {
      const deleteResult = await this.deleteAnnotationFromSearchUseCase.execute(
        {
          url: removedCard.url,
          exactNormalized,
        },
      );

      if (deleteResult.isErr()) {
        console.error(
          'Failed to delete annotation from search index:',
          deleteResult.error,
        );
        // Don't fail the event processing - index cleanup is not critical
      }
    }

    return ok(undefined);
  }
}
