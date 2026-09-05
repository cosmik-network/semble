import { UrlCardMetadataUpdatedEvent } from '../../../cards/domain/events/UrlCardMetadataUpdatedEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok } from '../../../../shared/core/Result';
import { IndexUrlForSearchUseCase } from '../useCases/commands/IndexUrlForSearchUseCase';

/**
 * Re-indexes a URL after its card metadata is enriched so the vector index
 * reflects the updated title/description/type.
 */
export class UrlCardMetadataUpdatedEventHandler implements IEventHandler<UrlCardMetadataUpdatedEvent> {
  constructor(private indexUrlForSearchUseCase: IndexUrlForSearchUseCase) {}

  async handle(event: UrlCardMetadataUpdatedEvent): Promise<Result<void>> {
    const indexResult = await this.indexUrlForSearchUseCase.execute({
      url: event.url,
    });

    if (indexResult.isErr()) {
      console.error(
        'Failed to re-index URL after metadata update:',
        indexResult.error,
      );
      // Don't fail the event processing - search indexing is not critical
    }

    return ok(undefined);
  }
}
