import { PublishedRecordId } from 'src/modules/cards/domain/value-objects/PublishedRecordId';
import { Result } from 'src/shared/core/Result';
import { UseCaseError } from 'src/shared/core/UseCaseError';

// What a canvas PDS record carries: identity plus where the board lives.
// The tldraw document itself never goes in the record.
export interface CanvasPublishFields {
  canvasId: string;
  name: string;
  createdAt: string;
}

export interface ICanvasPublisher {
  // Creates the record, or updates it in place when existingRecordId is the
  // board's current record (rename)
  publish(
    ownerDid: string,
    canvas: CanvasPublishFields,
    existingRecordId?: PublishedRecordId,
  ): Promise<Result<PublishedRecordId, UseCaseError>>;
  unpublish(
    recordId: PublishedRecordId,
    ownerDid: string,
  ): Promise<Result<void, UseCaseError>>;
}
