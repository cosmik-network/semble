import { ConnectionCreatedEvent } from '../../../cards/domain/events/ConnectionCreatedEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok } from '../../../../shared/core/Result';
import { IndexUrlForSearchUseCase } from '../useCases/commands/IndexUrlForSearchUseCase';
import { IConnectionRepository } from '../../../cards/domain/IConnectionRepository';

export class ConnectionCreatedEventHandler
  implements IEventHandler<ConnectionCreatedEvent>
{
  constructor(
    private indexUrlForSearchUseCase: IndexUrlForSearchUseCase,
    private connectionRepository: IConnectionRepository,
  ) {}

  async handle(event: ConnectionCreatedEvent): Promise<Result<void>> {
    // Get connection details
    const connectionResult = await this.connectionRepository.findById(
      event.connectionId,
    );
    if (connectionResult.isErr()) {
      console.error(
        'Failed to find connection for search indexing:',
        connectionResult.error,
      );
      return ok(undefined); // Don't fail the event processing
    }

    const connection = connectionResult.value;
    if (!connection) {
      console.warn(
        'Connection not found for search indexing:',
        event.connectionId.getStringValue(),
      );
      return ok(undefined);
    }

    // Index source URL if it exists
    if (connection.source.url) {
      const sourceIndexResult = await this.indexUrlForSearchUseCase.execute({
        url: connection.source.url.value,
      });

      if (sourceIndexResult.isErr()) {
        console.error(
          'Failed to index source URL for search:',
          sourceIndexResult.error,
        );
        // Don't fail the event processing - search indexing is not critical
      }
    }

    // Index target URL if it exists
    if (connection.target.url) {
      const targetIndexResult = await this.indexUrlForSearchUseCase.execute({
        url: connection.target.url.value,
      });

      if (targetIndexResult.isErr()) {
        console.error(
          'Failed to index target URL for search:',
          targetIndexResult.error,
        );
        // Don't fail the event processing - search indexing is not critical
      }
    }

    return ok(undefined);
  }
}
