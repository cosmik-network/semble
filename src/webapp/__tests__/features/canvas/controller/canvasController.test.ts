import { afterEach, describe, expect, it } from 'vitest';
import { createShapeId } from 'tldraw';
import type { CanvasDocument } from '@/features/canvas/storage/canvasStorage';
import { TLDRAW_VERSION } from '@/features/canvas/controller/canvasController';
import webappPackage from '../../../../package.json';
import { createTestBoard, type TestBoard } from '../harness/createTestBoard';

let board: TestBoard;

afterEach(async () => {
  await board?.dispose();
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

  it('should leave a board saved by a newer app untouched', async () => {
    // Arrange
    const first = await createTestBoard();
    await first.dispose();
    const newerDocument: CanvasDocument = {
      schema: {
        schemaVersion: 2,
        sequences: { 'semble.shape.link-card': 1 },
      },
      store: {},
    };
    const saver = first.storage.startSaving(
      first.canvasId,
      {
        getDocument: () => newerDocument,
        getSession: () => ({ editor: {} }),
        reportPendingChanges() {},
      },
      () => {},
    );
    saver.documentChanged();
    await saver.stop();

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
      await first.storage.openCanvas(first.canvasId, newerDocument.schema),
    ).toMatchObject({ document: newerDocument });
  });

  it('should record the tldraw version the webapp pins', () => {
    expect(TLDRAW_VERSION).toBe(webappPackage.dependencies.tldraw);
  });
});
