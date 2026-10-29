import { afterEach, describe, expect, it, vi } from 'vitest';
import { createShapeId, toRichText, type TLNoteShape } from 'tldraw';
import { canvasKeys } from '@/features/canvas/lib/canvasKeys';
import { cardKeys } from '@/features/cards/lib/cardKeys';
import type { LinkInfo } from '@/features/canvas/server/canvasServer';
import type {
  CanvasDocument,
  CanvasStorage,
} from '@/features/canvas/storage/canvasStorage';
import { createTestBoard, type TestBoard } from '../harness/createTestBoard';
import { FakeServer, testLink } from '../harness/fakeServer';

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

// ─────────────────────────────────────────────
// Link cards
// ─────────────────────────────────────────────
describe('link cards', () => {
  const linkOf = (url: string) =>
    board.queryClient.getQueryData<LinkInfo>(canvasKeys.link(url));

  it('should place a pasted link at the centre of the view', async () => {
    // Arrange
    board = await createTestBoard();
    board.editor.setCamera({ x: -400, y: 250, z: 1 });

    // Act
    await board.pasteUrl('https://example.com/article');
    const [placed] = board.linkCards();
    await vi.waitFor(() =>
      expect(board.editor.getShape(placed.id)!.props).not.toMatchObject({
        h: placed.props.h,
      }),
    );

    // Assert
    const [card] = board.linkCards();
    expect(card.props.url).toBe('https://example.com/article');
    const center = board.editor.getShapePageBounds(card)!.center;
    const viewCenter = board.editor.getViewportPageBounds().center;
    expect(center.x).toBeCloseTo(viewCenter.x);
    expect(center.y).toBeCloseTo(viewCenter.y);
  });

  it('should place a dropped link where it was dropped', async () => {
    // Arrange
    board = await createTestBoard();

    // Act
    await board.dropUrl('https://example.com/article', { x: 900, y: -300 });

    // Assert
    const [card] = board.linkCards();
    const center = board.editor.getShapePageBounds(card)!.center;
    expect(center.x).toBeCloseTo(900);
    expect(center.y).toBeCloseTo(-300);
  });

  it('should match links the way the server does', async () => {
    // Arrange
    board = await createTestBoard();

    // Act
    await board.pasteUrl('https://example.com');
    await board.pasteUrl('  https://example.com/ ');
    await board.pasteText('https://example.com\n');
    await board.pasteUrl('https://example.com/article/');

    // Assert
    expect(board.linkCards().map((card) => card.props.url)).toEqual([
      'https://example.com/',
      'https://example.com/',
      'https://example.com/',
      'https://example.com/article/',
    ]);
  });

  it('should place links without saving them', async () => {
    // Arrange
    board = await createTestBoard();

    // Act
    await board.pasteUrl('https://example.com/article');
    await board.dropUrl('https://example.com/other', { x: 0, y: 0 });
    await vi.waitFor(() =>
      expect(linkOf('https://example.com/other')).toBeDefined(),
    );

    // Assert
    const methods = board.server.calls.map((call) => call.method);
    expect(methods.length).toBeGreaterThan(0);
    expect(new Set(methods)).toEqual(new Set(['getLinks']));
  });

  it('should fetch links placed together in one call', async () => {
    // Arrange
    board = await createTestBoard();

    // Act
    await Promise.all([
      board.pasteUrl('https://example.com/one'),
      board.pasteUrl('https://example.com/two'),
    ]);
    await vi.waitFor(() =>
      expect(linkOf('https://example.com/two')).toBeDefined(),
    );

    // Assert
    expect(board.server.calls).toEqual([
      {
        method: 'getLinks',
        args: [['https://example.com/one', 'https://example.com/two']],
      },
    ]);
  });

  it('should turn pasted plain text into a sticky note', async () => {
    // Arrange
    board = await createTestBoard();

    // Act
    await board.pasteText('Compare these two');

    // Assert
    const shapes = board.editor.getCurrentPageShapes();
    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe('note');
    expect((shapes[0] as TLNoteShape).props.richText).toEqual(
      toRichText('Compare these two'),
    );
  });

  it('should refuse pasted images and files', async () => {
    // Arrange
    board = await createTestBoard();
    const image = new File(['png'], 'photo.png', { type: 'image/png' });
    const pdf = new File(['pdf'], 'paper.pdf', { type: 'application/pdf' });

    // Act
    await board.pasteFiles([image]);
    await board.pasteFiles([pdf]);

    // Assert
    expect(board.editor.getCurrentPageShapes()).toEqual([]);
    expect(board.timesFilesRefused).toBe(2);
  });

  it('should show whether each link is in the library', async () => {
    // Arrange
    const server = new FakeServer();
    server.links.set(
      'https://example.com/saved',
      testLink('https://example.com/saved', { saved: true }),
    );
    board = await createTestBoard({ server });

    // Act
    await board.pasteUrl('https://example.com/saved');
    await board.pasteUrl('https://example.com/unsaved');

    // Assert
    await vi.waitFor(() => {
      expect(linkOf('https://example.com/saved')?.saved).toBe(true);
      expect(linkOf('https://example.com/unsaved')?.saved).toBe(false);
    });
  });

  it('should show a save made elsewhere in the webapp', async () => {
    // Arrange
    board = await createTestBoard();
    await board.pasteUrl('https://example.com/article');
    await vi.waitFor(() =>
      expect(linkOf('https://example.com/article')?.saved).toBe(false),
    );

    // Act
    board.server.links.set(
      'https://example.com/article',
      testLink('https://example.com/article', { saved: true }),
    );
    await board.queryClient.invalidateQueries({ queryKey: cardKeys.all() });

    // Assert
    await vi.waitFor(() =>
      expect(linkOf('https://example.com/article')?.saved).toBe(true),
    );
  });

  it('should size cards by their content and not let them be resized', async () => {
    // Arrange
    const server = new FakeServer();
    const author = { id: 'did:plc:tester', name: 'Tester', handle: 'tester' };
    server.links.set(
      'https://example.com/noted',
      testLink('https://example.com/noted', {
        saved: true,
        note: { id: 'note-1', text: 'Worth a read', author },
      }),
    );
    board = await createTestBoard({ server });

    // Act
    await board.pasteUrl('https://example.com/plain');
    await board.pasteUrl('https://example.com/noted');

    // Assert
    const [plain, noted] = board.linkCards();
    const heightOf = (id: typeof plain.id) =>
      board.editor.getShapePageBounds(id)!.height;
    await vi.waitFor(() =>
      expect(heightOf(noted.id)).toBeGreaterThan(heightOf(plain.id)),
    );
    expect(board.editor.getShapeUtil(noted).canResize(noted)).toBe(false);
  });

  it('should undo a pasted link in one step once its content has sized it', async () => {
    // Arrange
    const server = new FakeServer();
    server.links.set(
      'https://example.com/article',
      testLink('https://example.com/article', {
        metadata: {
          url: 'https://example.com/article',
          title: 'An article',
          description: 'What it says',
        },
      }),
    );
    board = await createTestBoard({ server });
    await board.pasteUrl('https://example.com/article');
    const [card] = board.linkCards();
    const placedHeight = card.props.h;
    await vi.waitFor(() =>
      expect(board.editor.getShape(card.id)!.props).not.toMatchObject({
        h: placedHeight,
      }),
    );

    // Act
    board.editor.undo();

    // Assert
    expect(board.linkCards()).toEqual([]);
  });

  it('should keep a card sized to its content through undo and redo', async () => {
    // Arrange
    board = await createTestBoard();
    await board.pasteUrl('https://example.com/article');
    const [placed] = board.linkCards();
    await vi.waitFor(() =>
      expect(board.editor.getShape(placed.id)!.props).not.toMatchObject({
        h: placed.props.h,
      }),
    );
    const sizedHeight = board.linkCards()[0].props.h;

    // Act
    board.editor.undo();
    board.editor.redo();

    // Assert
    await vi.waitFor(() =>
      expect(board.linkCards()[0].props.h).toBe(sizedHeight),
    );
  });

  it('should ignore pasted text that is only whitespace', async () => {
    // Arrange
    board = await createTestBoard();

    // Act
    await board.pasteText('  \n\t ');

    // Assert
    expect(board.editor.getCurrentPageShapes()).toEqual([]);
  });

  it('should remember links the query cache has since dropped', async () => {
    // Arrange
    const first = await createTestBoard();
    await first.pasteUrl('https://example.com/dropped');
    await vi.waitFor(() =>
      expect(
        first.queryClient.getQueryData(
          canvasKeys.link('https://example.com/dropped'),
        ),
      ).toBeDefined(),
    );
    first.queryClient.removeQueries({
      queryKey: canvasKeys.link('https://example.com/dropped'),
    });
    await first.pasteUrl('https://example.com/kept');
    await vi.waitFor(() =>
      expect(
        first.queryClient.getQueryData(
          canvasKeys.link('https://example.com/kept'),
        ),
      ).toBeDefined(),
    );
    await first.dispose();
    const server = new FakeServer();
    const respond = server.holdResponses();

    // Act
    board = await createTestBoard({
      storage: first.storage,
      canvasId: first.canvasId,
      server,
    });

    // Assert
    expect(linkOf('https://example.com/dropped')).toBeDefined();
    expect(linkOf('https://example.com/kept')).toBeDefined();
    respond();
  });

  it('should show a reopened board from what it last knew before any fetch returns', async () => {
    // Arrange
    const first = await createTestBoard();
    first.server.links.set(
      'https://example.com/article',
      testLink('https://example.com/article', { saved: true }),
    );
    await first.pasteUrl('https://example.com/article');
    await vi.waitFor(() =>
      expect(
        first.queryClient.getQueryData(
          canvasKeys.link('https://example.com/article'),
        ),
      ).toBeDefined(),
    );
    await first.dispose();
    const server = new FakeServer();
    const respond = server.holdResponses();

    // Act
    board = await createTestBoard({
      storage: first.storage,
      canvasId: first.canvasId,
      server,
    });

    // Assert
    expect(linkOf('https://example.com/article')).toMatchObject({
      saved: true,
      metadata: { title: 'Title of https://example.com/article' },
    });
    respond();
  });
});

