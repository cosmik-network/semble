import { IDBFactory } from 'fake-indexeddb';
import webappPackage from '../../../../package.json';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CanvasDocument,
  CanvasSchema,
  CanvasSession,
} from '@/features/canvas/storage/canvasStorage';
import { TLDRAW_VERSION } from '@/features/canvas/storage/browserCanvasStorage';
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

const THUMBNAIL = 'data:image/png;base64,AAAA';

function sourceOf(getDocument: () => CanvasDocument) {
  return {
    getDocument,
    getSession: () => SESSION,
    getThumbnail: async () => THUMBNAIL,
    reportPendingChanges() {},
  };
}

function linkCard(id: string, url: string) {
  return { id, typeName: 'shape', type: 'link-card', props: { url } };
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

  it("should list the owner's boards, most recently edited first", async () => {
    // Arrange
    vi.useFakeTimers({ toFake: ['Date'] });
    const storage = openStorage();
    vi.setSystemTime('2026-01-01');
    const older = await storage.createCanvas(OWNER);
    vi.setSystemTime('2026-01-02');
    const newer = await storage.createCanvas(OWNER);
    await storage.createCanvas('did:plc:someone-else');
    vi.setSystemTime('2026-01-03');
    await saveNow(storage, older.id, documentWith('edited'));

    // Act
    const listed = await openStorage().listCanvases(OWNER);

    // Assert
    expect(listed.map((canvas) => canvas.id)).toEqual([older.id, newer.id]);
    expect(listed[0]).toMatchObject({
      updatedAt: '2026-01-03T00:00:00.000Z',
    });
  });

  it('should read one board without its document', async () => {
    // Arrange
    const storage = openStorage();
    const { id } = await storage.createCanvas(OWNER);
    await storage.renameCanvas(id, 'Climate reading');

    // Act
    const found = await openStorage().getCanvas(id);
    const missing = await openStorage().getCanvas(crypto.randomUUID());

    // Assert
    expect(found).toMatchObject({ id, name: 'Climate reading' });
    expect(missing).toBeNull();
  });

  it('should rename a board without touching its document', async () => {
    // Arrange
    const storage = openStorage();
    const { id } = await storage.createCanvas(OWNER);
    await saveNow(storage, id, documentWith('kept'));

    // Act
    await storage.renameCanvas(id, 'Climate reading');
    const opened = await openStorage().openCanvas(id, RUNNING_SCHEMA);

    // Assert
    expect(opened).toMatchObject({
      record: { name: 'Climate reading' },
      document: documentWith('kept'),
    });
  });

  it('should duplicate a board as a new one with the same document', async () => {
    // Arrange
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime('2026-01-01');
    const storage = openStorage();
    const original = await storage.createCanvas(OWNER);
    await storage.renameCanvas(original.id, 'Climate reading');
    await saveNow(storage, original.id, documentWith('shared'));
    vi.setSystemTime('2026-01-02');

    // Act
    const copy = await storage.duplicateCanvas(original.id);
    const opened = await openStorage().openCanvas(copy.id, RUNNING_SCHEMA);
    const listed = await openStorage().listCanvases(OWNER);

    // Assert
    expect(copy.id).not.toBe(original.id);
    expect(opened).toMatchObject({
      status: 'ready',
      record: { name: 'Copy of Climate reading', ownerDid: OWNER },
      document: documentWith('shared'),
    });
    expect(listed.map((canvas) => canvas.id)).toEqual([copy.id, original.id]);
  });

  it('should delete a board with its document and session', async () => {
    // Arrange
    const storage = openStorage();
    const doomed = await storage.createCanvas(OWNER);
    const kept = await storage.createCanvas(OWNER);
    await saveNow(storage, doomed.id, documentWith('gone'));

    // Act
    await storage.deleteCanvas(doomed.id);
    await storage.createCanvas(OWNER, doomed.id);
    const reopened = await openStorage().openCanvas(doomed.id, RUNNING_SCHEMA);
    await storage.deleteCanvas(doomed.id);
    const listed = await openStorage().listCanvases(OWNER);

    // Assert
    expect(reopened).toMatchObject({ document: null, session: null });
    expect(listed.map((canvas) => canvas.id)).toEqual([kept.id]);
  });

  it('should capture the thumbnail once edits pause for 2 s', async () => {
    // Arrange
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const storage = openStorage();
    const { id } = await storage.createCanvas(OWNER);
    let image = 'data:image/png;base64,FIRST';
    const getThumbnail = vi.fn(async () => image);
    const saver = storage.startSaving(
      id,
      { ...sourceOf(() => documentWith('drawn')), getThumbnail },
      vi.fn(),
    );

    // Act
    saver.documentChanged();
    await vi.advanceTimersByTimeAsync(1500);
    saver.documentChanged();
    await vi.advanceTimersByTimeAsync(1999);
    const [whileEditing] = await openStorage().listCanvases(OWNER);
    await vi.advanceTimersByTimeAsync(1);
    const [afterPause] = await openStorage().listCanvases(OWNER);
    image = 'data:image/png;base64,SECOND';
    saver.documentChanged();
    await saver.stop();
    const [afterLeaving] = await openStorage().listCanvases(OWNER);

    // Assert
    expect(whileEditing.thumbnail).toBeNull();
    expect(afterPause.thumbnail).toBe('data:image/png;base64,FIRST');
    expect(afterLeaving.thumbnail).toBe('data:image/png;base64,SECOND');
    expect(getThumbnail).toHaveBeenCalledTimes(2);
  });

  it('should keep the last thumbnail when a capture fails, without reporting it', async () => {
    // Arrange
    const storage = openStorage();
    const { id } = await storage.createCanvas(OWNER);
    await saveNow(storage, id, documentWith('drawn'));
    const onError = vi.fn();
    const saver = storage.startSaving(
      id,
      {
        ...sourceOf(() => documentWith('drawn again')),
        getThumbnail: () => Promise.reject(new Error('editor disposed')),
      },
      onError,
    );

    // Act
    saver.documentChanged();
    await saver.stop();
    const [listed] = await openStorage().listCanvases(OWNER);

    // Assert
    expect(listed.thumbnail).toBe(THUMBNAIL);
    expect(onError).not.toHaveBeenCalled();
  });

  it('should count the distinct links in the last saved document', async () => {
    // Arrange
    const storage = openStorage();
    const { id } = await storage.createCanvas(OWNER);

    // Act
    await saveNow(storage, id, {
      schema: RUNNING_SCHEMA,
      store: {
        'shape:a': linkCard('shape:a', 'https://example.com/'),
        'shape:b': linkCard('shape:b', 'https://example.com/'),
        'shape:c': linkCard('shape:c', 'https://semble.so/'),
        'shape:d': { id: 'shape:d', typeName: 'shape', type: 'note' },
      },
    });
    const [listed] = await openStorage().listCanvases(OWNER);

    // Assert
    expect(listed.linkCount).toBe(2);
  });

  it('should tell subscribers each time the list changes', async () => {
    // Arrange
    const storage = openStorage();
    const listener = vi.fn();
    const unsubscribe = storage.subscribe(listener);
    const heard = async (change: () => Promise<unknown>) => {
      listener.mockClear();
      await change();
      return listener.mock.calls.length > 0;
    };

    let id = '';

    // Act
    const changes = {
      create: await heard(async () => {
        ({ id } = await storage.createCanvas(OWNER));
      }),
      rename: await heard(() => storage.renameCanvas(id, 'Renamed')),
      save: await heard(() => saveNow(storage, id, documentWith('saved'))),
      sessionOnlySave: await heard(() =>
        storage
          .startSaving(
            id,
            sourceOf(() => documentWith('saved')),
            vi.fn(),
          )
          .stop(),
      ),
      duplicate: await heard(() => storage.duplicateCanvas(id)),
      delete: await heard(() => storage.deleteCanvas(id)),
    };
    unsubscribe();
    const afterUnsubscribing = await heard(() => storage.createCanvas(OWNER));

    // Assert
    expect(changes).toEqual({
      create: true,
      rename: true,
      save: true,
      sessionOnlySave: false,
      duplicate: true,
      delete: true,
    });
    expect(afterUnsubscribing).toBe(false);
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
    expect(onError).toHaveBeenCalled();
  });

  it('should record the tldraw version the webapp pins', () => {
    expect(TLDRAW_VERSION).toBe(webappPackage.dependencies.tldraw);
  });
});
