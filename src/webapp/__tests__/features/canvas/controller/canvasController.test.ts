import { afterEach, describe, expect, it } from 'vitest';
import { createTestBoard, type TestBoard } from '../harness/createTestBoard';

let board: TestBoard;

afterEach(() => {
  board?.dispose();
});

// ─────────────────────────────────────────────
// attachCanvasController
// ─────────────────────────────────────────────
describe('attachCanvasController', () => {
  it('should let the user sketch without calling the server', () => {
    // Arrange
    board = createTestBoard();

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
});
