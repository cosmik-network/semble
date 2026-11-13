import { CanvasService } from '../../application/CanvasService';
import { CanvasNotOwnedError } from '../../application/CanvasService';
import { InMemoryCanvasRepository } from '../utils/InMemoryCanvasRepository';
import { InMemoryCanvasObjectStore } from '../utils/InMemoryCanvasObjectStore';

const document = (seed: string) => ({
  schema: { schemaVersion: 2 as const, sequences: { comp: 1 } },
  store: { shape: seed },
});

const jpeg = 'data:image/jpeg;base64,amVwZy1ieXRlcw==';

describe('CanvasService', () => {
  let service: CanvasService;
  const alice = 'did:plc:alice';
  const bob = 'did:plc:bob';

  beforeEach(() => {
    const objects = new InMemoryCanvasObjectStore();
    service = new CanvasService(InMemoryCanvasRepository.getInstance(objects));
  });

  it('scopes every operation to its owner', async () => {
    const canvas = await service.create(alice);
    await expect(service.get(bob, canvas.id)).rejects.toThrow(
      CanvasNotOwnedError,
    );
    await expect(service.duplicate(bob, canvas.id)).rejects.toThrow(
      CanvasNotOwnedError,
    );
    await expect(service.delete(bob, canvas.id)).rejects.toThrow(
      CanvasNotOwnedError,
    );
    await expect(
      service.save(bob, canvas.id, 0, document('a'), 0, '3.15.6'),
    ).rejects.toThrow(CanvasNotOwnedError);
    await expect(service.saveThumbnail(bob, canvas.id, jpeg)).rejects.toThrow(
      CanvasNotOwnedError,
    );
  });

  it('round-trips a save and reports conflicts', async () => {
    const canvas = await service.create(alice);
    const saved = await service.save(
      alice,
      canvas.id,
      0,
      document('a'),
      2,
      '3.15.6',
    );
    expect(saved).toMatchObject({ conflict: false, revision: 1 });

    // A writer still on revision 0 loses
    const stale = await service.save(
      alice,
      canvas.id,
      0,
      document('b'),
      5,
      '3.15.6',
    );
    expect(stale).toEqual({ conflict: true, currentRevision: 1 });

    const opened = await service.open(alice, canvas.id);
    expect(opened.document).toEqual(document('a'));
    expect(opened.record).toMatchObject({ linkCount: 2, revision: 1 });
  });

  it('stores and fetches thumbnails as data URLs', async () => {
    const canvas = await service.create(alice);
    expect(await service.thumbnail(alice, canvas.id)).toBeNull();

    await service.saveThumbnail(alice, canvas.id, jpeg);
    expect(await service.thumbnail(alice, canvas.id)).toBe(jpeg);

    await service.saveThumbnail(alice, canvas.id, null);
    expect(await service.thumbnail(alice, canvas.id)).toBeNull();
  });

  it('rejects thumbnails that are not image data URLs', async () => {
    const canvas = await service.create(alice);
    await expect(
      service.saveThumbnail(alice, canvas.id, 'not-a-data-url'),
    ).rejects.toThrow(/data URL/i);
  });

  it('includes thumbnails in a list only when asked', async () => {
    const canvas = await service.create(alice);
    await service.saveThumbnail(alice, canvas.id, jpeg);

    const of = (summaries: { id: string; thumbnail: string | null }[]) =>
      summaries.find((summary) => summary.id === canvas.id);
    expect(of(await service.list(alice, false))?.thumbnail).toBeNull();
    expect(of(await service.list(alice, true))?.thumbnail).toBe(jpeg);
  });
});
