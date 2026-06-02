import { IEventPublisher } from '../application/events/IEventPublisher';
import { AggregateRoot } from '../domain/AggregateRoot';
import { Result, ok } from './Result';

export interface UseCase<IRequest, IResponse> {
  execute(request?: IRequest): Promise<IResponse> | IResponse;
}

export abstract class BaseUseCase<IRequest, IResponse> implements UseCase<
  IRequest,
  IResponse
> {
  constructor(protected eventPublisher: IEventPublisher) {}

  abstract execute(request?: IRequest): Promise<IResponse> | IResponse;

  protected async publishEventsForAggregate(
    aggregate: AggregateRoot<any>,
  ): Promise<Result<void>> {
    const events = aggregate.domainEvents;

    if (events.length === 0) {
      return ok(undefined);
    }

    const publishResult = await this.eventPublisher.publishEvents(events);

    if (publishResult.isOk()) {
      aggregate.clearEvents();
    }

    return publishResult;
  }
}
