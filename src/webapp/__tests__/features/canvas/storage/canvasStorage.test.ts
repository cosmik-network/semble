import { IDBFactory } from 'fake-indexeddb';
import webappPackage from '../../../../package.json';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  BoardEvents,
  CanvasDocument,
  CanvasSchema,
  CanvasSession,
  CanvasSource,
} from '@/features/canvas/storage/canvasStorage';
import { TLDRAW_VERSION } from '@/features/canvas/storage/browserCanvasStorage';
import {
  CANVAS_DB_NAME,
  IndexedDbCanvasStorage,
} from '@/features/canvas/storage/indexedDbCanvasStorage';
import { FakeLocks } from '../harness/fakeLocks';

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
let locks: FakeLocks;

// Each call stands in for another tab: they share the database and the locks
function openStorage() {
  return new IndexedDbCanvasStorage({
    indexedDB: factory,
    locks,
    tldrawVersion: '3.15.6',
  });
}

// A board opened as the canvas page opens it, with every event recorded
function openBoard(
  storage: IndexedDbCanvasStorage,
  id: string,
  source: CanvasSource = sourceOf(() => documentWith('unsaved')),
  runningSchema = RUNNING_SCHEMA,
) {
  const events = {
    onLoad: vi.fn<BoardEvents['onLoad']>(),
    onRemoteSave: vi.fn<BoardEvents['onRemoteSave']>(),
    onRoleChange: vi.fn<BoardEvents['onRoleChange']>(),
    onTakenOver: vi.fn<BoardEvents['onTakenOver']>(),
    onSaveError: vi.fn<BoardEvents['onSaveError']>(),
  };
  const board = storage.openBoard(
    id,
    { ownerDid: OWNER, runningSchema, source },
    events,
  );
  return Object.assign(board, { events });
}

async function openWriter(
  storage: IndexedDbCanvasStorage,
  id: string,
  source: CanvasSource,
) {
  const board = openBoard(storage, id, source);
  await board.opened;
  expect(board.events.onRoleChange).toHaveBeenLastCalledWith('writer');
  return board;
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
  const board = await openWriter(
    storage,
    id,
    sourceOf(() => doc),
  );
  board.documentChanged();
  await board.close();
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
  locks = new FakeLocks();
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
    const board = await openWriter(storage, id, {
      ...sourceOf(() => documentWith('drawn')),
      getThumbnail,
    });

    // Act
    board.documentChanged();
    await vi.advanceTimersByTimeAsync(1500);
    board.documentChanged();
    await vi.advanceTimersByTimeAsync(1999);
    const [whileEditing] = await openStorage().listCanvases(OWNER);
    await vi.advanceTimersByTimeAsync(1);
    const [afterPause] = await openStorage().listCanvases(OWNER);
    image = 'data:image/png;base64,SECOND';
    board.documentChanged();
    await board.close();
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
    const board = await openWriter(storage, id, {
      ...sourceOf(() => documentWith('drawn again')),
      getThumbnail: () => Promise.reject(new Error('editor disposed')),
    });

    // Act
    board.documentChanged();
    await board.close();
    const [listed] = await openStorage().listCanvases(OWNER);

    // Assert
    expect(listed.thumbnail).toBe(THUMBNAIL);
    expect(board.events.onSaveError).not.toHaveBeenCalled();
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
        openWriter(
          storage,
          id,
          sourceOf(() => documentWith('saved')),
        ).then((board) => board.close()),
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
    const board = await openWriter(
      storage,
      id,
      sourceOf(() => documentWith(text)),
    );

    // Act
    board.documentChanged();
    text = 'second';
    board.documentChanged();
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
    const board = await openWriter(
      storage,
      id,
      sourceOf(() => documentWith('hidden')),
    );

    // Act
    board.documentChanged();
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
    const board = await openWriter(storage, id, {
      ...sourceOf(() => documentWith('late')),
      reportPendingChanges() {
        if (unreported) board.documentChanged();
        unreported = false;
      },
    });

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
    const board = await openWriter(
      storage,
      id,
      sourceOf(() => documentWith('lost')),
    );
    await new Promise<void>((resolve) => {
      const request = factory.deleteDatabase(CANVAS_DB_NAME);
      request.onsuccess = () => resolve();
    });

    // Act
    board.documentChanged();
    await board.close();

    // Assert
    expect(board.events.onSaveError).toHaveBeenCalled();
  });

  it('should record the tldraw version the webapp pins', () => {
    expect(TLDRAW_VERSION).toBe(webappPackage.dependencies.tldraw);
  });
});

const NEWER_SCHEMA: CanvasSchema = {
  schemaVersion: 2,
  sequences: { ...RUNNING_SCHEMA.sequences, 'semble.shape.link-card': 1 },
};

