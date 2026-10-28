import { afterEach, describe, expect, it, vi } from 'vitest';
import { createShapeId } from 'tldraw';
import type {
  CanvasDocument,
  CanvasStorage,
} from '@/features/canvas/storage/canvasStorage';
import { createTestBoard, type TestBoard } from '../harness/createTestBoard';

const NEWER_DOCUMENT: CanvasDocument = {
  schema: { schemaVersion: 2, sequences: { 'semble.shape.link-card': 1 } },
  store: {},
};

// Opens the board in a newer app's tab, takes it over and saves; the caller
// closes it
async function saveFromNewerApp(storage: CanvasStorage, canvasId: string) {
  const newerApp = storage.openBoard(
    canvasId,
    {
      ownerDid: 'did:plc:tester',
      runningSchema: NEWER_DOCUMENT.schema,
      source: {
        getDocument: () => NEWER_DOCUMENT,
        getSession: () => ({ editor: {} }),
        getThumbnail: async () => null,
        reportPendingChanges() {},
      },
    },
    {
      onLoad() {},
      onRemoteSave() {},
      onRoleChange() {},
      onTakenOver() {},
      onSaveError() {},
    },
  );
  await newerApp.opened;
  await newerApp.takeOver();
  newerApp.documentChanged();
  return newerApp;
}

let board: TestBoard;
// A second tab on the same board, when a test opens one
let otherTab: TestBoard | undefined;

afterEach(async () => {
  await board?.dispose();
  await otherTab?.dispose();
  otherTab = undefined;
});

