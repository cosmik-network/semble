import { ConnectionCreatedEvent } from '../../domain/events/ConnectionCreatedEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok, err } from '../../../../shared/core/Result';
import { IConnectionRepository } from '../../domain/IConnectionRepository';
import { IMetadataService } from '../../domain/services/IMetadataService';
import { UrlMetadata } from '../../domain/value-objects/UrlMetadata';
import {
  UrlOrCardId,
  UrlOrCardIdType,
} from '../../domain/value-objects/UrlOrCardId';
import { UpdateConnectionUrlMetadataUseCase } from '../useCases/commands/UpdateConnectionUrlMetadataUseCase';

/**
 * Async metadata enrichment for connections: interactive creates store fast
 * (Iframely-only) metadata; this handler fetches the full (slow) metadata for
 * URL endpoints and, when it is an improvement, updates the stored metadata
 * via UpdateConnectionUrlMetadataUseCase (DB-only — connection records on the
 * PDS carry no metadata).
 */
export class ConnectionCreatedEventHandler implements IEventHandler<ConnectionCreatedEvent> {
  constructor(
    private connectionRepository: IConnectionRepository,
    private metadataService: IMetadataService,
    private updateConnectionUrlMetadataUseCase: UpdateConnectionUrlMetadataUseCase,
  ) {}

  async handle(event: ConnectionCreatedEvent): Promise<Result<void>> {
    const connectionResult = await this.connectionRepository.findById(
      event.connectionId,
    );
    if (connectionResult.isErr()) {
      console.error(
        'Failed to find connection for metadata enrichment:',
        connectionResult.error,
      );
      return err(connectionResult.error);
    }

    const connection = connectionResult.value;
    if (!connection) {
      return ok(undefined);
    }

    const [sourceEnrichment, targetEnrichment] = await Promise.all([
      this.enrichEndpoint(connection.source, connection.sourceUrlMetadata),
      this.enrichEndpoint(connection.target, connection.targetUrlMetadata),
    ]);

    if (sourceEnrichment.isErr()) {
      return err(sourceEnrichment.error);
    }
    if (targetEnrichment.isErr()) {
      return err(targetEnrichment.error);
    }

    if (!sourceEnrichment.value && !targetEnrichment.value) {
      return ok(undefined);
    }

    const updateResult = await this.updateConnectionUrlMetadataUseCase.execute({
      connectionId: event.connectionId.getStringValue(),
      sourceUrlMetadata: sourceEnrichment.value,
      targetUrlMetadata: targetEnrichment.value,
    });
    if (updateResult.isErr()) {
      console.error(
        'Failed to update connection URL metadata after enrichment:',
        updateResult.error,
      );
      return err(updateResult.error);
    }

    return ok(undefined);
  }

  /**
   * Slow-fetch metadata for a URL endpoint and return the merged metadata if
   * it enriches what is stored, undefined if nothing should change.
   */
  private async enrichEndpoint(
    endpoint: UrlOrCardId,
    currentMetadata: UrlMetadata | undefined,
  ): Promise<Result<UrlMetadata | undefined>> {
    if (endpoint.type !== UrlOrCardIdType.URL || !endpoint.url) {
      return ok(undefined);
    }

    // Full fetch; the fast pass already warmed the per-service caches
    const slowResult = await this.metadataService.fetchMetadata(
      endpoint.url,
      true,
      'slow',
    );
    if (slowResult.isErr()) {
      // Propagate so BullMQ retries transient upstream failures
      console.error(
        `Slow metadata fetch failed for ${endpoint.url.value}:`,
        slowResult.error,
      );
      return err(slowResult.error);
    }

    const { shouldUpdate, merged } = UrlMetadata.computeEnrichment(
      currentMetadata,
      slowResult.value,
    );
    return ok(shouldUpdate ? merged : undefined);
  }
}