// ─────────────────────────────────────────────
// openBoard
// ─────────────────────────────────────────────
describe('openBoard', () => {
  it('should let one tab write a board while the others read it', async () => {
    // Arrange
    const { id } = await openStorage().createCanvas(OWNER);
    const first = openBoard(openStorage(), id);
    await first.opened;

    // Act
    const second = openBoard(openStorage(), id);
    const otherBoard = openBoard(openStorage(), crypto.randomUUID());
    await Promise.all([second.opened, otherBoard.opened]);

    // Assert
    expect(first.events.onRoleChange.mock.calls).toEqual([['writer']]);
    expect(second.events.onRoleChange.mock.calls).toEqual([['reader']]);
    expect(otherBoard.events.onRoleChange.mock.calls).toEqual([['writer']]);
  });

  it('should hand writing to a tab that takes over, and tell the former writer', async () => {
    // Arrange
    const { id } = await openStorage().createCanvas(OWNER);
    const first = openBoard(openStorage(), id);
    await first.opened;
    const second = openBoard(openStorage(), id);
    await second.opened;

    // Act
    await second.takeOver();
    await vi.waitFor(() =>
      expect(first.events.onRoleChange).toHaveBeenLastCalledWith('reader'),
    );

    // Assert
    expect(second.events.onRoleChange).toHaveBeenLastCalledWith('writer');
    expect(first.events.onTakenOver).toHaveBeenCalledTimes(1);
  });

  it('should save nothing more from a tab once another takes the board over', async () => {
    // Arrange
    const firstTab = openStorage();
    const { id } = await firstTab.createCanvas(OWNER);
    await saveNow(firstTab, id, documentWith('before take-over'));
    const first = await openWriter(
      firstTab,
      id,
      sourceOf(() => documentWith('after take-over')),
    );
    const second = openBoard(openStorage(), id);
    await second.opened;
    await second.takeOver();
    await vi.waitFor(() => expect(first.events.onTakenOver).toHaveBeenCalled());

    // Act
    first.documentChanged();
    await first.close();
    await second.close();
    const opened = await openStorage().openCanvas(id, RUNNING_SCHEMA);

    // Assert
    expect(opened).toMatchObject({
      document: documentWith('before take-over'),
    });
  });

  it('should let a board reopened in the same tab write once the last one closes', async () => {
    // Arrange
    const sameTab = openStorage();
    const { id } = await sameTab.createCanvas(OWNER);
    const first = openBoard(sameTab, id);
    await first.opened;

    // Act
    const closing = first.close();
    const reopened = openBoard(sameTab, id);
    await Promise.all([closing, reopened.opened]);

    // Assert
    expect(reopened.events.onRoleChange.mock.calls).toEqual([['writer']]);
    expect(first.events.onTakenOver).not.toHaveBeenCalled();
  });

  it('should hand writing to a reading tab once the writer closes', async () => {
    // Arrange
    const { id } = await openStorage().createCanvas(OWNER);
    const writer = openBoard(openStorage(), id);
    await writer.opened;
    const reader = openBoard(
      openStorage(),
      id,
      sourceOf(() => documentWith('saved by the next writer')),
    );
    await reader.opened;

    // Act
    await writer.close();
    await vi.waitFor(() =>
      expect(reader.events.onRoleChange).toHaveBeenLastCalledWith('writer'),
    );
    reader.documentChanged();
    await reader.close();
    const opened = await openStorage().openCanvas(id, RUNNING_SCHEMA);

    // Assert
    expect(opened).toMatchObject({
      document: documentWith('saved by the next writer'),
    });
  });

  it("should show a reading tab each of the writer's saves", async () => {
    // Arrange
    const writerTab = openStorage();
    const { id } = await writerTab.createCanvas(OWNER);
    let text = 'first save';
    const writer = await openWriter(
      writerTab,
      id,
      sourceOf(() => documentWith(text)),
    );
    const reader = openBoard(openStorage(), id);
    await reader.opened;

    // Act
    writer.documentChanged();
    await vi.waitFor(() =>
      expect(reader.events.onRemoteSave).toHaveBeenLastCalledWith(
        documentWith('first save'),
      ),
    );
    text = 'second save';
    writer.documentChanged();

    // Assert
    await vi.waitFor(() =>
      expect(reader.events.onRemoteSave).toHaveBeenLastCalledWith(
        documentWith('second save'),
      ),
    );
    await writer.close();
    await reader.close();
  });

  it('should take over with the lock a waiting tab was just given', async () => {
    // Arrange
    const { id } = await openStorage().createCanvas(OWNER);
    const writer = openBoard(openStorage(), id);
    await writer.opened;
    const reader = openBoard(openStorage(), id);
    await reader.opened;
    const thirdTab = openBoard(openStorage(), id);
    await thirdTab.opened;

    // Act
    const closing = writer.close();
    await reader.takeOver();
    await closing;
    await thirdTab.close();

    // Assert
    expect(reader.events.onRoleChange).toHaveBeenLastCalledWith('writer');
    expect(reader.events.onTakenOver).not.toHaveBeenCalled();
  });

  it('should not take over a board a newer app has saved since', async () => {
    // Arrange
    const { id } = await openStorage().createCanvas(OWNER);
    const newerApp = await openWriter(
      openStorage(),
      id,
      sourceOf(() => documentWith('from a newer app', NEWER_SCHEMA)),
    );
    const reader = openBoard(openStorage(), id);
    await reader.opened;
    newerApp.documentChanged();
    // Whether or not the reading tab has heard yet, it mustn't take over
    await vi.waitFor(async () =>
      expect(await openStorage().openCanvas(id, RUNNING_SCHEMA)).toEqual({
        status: 'newer-version',
      }),
    );

    // Act
    await reader.takeOver();
    newerApp.documentChanged();
    await newerApp.close();
    await reader.close();

    // Assert
    expect(reader.events.onRoleChange).toHaveBeenLastCalledWith(
      'newer-version',
    );
    expect(newerApp.events.onTakenOver).not.toHaveBeenCalled();
    expect(await openStorage().openCanvas(id, NEWER_SCHEMA)).toMatchObject({
      document: documentWith('from a newer app', NEWER_SCHEMA),
    });
  });

  it('should hand a newer save to no tab that runs older code', async () => {
    // Arrange
    const { id } = await openStorage().createCanvas(OWNER);
    const olderWriter = openBoard(openStorage(), id);
    await olderWriter.opened;
    const newerApp = openBoard(
      openStorage(),
      id,
      sourceOf(() => documentWith('from a newer app', NEWER_SCHEMA)),
      NEWER_SCHEMA,
    );
    await newerApp.opened;
    await newerApp.takeOver();
    newerApp.documentChanged();

    // Act
    await newerApp.close();
    await vi.waitFor(() =>
      expect(olderWriter.events.onRoleChange).toHaveBeenLastCalledWith(
        'newer-version',
      ),
    );
    olderWriter.documentChanged();
    await olderWriter.close();

    // Assert
    expect(await openStorage().openCanvas(id, NEWER_SCHEMA)).toMatchObject({
      document: documentWith('from a newer app', NEWER_SCHEMA),
    });
  });
});

