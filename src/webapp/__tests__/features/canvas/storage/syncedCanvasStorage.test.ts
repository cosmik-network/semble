import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasClient } from '@/api-client/clients/CanvasClient';
import { IndexedDbCanvasStorage } from '@/features/canvas/storage/indexedDbCanvasStorage';
import { SyncedCanvasStorage } from '@/features/canvas/storage/syncedCanvasStorage';
import { FakeLocks } from '../harness/fakeLocks';

const OWNER = 'did:plc:owner';

// Regression guard for the bug where listCanvases mapped over the server's
// response with an unbound this.toSummary: the TypeError landed in the
// method's own catch and read as "server list failed" with a silent fallback
// to the (empty) local list on every fresh browser.
describe('SyncedCanvasStorage', () => {
  let factory: IDBFactory;
  let locks: FakeLocks;
  let client: { list: ReturnType<typeof vi.fn> };

  function storageWith(
    clientOverrides: Partial<Record<keyof CanvasClient, unknown>> = {},
  ) {
    const local = new IndexedDbCanvasStorage({
      indexedDB: factory,
      locks,
      tldrawVersion: '3.15.6',
    });
    const stub = { list: vi.fn(), ...clientOverrides } as unknown as {
      list: ReturnType<typeof vi.fn>;
    };
    return new SyncedCanvasStorage(local, {
      tldrawVersion: '3.15.6',
      createClient: () => stub as unknown as CanvasClient,
    });
  }

  const serverRecord = (id: string, name: string) => ({
    id,
    ownerDid: OWNER,
    name,
    tldrawVersion: '3.15.6',
    linkCount: 0,
    revision: 3,
    schemaSequences: {},
    hasThumbnail: false,
    createdAt: '2026-11-12T00:00:00.000Z',
    updatedAt: '2026-11-12T00:00:00.000Z',
    thumbnail: null,
  });

  beforeEach(() => {
    factory = new IDBFactory();
    locks = new FakeLocks();
    client = { list: vi.fn() };
  });

  it('lists the server boards, not the local fallback', async () => {
    client.list.mockResolvedValue([
      serverRecord('a', 'Server board A'),
      serverRecord('b', 'Server board B'),
    ]);
    const storage = storageWith(client);

    const listed = await storage.listCanvases(OWNER);

    expect(listed.map((canvas) => canvas.name)).toEqual([
      'Server board A',
      'Server board B',
    ]);
    // The server records map through, keeping revision metadata out of the
    // webapp's CanvasRecord shape
    expect(listed[0]).toMatchObject({ id: 'a', thumbnail: null });
  });

  it('appends local-only boards the server does not know', async () => {
    client.list.mockResolvedValue([serverRecord('a', 'Server board A')]);
    const local = new IndexedDbCanvasStorage({
      indexedDB: factory,
      locks,
      tldrawVersion: '3.15.6',
    });
    await local.createCanvas(OWNER, 'local-only');
    const storage = new SyncedCanvasStorage(local, {
      tldrawVersion: '3.15.6',
      createClient: () => client as unknown as CanvasClient,
    });

    const listed = await storage.listCanvases(OWNER);

    expect(listed.map((canvas) => canvas.id).sort()).toEqual([
      'a',
      'local-only',
    ]);
  });

  it('falls back to the local list when the server is unreachable', async () => {
    client.list.mockRejectedValue(new Error('offline'));
    const local = new IndexedDbCanvasStorage({
      indexedDB: factory,
      locks,
      tldrawVersion: '3.15.6',
    });
    await local.createCanvas(OWNER, 'offline-board');
    const storage = new SyncedCanvasStorage(local, {
      tldrawVersion: '3.15.6',
      createClient: () => client as unknown as CanvasClient,
    });

    const listed = await storage.listCanvases(OWNER);

    expect(listed.map((canvas) => canvas.id)).toEqual(['offline-board']);
  });
});
