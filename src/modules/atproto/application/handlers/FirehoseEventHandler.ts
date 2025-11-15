import { Result } from 'src/shared/core/Result';
import { ProcessFirehoseEventUseCase } from '../useCases/ProcessFirehoseEventUseCase';

export interface AtProtoFirehoseEvent {
  uri: string;
  cid: string | null;
  eventType: 'create' | 'update' | 'delete';
  record?: any;
  did?: string;
  collection?: string;
}

export class FirehoseEventHandler {
  constructor(
    private processFirehoseEventUseCase: ProcessFirehoseEventUseCase,
  ) {}

  async handle(event: AtProtoFirehoseEvent): Promise<Result<void>> {
    return this.processFirehoseEventUseCase.execute({
      atUri: event.uri,
      cid: event.cid,
      eventType: event.eventType,
      record: event.record,
    });
  }
}