// ─────────────────────────────────────────────
// Write lock: races openBoard can't set up
// ─────────────────────────────────────────────
describe('IndexedDbCanvasStorage write lock', () => {
  it('should refuse a save already under way when another tab takes over', async () => {
    // Arrange
    locks.holdBackAborts = true;
    const firstTab = openStorage();
    const { id } = await firstTab.createCanvas(OWNER);
    await saveNow(firstTab, id, documentWith('before take-over'));
    const first = await firstTab.claimCanvas(id, vi.fn());
    const onSaveError = vi.fn();
    const saver = firstTab.startSaving(
      first!,
      sourceOf(() => documentWith('after take-over')),
      onSaveError,
    );
    await openStorage().claimCanvas(id, vi.fn(), { mode: 'take-over' });

    // Act
    saver.documentChanged();
    await saver.stop();
    const heldWhileSaving = first!.isHeld();
    locks.deliverAborts();
    const opened = await openStorage().openCanvas(id, RUNNING_SCHEMA);

    // Assert
    expect(heldWhileSaving).toBe(true);
    expect(opened).toMatchObject({
      document: documentWith('before take-over'),
    });
    // The edits are lost, and nothing else tells this tab yet
    expect(onSaveError).toHaveBeenCalled();
  });

  it('should keep saving for a tab that took over while the former writer was still being granted', async () => {
    // Arrange
    const { id } = await openStorage().createCanvas(OWNER);
    const firstTab = openStorage();
    const secondTab = openStorage();
    // Its database is already open, so its writer is recorded first
    await secondTab.getCanvas(id);

    // Act
    const first = firstTab.claimCanvas(id, vi.fn());
    const second = await secondTab.claimCanvas(id, vi.fn(), {
      mode: 'take-over',
    });
    await first.catch(() => null);
    const saver = secondTab.startSaving(
      second!,
      sourceOf(() => documentWith('saved by the new writer')),
      vi.fn(),
    );
    saver.documentChanged();
    await saver.stop();
    const opened = await openStorage().openCanvas(id, RUNNING_SCHEMA);

    // Assert
    expect(opened).toMatchObject({
      document: documentWith('saved by the new writer'),
    });
  });

  it('should let go of a board granted just as the wait for it was cancelled', async () => {
    // Arrange
    const { id } = await openStorage().createCanvas(OWNER);
    const writer = await openStorage().claimCanvas(id, vi.fn());
    const wait = new AbortController();
    const waiting = openStorage().claimCanvas(id, vi.fn(), {
      mode: 'when-free',
      signal: wait.signal,
    });

    // Act
    await writer!.release();
    wait.abort();
    const outcome = await waiting.catch((error) => error);
    const next = await openStorage().claimCanvas(id, vi.fn());

    // Assert
    expect(outcome).toMatchObject({ name: 'AbortError' });
    expect(next?.isHeld()).toBe(true);
  });
});
