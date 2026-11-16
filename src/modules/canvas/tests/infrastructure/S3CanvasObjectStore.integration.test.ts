import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { randomUUID } from 'crypto';
import { S3CanvasObjectStore } from '../../infrastructure/storage/S3CanvasObjectStore';

// Exercises the S3 code path against a real S3 API (Adobe's s3mock in a
// container). Local development itself runs on FileCanvasObjectStore, so
// this is the only automated coverage S3CanvasObjectStore gets.
describe('S3CanvasObjectStore', () => {
  let container: StartedTestContainer;
  let store: S3CanvasObjectStore;

  beforeAll(async () => {
    container = await new GenericContainer('adobe/s3mock:5.2.3')
      .withExposedPorts(9090)
      .start();
    store = new S3CanvasObjectStore({
      // s3mock ignores credentials; the SDK still demands them
      bucket: `semble-canvas-test-${randomUUID()}`,
      region: 'us-east-1',
      accessKeyId: 'test',
      secretAccessKey: 'test',
      endpoint: `http://${container.getHost()}:${container.getMappedPort(9090)}`,
    });
  }, 120000);

  afterAll(async () => {
    await container.stop();
  });

  it('creates the bucket on first use and round-trips objects', async () => {
    await store.put(
      'canvases/a/documents/1.json',
      Buffer.from('doc-a'),
      'application/json',
    );
    expect((await store.get('canvases/a/documents/1.json'))?.toString()).toBe(
      'doc-a',
    );
  });

  it('returns null for missing objects', async () => {
    expect(await store.get('canvases/missing/1.json')).toBeNull();
  });

  it('deletes a single object', async () => {
    await store.put(
      'canvases/a/thumbnail.jpg',
      Buffer.from('jpeg'),
      'image/jpeg',
    );
    await store.delete('canvases/a/thumbnail.jpg');
    expect(await store.get('canvases/a/thumbnail.jpg')).toBeNull();
  });

  it('deletes only the objects under a prefix', async () => {
    await store.put(
      'canvases/a/documents/1.json',
      Buffer.from('1'),
      'application/json',
    );
    await store.put(
      'canvases/a/documents/2.json',
      Buffer.from('2'),
      'application/json',
    );
    await store.put(
      'canvases/b/documents/1.json',
      Buffer.from('3'),
      'application/json',
    );

    await store.deletePrefix('canvases/a/');

    expect(await store.get('canvases/a/documents/1.json')).toBeNull();
    expect(await store.get('canvases/a/documents/2.json')).toBeNull();
    expect((await store.get('canvases/b/documents/1.json'))?.toString()).toBe(
      '3',
    );
  });
});
