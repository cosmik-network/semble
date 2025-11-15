import { Result, ok, err } from '../../../../shared/core/Result';
import {
  IFirehoseEventDuplicationService,
  FirehoseEventType,
} from '../../domain/services/IFirehoseEventDuplicationService';

export class InMemoryFirehoseEventDuplicationService
  implements IFirehoseEventDuplicationService
{
  private processedEvents: Set<string> = new Set();
  private deletedUris: Set<string> = new Set();
  private shouldFail: boolean = false;

  async hasEventBeenProcessed(
    atUri: string,
    cid: string | null,
    eventType: FirehoseEventType,
  ): Promise<Result<boolean>> {
    if (this.shouldFail) {
      return err(new Error('Simulated duplication service failure'));
    }

    const eventKey = this.createEventKey(atUri, cid, eventType);
    return ok(this.processedEvents.has(eventKey));
  }

  async hasBeenDeleted(atUri: string): Promise<Result<boolean>> {
    if (this.shouldFail) {
      return err(new Error('Simulated duplication service failure'));
    }

    return ok(this.deletedUris.has(atUri));
  }

  async markEventAsProcessed(
    atUri: string,
    cid: string | null,
    eventType: FirehoseEventType,
  ): Promise<Result<void>> {
    if (this.shouldFail) {
      return err(new Error('Simulated duplication service failure'));
    }

    const eventKey = this.createEventKey(atUri, cid, eventType);
    this.processedEvents.add(eventKey);

    // If this is a delete event, mark the URI as deleted
    if (eventType === 'delete') {
      this.deletedUris.add(atUri);
    }

    return ok(undefined);
  }

  markAsDeleted(atUri: string): void {
    this.deletedUris.add(atUri);
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  clear(): void {
    this.processedEvents.clear();
    this.deletedUris.clear();
    this.shouldFail = false;
  }

  private createEventKey(
    atUri: string,
    cid: string | null,
    eventType: FirehoseEventType,
  ): string {
    return `${atUri}:${cid || 'null'}:${eventType}`;
  }
}
