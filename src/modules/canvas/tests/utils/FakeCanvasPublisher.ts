import {
  CanvasPublishFields,
  ICanvasPublisher,
} from '../../application/ports/ICanvasPublisher';
import { PublishedRecordId } from 'src/modules/cards/domain/value-objects/PublishedRecordId';
import { ok, err, Result } from '../../../../shared/core/Result';
import { UseCaseError } from '../../../../shared/core/UseCaseError';
import { AppError } from '../../../../shared/core/AppError';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';

export class FakeCanvasPublisher implements ICanvasPublisher {
  private published = new Map<string, CanvasPublishFields>();
  private unpublished: string[] = [];
  private shouldFail = false;

  async publish(
    ownerDid: string,
    canvas: CanvasPublishFields,
  ): Promise<Result<PublishedRecordId, UseCaseError>> {
    if (this.shouldFail) {
      return err(
        AppError.UnexpectedError.create(
          new Error('Simulated canvas publish failure'),
        ),
      );
    }
    this.published.set(canvas.canvasId, canvas);
    return ok(
      PublishedRecordId.create({
        uri: `at://${ownerDid}/${
          new EnvironmentConfigService().getAtProtoCollections().canvas
        }/${canvas.canvasId}`,
        cid: `fake-canvas-cid-${canvas.canvasId}`,
      }),
    );
  }

  async unpublish(
    recordId: PublishedRecordId,
  ): Promise<Result<void, UseCaseError>> {
    this.unpublished.push(recordId.uri);
    return ok(undefined);
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  clear(): void {
    this.published.clear();
    this.unpublished = [];
    this.shouldFail = false;
  }

  getPublished(): CanvasPublishFields[] {
    return [...this.published.values()];
  }

  getUnpublished(): string[] {
    return [...this.unpublished];
  }
}
