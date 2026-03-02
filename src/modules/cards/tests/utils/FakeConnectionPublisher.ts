import { IConnectionPublisher } from '../../application/ports/IConnectionPublisher';
import { Connection } from '../../domain/Connection';
import { PublishedRecordId } from '../../domain/value-objects/PublishedRecordId';
import { ok, err, Result } from '../../../../shared/core/Result';
import { UseCaseError } from '../../../../shared/core/UseCaseError';
import { AppError } from '../../../../shared/core/AppError';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';

export class FakeConnectionPublisher implements IConnectionPublisher {
  private publishedConnections: Map<string, Connection> = new Map();
  private unpublishedConnections: Array<{ uri: string; cid: string }> = [];
  private shouldFail: boolean = false;
  private shouldFailUnpublish: boolean = false;
  private connectionType =
    new EnvironmentConfigService().getAtProtoCollections().connection;

  async publish(
    connection: Connection,
  ): Promise<Result<PublishedRecordId, UseCaseError>> {
    if (this.shouldFail) {
      return err(
        AppError.UnexpectedError.create(
          new Error('Simulated connection publish failure'),
        ),
      );
    }

    const connectionId = connection.connectionId.getStringValue();

    // Use the connection's curator DID directly
    const fakeDid = connection.curatorId.value;

    // Simulate publishing the connection record
    const fakeConnectionUri = `at://${fakeDid}/${this.connectionType}/${connectionId}`;
    const fakeConnectionCid = `fake-connection-cid-${connectionId}`;

    const connectionRecord = PublishedRecordId.create({
      uri: fakeConnectionUri,
      cid: fakeConnectionCid,
    });

    // Store the published connection for inspection
    this.publishedConnections.set(connectionId, connection);

    console.log(
      `[FakeConnectionPublisher] Published connection ${connectionId}`,
    );

    return ok(connectionRecord);
  }

  async unpublish(
    recordId: PublishedRecordId,
  ): Promise<Result<void, UseCaseError>> {
    if (this.shouldFailUnpublish) {
      return err(
        AppError.UnexpectedError.create(
          new Error('Simulated connection unpublish failure'),
        ),
      );
    }

    // Find and remove the connection by its published record ID
    for (const [
      connectionId,
      connection,
    ] of this.publishedConnections.entries()) {
      if (connection.publishedRecordId?.uri === recordId.uri) {
        this.publishedConnections.delete(connectionId);
        this.unpublishedConnections.push({
          uri: recordId.uri,
          cid: recordId.cid,
        });
        console.log(
          `[FakeConnectionPublisher] Unpublished connection ${recordId.uri}`,
        );
        return ok(undefined);
      }
    }

    if (this.publishedConnections.size === 0) {
      this.unpublishedConnections.push({
        uri: recordId.uri,
        cid: recordId.cid,
      });
      console.log(
        `[FakeConnectionPublisher] Unpublished connection ${recordId.uri} (not found in published connections)`,
      );
      return ok(undefined);
    }

    console.warn(
      `[FakeConnectionPublisher] Connection not found for unpublishing: ${recordId.uri}`,
    );
    return ok(undefined);
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  setShouldFailUnpublish(shouldFailUnpublish: boolean): void {
    this.shouldFailUnpublish = shouldFailUnpublish;
  }

  clear(): void {
    this.publishedConnections.clear();
    this.unpublishedConnections = [];
    this.shouldFail = false;
    this.shouldFailUnpublish = false;
  }

  getPublishedConnections(): Connection[] {
    return Array.from(this.publishedConnections.values());
  }

  getUnpublishedConnections(): Array<{ uri: string; cid: string }> {
    return this.unpublishedConnections;
  }
}