describe('quick-add', () => {
  it('should place a link picked in quick-add where the canvas was double-clicked', async () => {
    // Arrange
    board = await createTestBoard();
    board.doubleClick([300, 200]);

    // Act
    board.quickAdd.place('https://example.com/article');

    // Assert
    const [card] = board.linkCards();
    expect(card.props.url).toBe('https://example.com/article');
    const center = board.editor.getShapePageBounds(card)!.center;
    expect(center.x).toBeCloseTo(300);
    expect(center.y).toBeCloseTo(200);
    expect(board.quickAdd.placeAt.get()).toBeNull();
  });

  it('should place a link picked in quick-add opened with / at the centre of the view', async () => {
    // Arrange
    board = await createTestBoard();
    board.editor.setCamera({ x: -400, y: 250, z: 1 });
    board.quickAdd.open();

    // Act
    board.quickAdd.place('  https://example.com ');

    // Assert
    const [card] = board.linkCards();
    expect(card.props.url).toBe('https://example.com/');
    const center = board.editor.getShapePageBounds(card)!.center;
    const viewCenter = board.editor.getViewportPageBounds().center;
    expect(center.x).toBeCloseTo(viewCenter.x);
    expect(center.y).toBeCloseTo(viewCenter.y);
  });

  it('should not open quick-add on a double-click on a shape', async () => {
    // Arrange
    board = await createTestBoard();
    await board.dropUrl('https://example.com/article', { x: 300, y: 200 });

    // Act
    board.doubleClick([300, 200]);

    // Assert
    expect(board.quickAdd.placeAt.get()).toBeNull();
    expect(board.editor.getCurrentPageShapes()).toHaveLength(1);
  });

  it('should place nothing when quick-add is closed', async () => {
    // Arrange
    board = await createTestBoard();
    board.doubleClick([300, 200]);

    // Act
    board.quickAdd.close();
    board.quickAdd.place('https://example.com/article');

    // Assert
    expect(board.quickAdd.placeAt.get()).toBeNull();
    expect(board.editor.getCurrentPageShapes()).toHaveLength(0);
  });

  it('should leave quick-add open on text that is not a link', async () => {
    // Arrange
    board = await createTestBoard();
    board.quickAdd.open();

    // Act
    board.quickAdd.place('climate reading');

    // Assert
    expect(board.quickAdd.placeAt.get()).not.toBeNull();
    expect(board.editor.getCurrentPageShapes()).toHaveLength(0);
  });

  it('should not open quick-add in a read-only tab', async () => {
    // Arrange
    board = await createTestBoard();
    otherTab = await board.openInAnotherTab();

    // Act
    otherTab.doubleClick([300, 200]);
    otherTab.quickAdd.open();

    // Assert
    expect(otherTab.quickAdd.placeAt.get()).toBeNull();
    expect(otherTab.editor.getCurrentPageShapes()).toHaveLength(0);
  });
});
