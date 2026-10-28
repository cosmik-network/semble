import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CanvasDocument,
  CanvasSchema,
  CanvasSession,
} from '@/features/canvas/storage/canvasStorage';
import {
  CANVAS_DB_NAME,
  IndexedDbCanvasStorage,
} from '@/features/canvas/storage/indexedDbCanvasStorage';

const OWNER = 'did:plc:owner';

const RUNNING_SCHEMA: CanvasSchema = {
  schemaVersion: 2,
  sequences: { 'com.tldraw.store': 4, 'com.tldraw.shape.note': 9 },
};

function documentWith(text: string, schema = RUNNING_SCHEMA): CanvasDocument {
  return {
    schema,
    store: { 'shape:a': { id: 'shape:a', typeName: 'shape', text } },
  };
}

const SESSION: CanvasSession = {
  editor: { version: 0, pageStates: [{ camera: { x: 10, y: 20, z: 2 } }] },
};

let factory: IDBFactory;

function openStorage() {
  return new IndexedDbCanvasStorage({
    indexedDB: factory,
    tldrawVersion: '3.15.6',
  });
}

function sourceOf(getDocument: () => CanvasDocument) {
  return { getDocument, getSession: () => SESSION, reportPendingChanges() {} };
}

async function saveNow(
  storage: IndexedDbCanvasStorage,
  id: string,
  doc: CanvasDocument,
) {
  const saver = storage.startSaving(
    id,
    sourceOf(() => doc),
    vi.fn(),
  );
  saver.documentChanged();
  await saver.stop();
}

function hideTab() {
  Object.defineProperty(document, 'visibilityState', {
    value: 'hidden',
    configurable: true,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  factory = new IDBFactory();
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(document, 'visibilityState', {
    value: 'visible',
    configurable: true,
  });
});

// ─────────────────────────────────────────────
// IndexedDbCanvasStorage
// ─────────────────────────────────────────────
describe('IndexedDbCanvasStorage', () => {
  it('should create an empty board for its owner', async () => {
    // Arrange
    const storage = openStorage();

    // Act
    const created = await storage.createCanvas(OWNER);
    const opened = await openStorage().openCanvas(created.id, RUNNING_SCHEMA);

    // Assert
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(opened).toEqual({
      status: 'ready',
      record: {
        id: created.id,
        ownerDid: OWNER,
        name: 'Untitled canvas',
        tldrawVersion: '3.15.6',
        linkCount: 0,
        createdAt: created.createdAt,
        updatedAt: created.createdAt,
      },
      document: null,
      session: null,
    });
  });

  it('should report a board that was never created as missing', async () => {
    // Act
    const opened = await openStorage().openCanvas(
      crypto.randomUUID(),
      RUNNING_SCHEMA,
    );

    // Assert
    expect(opened).toEqual({ status: 'missing' });
  });

  it('should round-trip the document with its schema, and the session', async () => {
    // Arrange
    const storage = openStorage();
    const { id } = await storage.createCanvas(OWNER);

    // Act
    await saveNow(storage, id, documentWith('hello'));
    const opened = await openStorage().openCanvas(id, RUNNING_SCHEMA);

    // Assert
    expect(opened).toMatchObject({
      status: 'ready',
      document: documentWith('hello'),
      session: SESSION,
    });
  });

  it('should save at most once per 500 ms, with the latest document', async () => {
    // Arrange
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const storage = openStorage();
    const { id } = await storage.createCanvas(OWNER);
    let text = 'first';
    const saver = storage.startSaving(
      id,
      sourceOf(() => documentWith(text)),
      vi.fn(),
    );

    // Act
    saver.documentChanged();
    text = 'second';
    saver.documentChanged();
    await vi.advanceTimersByTimeAsync(499);
    const beforeThrottle = await openStorage().openCanvas(id, RUNNING_SCHEMA);
    await vi.advanceTimersByTimeAsync(1);
    const afterThrottle = await openStorage().openCanvas(id, RUNNING_SCHEMA);

    // Assert
    expect(beforeThrottle).toMatchObject({ document: null });
    expect(afterThrottle).toMatchObject({ document: documentWith('second') });
  });

  it('should save pending changes as soon as the tab is hidden', async () => {
    // Arrange
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const storage = openStorage();
    const { id } = await storage.createCanvas(OWNER);
    const saver = storage.startSaving(
      id,
      sourceOf(() => documentWith('hidden')),
      vi.fn(),
    );

    // Act
    saver.documentChanged();
    hideTab();
    await vi.advanceTimersByTimeAsync(0);
    const opened = await openStorage().openCanvas(id, RUNNING_SCHEMA);

    // Assert
    expect(opened).toMatchObject({
      document: documentWith('hidden'),
      session: SESSION,
    });
  });

  it('should save changes the board reports only when asked, on hide', async () => {
    // Arrange
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const storage = openStorage();
    const { id } = await storage.createCanvas(OWNER);
    let unreported = true;
    const saver = storage.startSaving(
      id,
      {
        ...sourceOf(() => documentWith('late')),
        reportPendingChanges() {
          if (unreported) saver.documentChanged();
          unreported = false;
        },
      },
      vi.fn(),
    );

    // Act
    hideTab();
    await vi.advanceTimersByTimeAsync(0);
    const opened = await openStorage().openCanvas(id, RUNNING_SCHEMA);

    // Assert
    expect(opened).toMatchObject({ document: documentWith('late') });
  });

  it.each([
    ['a sequence past the running code', { 'com.tldraw.shape.note': 10 }],
    ['a sequence the running code lacks', { 'semble.shape.link-card': 1 }],
  ])(
    'should refuse a document saved with %s',
    async (_label, newerSequences) => {
      // Arrange
      const storage = openStorage();
      const { id } = await storage.createCanvas(OWNER);
      const newerSchema: CanvasSchema = {
        schemaVersion: 2,
        sequences: { ...RUNNING_SCHEMA.sequences, ...newerSequences },
      };
      await saveNow(storage, id, documentWith('from the future', newerSchema));

      // Act
      const opened = await openStorage().openCanvas(id, RUNNING_SCHEMA);

      // Assert
      expect(opened).toEqual({ status: 'newer-version' });
    },
  );

  it('should open a document saved by older code', async () => {
    // Arrange
    const storage = openStorage();
    const { id } = await storage.createCanvas(OWNER);
    const olderSchema: CanvasSchema = {
      schemaVersion: 2,
      sequences: { 'com.tldraw.store': 4, 'com.tldraw.shape.note': 7 },
    };
    await saveNow(storage, id, documentWith('old', olderSchema));

    // Act
    const opened = await openStorage().openCanvas(id, RUNNING_SCHEMA);

    // Assert
    expect(opened).toMatchObject({
      status: 'ready',
      document: documentWith('old', olderSchema),
    });
  });

  it('should report a failed write after site data is cleared', async () => {
    // Arrange
    const storage = openStorage();
    const { id } = await storage.createCanvas(OWNER);
    const onError = vi.fn();
    const saver = storage.startSaving(
      id,
      sourceOf(() => documentWith('lost')),
      onError,
    );
    await new Promise<void>((resolve) => {
      const request = factory.deleteDatabase(CANVAS_DB_NAME);
      request.onsuccess = () => resolve();
    });

    // Act
    saver.documentChanged();
    await saver.stop();

    // Assert
    expect(onError).toHaveBeenCalledOnce();
  });
});
