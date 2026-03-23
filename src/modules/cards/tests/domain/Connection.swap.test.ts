import { Connection } from '../../domain/Connection';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { UrlOrCardId } from '../../domain/value-objects/UrlOrCardId';
import { ConnectionType } from '../../domain/value-objects/ConnectionType';
import { ConnectionNote } from '../../domain/value-objects/ConnectionNote';
import { UrlMetadata } from '../../domain/value-objects/UrlMetadata';
import { URL } from '../../domain/value-objects/URL';
import { InMemoryConnectionRepository } from '../utils/InMemoryConnectionRepository';

describe('Connection.swap()', () => {
  let repository: InMemoryConnectionRepository;

  beforeEach(() => {
    repository = InMemoryConnectionRepository.getInstance();
    repository.clear();
  });

  it('should swap source and target', () => {
    const curatorId = CuratorId.create('did:plc:curator123').unwrap();
    const source = UrlOrCardId.createFromUrl(
      URL.create('https://example.com/source').unwrap(),
    ).unwrap();
    const target = UrlOrCardId.createFromUrl(
      URL.create('https://example.com/target').unwrap(),
    ).unwrap();
    const connectionType = ConnectionType.createFromString('SUPPORTS').unwrap();
    const note = ConnectionNote.create('Test note').unwrap();

    const connection = Connection.create({
      source,
      target,
      type: connectionType,
      note,
      curatorId,
    }).unwrap();

    // Verify initial state
    expect(connection.source.stringValue).toBe('https://example.com/source');
    expect(connection.target.stringValue).toBe('https://example.com/target');

    // Swap
    const swapResult = connection.swap();
    expect(swapResult.isOk()).toBe(true);

    // Verify swapped state
    expect(connection.source.stringValue).toBe('https://example.com/target');
    expect(connection.target.stringValue).toBe('https://example.com/source');
  });

  it('should swap source and target metadata', () => {
    const curatorId = CuratorId.create('did:plc:curator123').unwrap();
    const source = UrlOrCardId.createFromUrl(
      URL.create('https://example.com/source').unwrap(),
    ).unwrap();
    const target = UrlOrCardId.createFromUrl(
      URL.create('https://example.com/target').unwrap(),
    ).unwrap();

    const sourceMetadata = UrlMetadata.create({
      url: 'https://example.com/source',
      title: 'Source Title',
      description: 'Source Description',
    }).unwrap();

    const targetMetadata = UrlMetadata.create({
      url: 'https://example.com/target',
      title: 'Target Title',
      description: 'Target Description',
    }).unwrap();

    const connection = Connection.create({
      source,
      target,
      sourceUrlMetadata: sourceMetadata,
      targetUrlMetadata: targetMetadata,
      curatorId,
    }).unwrap();

    // Verify initial state
    expect(connection.sourceUrlMetadata?.title).toBe('Source Title');
    expect(connection.targetUrlMetadata?.title).toBe('Target Title');

    // Swap
    connection.swap();

    // Verify swapped metadata
    expect(connection.sourceUrlMetadata?.title).toBe('Target Title');
    expect(connection.targetUrlMetadata?.title).toBe('Source Title');
  });

  it('should persist swapped values when saved to repository', async () => {
    const curatorId = CuratorId.create('did:plc:curator123').unwrap();
    const source = UrlOrCardId.createFromUrl(
      URL.create('https://example.com/source').unwrap(),
    ).unwrap();
    const target = UrlOrCardId.createFromUrl(
      URL.create('https://example.com/target').unwrap(),
    ).unwrap();

    const sourceMetadata = UrlMetadata.create({
      url: 'https://example.com/source',
      title: 'Source Title',
    }).unwrap();

    const targetMetadata = UrlMetadata.create({
      url: 'https://example.com/target',
      title: 'Target Title',
    }).unwrap();

    const connection = Connection.create({
      source,
      target,
      sourceUrlMetadata: sourceMetadata,
      targetUrlMetadata: targetMetadata,
      curatorId,
    }).unwrap();

    // Save initial connection
    await repository.save(connection);

    // Swap and save again
    connection.swap();
    await repository.save(connection);

    // Retrieve from repository
    const retrievedResult = await repository.findById(connection.connectionId);
    expect(retrievedResult.isOk()).toBe(true);

    const retrieved = retrievedResult.unwrap();
    expect(retrieved).not.toBeNull();

    // Verify persisted swapped values
    expect(retrieved!.source.stringValue).toBe('https://example.com/target');
    expect(retrieved!.target.stringValue).toBe('https://example.com/source');
    expect(retrieved!.sourceUrlMetadata?.title).toBe('Target Title');
    expect(retrieved!.targetUrlMetadata?.title).toBe('Source Title');
  });

  it('should update updatedAt timestamp when swapping', async () => {
    const curatorId = CuratorId.create('did:plc:curator123').unwrap();
    const source = UrlOrCardId.createFromUrl(
      URL.create('https://example.com/source').unwrap(),
    ).unwrap();
    const target = UrlOrCardId.createFromUrl(
      URL.create('https://example.com/target').unwrap(),
    ).unwrap();

    const connection = Connection.create({
      source,
      target,
      curatorId,
    }).unwrap();

    const initialUpdatedAt = connection.updatedAt;

    // Wait a bit to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Swap
    connection.swap();

    // Verify updatedAt was updated
    expect(connection.updatedAt.getTime()).toBeGreaterThan(
      initialUpdatedAt.getTime(),
    );
  });
});