// ─────────────────────────────────────────────
// attachCanvasController
// ─────────────────────────────────────────────
describe('attachCanvasController', () => {
  it('should let the user sketch without calling the server', async () => {
    // Arrange
    board = await createTestBoard();

    // Act
    board.editor.createShapes([
      { type: 'note', x: 0, y: 0 },
      { type: 'text', x: 300, y: 0 },
      { type: 'frame', x: 0, y: 400, props: { w: 400, h: 300 } },
    ]);
    board.editor.setCurrentTool('draw');
    board.drag([600, 600], [700, 650]);

    // Assert
    const types = board.editor
      .getCurrentPageShapes()
      .map((shape) => shape.type)
      .sort();
    expect(types).toEqual(['draw', 'frame', 'note', 'text']);
    expect(board.server.calls).toEqual([]);
  });

  it('should restore shapes, camera and selection when the board is reopened', async () => {
    // Arrange
    const first = await createTestBoard();
    const noteId = createShapeId();
    first.editor.createShape({ id: noteId, type: 'note', x: 40, y: 80 });
    first.editor.select(noteId);
    first.editor.setCamera({ x: -120, y: 60, z: 1.5 });
    await first.dispose();

    // Act
    board = await createTestBoard({
      storage: first.storage,
      canvasId: first.canvasId,
    });

    // Assert
    expect(board.status).toBe('ready');
    expect(board.editor.getShape(noteId)).toMatchObject({ x: 40, y: 80 });
    expect(board.editor.getSelectedShapeIds()).toEqual([noteId]);
    expect(board.editor.getCamera()).toMatchObject({ x: -120, y: 60, z: 1.5 });
  });

  it('should save changes that did not come from the user', async () => {
    // Arrange
    const first = await createTestBoard();
    const noteId = createShapeId();

    // Act
    first.editor.store.mergeRemoteChanges(() => {
      first.editor.createShape({ id: noteId, type: 'note' });
    });
    await first.dispose();
    board = await createTestBoard({
      storage: first.storage,
      canvasId: first.canvasId,
    });

    // Assert
    expect(board.editor.getShape(noteId)).toBeDefined();
  });

  it('should not save a board that was only opened', async () => {
    // Arrange
    const first = await createTestBoard();
    first.editor.createShape({ type: 'note' });
    await first.dispose();
    const [saved] = await first.storage.listCanvases('did:plc:tester');

    // Act
    board = await createTestBoard({
      storage: first.storage,
      canvasId: first.canvasId,
    });
    await board.dispose();
    const [reopened] = await first.storage.listCanvases('did:plc:tester');

    // Assert
    expect(reopened.updatedAt).toBe(saved.updatedAt);
  });

  it('should leave a board saved by a newer app untouched', async () => {
    // Arrange
    const first = await createTestBoard();
    await first.dispose();
    const newerApp = await saveFromNewerApp(first.storage, first.canvasId);
    await newerApp.close();

    // Act
    board = await createTestBoard({
      storage: first.storage,
      canvasId: first.canvasId,
    });
    board.editor.createShape({ type: 'note' });
    await board.dispose();

    // Assert
    expect(board.status).toBe('newer-version');
    expect(
      await first.storage.openCanvas(first.canvasId, NEWER_DOCUMENT.schema),
    ).toMatchObject({ document: NEWER_DOCUMENT });
  });
  it('should list a thumbnail of the board once it is left', async () => {
    // Arrange
    const first = await createTestBoard();
    const empty = await createTestBoard({ storage: first.storage });
    first.editor.createShape({ type: 'note' });

    // Act
    await first.dispose();
    await empty.dispose();
    const listed = await first.storage.listCanvases('did:plc:tester');

    // Assert
    const thumbnailOf = (id: string) =>
      listed.find((canvas) => canvas.id === id)?.thumbnail;
    expect(thumbnailOf(first.canvasId)).toMatch(/^data:image\/jpeg;base64,/);
    expect(thumbnailOf(empty.canvasId)).toBeNull();
  });

  it('should open a board already open in another tab as read-only', async () => {
    // Arrange
    board = await createTestBoard();

    // Act
    otherTab = await board.openInAnotherTab();

    // Assert
    expect(board.editor.getIsReadonly()).toBe(false);
    expect(otherTab.editor.getIsReadonly()).toBe(true);
  });

  it("should show the writer's saves in a read-only tab", async () => {
    // Arrange
    board = await createTestBoard();
    otherTab = await board.openInAnotherTab();
    const noteId = createShapeId();

    // Act
    board.editor.createShape({ id: noteId, type: 'note', x: 40, y: 80 });

    // Assert
    await vi.waitFor(() =>
      expect(otherTab!.editor.getShape(noteId)).toMatchObject({ x: 40, y: 80 }),
    );
  });

  it("should apply only what changed in the writer's saves to a read-only tab", async () => {
    // Arrange
    board = await createTestBoard();
    const keptId = createShapeId();
    const deletedId = createShapeId();
    board.editor.createShapes([
      { id: keptId, type: 'note', x: 0, y: 0 },
      { id: deletedId, type: 'note', x: 300, y: 0 },
    ]);
    otherTab = await board.openInAnotherTab();
    await vi.waitFor(() =>
      expect(otherTab!.editor.getShape(deletedId)).toBeDefined(),
    );
    const keptBefore = otherTab.editor.getShape(keptId);

    // Act
    board.editor.deleteShape(deletedId);

    // Assert
    await vi.waitFor(() =>
      expect(otherTab!.editor.getShape(deletedId)).toBeUndefined(),
    );
    expect(otherTab.editor.getShape(keptId)).toBe(keptBefore);
  });

  it('should hand writing to a tab that takes over, leaving the former writer read-only', async () => {
    // Arrange
    board = await createTestBoard();
    otherTab = await board.openInAnotherTab();
    const keptId = createShapeId();
    const refusedId = createShapeId();

    // Act
    await otherTab.takeOver();
    await vi.waitFor(() => expect(board.editor.getIsReadonly()).toBe(true));
    otherTab.editor.createShape({ id: keptId, type: 'note' });
    board.editor.store.mergeRemoteChanges(() => {
      board.editor.createShape({ id: refusedId, type: 'note' });
    });
    const takenOver = otherTab;
    const formerWriter = board;
    await takenOver.dispose();
    await board.dispose();
    board = await createTestBoard({
      storage: board.storage,
      canvasId: board.canvasId,
    });

    // Assert
    expect(takenOver.editor.getIsReadonly()).toBe(false);
    expect(formerWriter.timesTakenOver).toBe(1);
    expect(board.editor.getShape(keptId)).toBeDefined();
    expect(board.editor.getShape(refusedId)).toBeUndefined();
  });

  it('should stop showing a board a newer app has saved since', async () => {
    // Arrange
    board = await createTestBoard();
    otherTab = await board.openInAnotherTab();

    // Act
    const newerApp = await saveFromNewerApp(
      board.storageInAnotherTab(),
      board.canvasId,
    );

    // Assert
    await vi.waitFor(() => expect(otherTab!.status).toBe('newer-version'));
    await vi.waitFor(() => expect(board.status).toBe('newer-version'));
    expect(board.editor.getIsReadonly()).toBe(true);
    await newerApp.close();
  });
});
