import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusManager } from '@tanstack/react-query';
import {
  DefaultColorStyle,
  DefaultDashStyle,
  createShapeId,
  toRichText,
  type TLArrowShape,
  type TLNoteShape,
  type TLShapeId,
} from 'tldraw';
import { CONNECTION_TYPE_MENU } from '@/features/canvas/controller/connectionEdits';
import { announceLinkChange } from '@/features/canvas/lib/linkChanges';
import { canvasKeys } from '@/features/canvas/lib/canvasKeys';
import { cardKeys } from '@/features/cards/lib/cardKeys';
import {
  linkSearchQuery,
  type LinkConnection,
  type LinkInfo,
} from '@/features/canvas/server/canvasServer';
import type { LinkCardShape } from '@/features/canvas/shapes/linkCard/LinkCardShapeUtil';
import { linkCardPreview } from '@/features/canvas/model/linkCards';
import type {
  CanvasDocument,
  CanvasStorage,
} from '@/features/canvas/storage/canvasStorage';
import { createTestBoard, type TestBoard } from '../harness/createTestBoard';
import { FakeServer, testLink, testPost } from '../harness/fakeServer';

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

// ─────────────────────────────────────────────
// Link previews
// ─────────────────────────────────────────────
describe('link previews', () => {
  const linkOf = (url: string) =>
    board.queryClient.getQueryData<LinkInfo>(canvasKeys.link(url));
  const THUMBNAIL = 'https://img.example.com/thumb.jpg';

  // Pastes the link and waits for its card to be sized to it
  async function placedHeight(url: string) {
    await board.pasteUrl(url);
    await vi.waitFor(() =>
      expect(
        board.queryClient.getQueryData(canvasKeys.link(url)),
      ).toBeDefined(),
    );
    const card = board.linkCards().find((card) => card.props.url === url)!;
    return board.editor.getShape<LinkCardShape>(card.id)!.props.h;
  }

  it('should show a YouTube video thumbnail at 16:9 across a taller card', async () => {
    // Arrange
    const server = new FakeServer();
    const video = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const article = 'https://example.com/article';
    for (const url of [video, article]) {
      server.links.set(
        url,
        testLink(url, {
          metadata: { url, title: 'A title', imageUrl: THUMBNAIL },
        }),
      );
    }
    board = await createTestBoard({ server });

    // Act
    const videoHeight = await placedHeight(video);
    const articleHeight = await placedHeight(article);

    // Assert
    expect(linkCardPreview(linkOf(video))).toEqual({
      kind: 'video',
      imageUrl: THUMBNAIL,
    });
    // A 189px thumbnail, its margin and the domain and title lines, against
    // the plain card's 75px image
    expect(videoHeight - articleHeight).toBe(171);
  });

  it('should fit a title to the lines it wraps to, up to two', async () => {
    // Arrange
    const server = new FakeServer();
    const titled = (path: string, title: string) => {
      const url = `https://example.com/${path}`;
      server.links.set(url, testLink(url, { metadata: { url, title } }));
      return url;
    };
    const short = titled('short', 'Short');
    const long = titled('long', 'A long title '.repeat(20));
    board = await createTestBoard({ server });

    // Act
    const shortHeight = await placedHeight(short);
    const longHeight = await placedHeight(long);

    // Assert
    expect(longHeight - shortHeight).toBe(25);
  });

  it.each([
    ['https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC', 'Spotify'],
    ['https://soundcloud.com/an-artist/a-track', 'SoundCloud'],
    ['https://an-artist.bandcamp.com/album/an-album', 'Bandcamp'],
    ['https://plyr.fm/track/42', 'plyr.fm'],
  ])(
    'should show the artwork of %s as a square with its platform label',
    async (url, label) => {
      // Arrange
      const server = new FakeServer();
      const article = 'https://example.com/article';
      for (const each of [url, article]) {
        server.links.set(
          each,
          testLink(each, {
            metadata: { url: each, title: 'A title', imageUrl: THUMBNAIL },
          }),
        );
      }
      board = await createTestBoard({ server });

      // Act
      const audioHeight = await placedHeight(url);
      const articleHeight = await placedHeight(article);

      // Assert
      expect(linkCardPreview(linkOf(url))).toEqual({
        kind: 'audio',
        imageUrl: THUMBNAIL,
        label,
      });
      // Larger than the plain card's 75px image
      expect(audioHeight).toBeGreaterThan(articleHeight);
    },
  );

  describe('Bluesky posts', () => {
    const POST = 'https://bsky.app/profile/poster.bsky.social/post/3kpost';
    const IMAGE = 'https://cdn.bsky.app/img/feed_thumbnail/plain/a@jpeg';
    const imagesEmbed = {
      $type: 'app.bsky.embed.images#view',
      images: [
        { thumb: IMAGE, fullsize: IMAGE, alt: 'A cat' },
        { thumb: 'https://cdn.bsky.app/second', fullsize: '', alt: '' },
      ],
    };

    it("should show a post's author, text and every image", async () => {
      // Arrange
      const server = new FakeServer();
      server.links.set(
        POST,
        testLink(POST, { post: testPost({ embed: imagesEmbed }) }),
      );
      board = await createTestBoard({ server });

      // Act
      await placedHeight(POST);

      // Assert
      expect(linkCardPreview(linkOf(POST))).toEqual({
        kind: 'post',
        author: {
          name: 'A Poster',
          avatarUrl:
            'https://cdn.bsky.app/img/avatar/plain/did:plc:poster/a@jpeg',
        },
        text: 'What the post says',
        media: {
          kind: 'images',
          images: [
            { url: IMAGE, alt: 'A cat' },
            { url: 'https://cdn.bsky.app/second', alt: '' },
          ],
          // Cropped to 16:9 across the card's 336px inner width
          height: 189,
        },
        quote: null,
        mediaHiddenBecause: null,
      });
    });

    it("should size a post's only image by its own ratio, no taller than 16:9", async () => {
      // Arrange
      const server = new FakeServer();
      const single = (width: number, height: number) => ({
        $type: 'app.bsky.embed.images#view',
        images: [
          {
            thumb: IMAGE,
            fullsize: IMAGE,
            alt: '',
            aspectRatio: { width, height },
          },
        ],
      });
      const wide = 'https://bsky.app/profile/poster.bsky.social/post/3kwide';
      const tall = 'https://bsky.app/profile/poster.bsky.social/post/3ktall';
      server.links.set(
        wide,
        testLink(wide, { post: testPost({ embed: single(3, 1) }) }),
      );
      server.links.set(
        tall,
        testLink(tall, { post: testPost({ embed: single(1, 2) }) }),
      );
      board = await createTestBoard({ server });

      // Act
      await placedHeight(wide);
      await placedHeight(tall);

      // Assert
      expect(linkCardPreview(linkOf(wide))).toMatchObject({
        media: { height: 112 },
      });
      expect(linkCardPreview(linkOf(tall))).toMatchObject({
        media: { height: 189 },
      });
    });

    it("should fit a post's text to the lines it wraps to, up to three", async () => {
      // Arrange
      const server = new FakeServer();
      const post = (slug: string, text: string) => {
        const url = `https://bsky.app/profile/poster.bsky.social/post/${slug}`;
        server.links.set(url, testLink(url, { post: testPost({ text }) }));
        return url;
      };
      const short = post('3kshort', 'OUT NOW');
      const twoParagraphs = post('3kbreak', 'OUT NOW\n\nOn every platform');
      const long = post('3klong', 'word '.repeat(200));
      board = await createTestBoard({ server });

      // Act
      const shortHeight = await placedHeight(short);
      const breakHeight = await placedHeight(twoParagraphs);
      const longHeight = await placedHeight(long);

      // Assert
      // The blank line between paragraphs counts, at 25px a line
      expect(breakHeight - shortHeight).toBe(50);
      expect(longHeight - shortHeight).toBe(50);
    });

    it('should make a post with an image taller than one without', async () => {
      // Arrange
      const server = new FakeServer();
      const withImage = POST;
      const withoutImage =
        'https://bsky.app/profile/poster.bsky.social/post/3ktext';
      server.links.set(
        withImage,
        testLink(withImage, { post: testPost({ embed: imagesEmbed }) }),
      );
      server.links.set(
        withoutImage,
        testLink(withoutImage, { post: testPost() }),
      );
      board = await createTestBoard({ server });

      // Act
      const imageHeight = await placedHeight(withImage);
      const textHeight = await placedHeight(withoutImage);

      // Assert
      expect(imageHeight).toBeGreaterThan(textHeight);
    });

    it("should show a link in a post as the webapp's compact link card, with or without a thumbnail", async () => {
      // Arrange
      const server = new FakeServer();
      const external = (thumb?: string) => ({
        $type: 'app.bsky.embed.external#view',
        external: {
          uri: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
          title: 'A song',
          description: 'By an artist',
          thumb,
        },
      });
      const withThumb = POST;
      const withoutThumb =
        'https://bsky.app/profile/poster.bsky.social/post/3knothumb';
      server.links.set(
        withThumb,
        testLink(withThumb, { post: testPost({ embed: external(IMAGE) }) }),
      );
      server.links.set(
        withoutThumb,
        testLink(withoutThumb, { post: testPost({ embed: external() }) }),
      );
      board = await createTestBoard({ server });

      // Act
      const thumbHeight = await placedHeight(withThumb);
      const noThumbHeight = await placedHeight(withoutThumb);

      // Assert
      expect(linkCardPreview(linkOf(withThumb))).toMatchObject({
        media: {
          kind: 'link',
          url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
          title: 'A song',
          thumbUrl: IMAGE,
          height: 72,
        },
      });
      expect(linkCardPreview(linkOf(withoutThumb))).toMatchObject({
        media: { kind: 'link', thumbUrl: null },
      });
      expect(noThumbHeight).toBe(thumbHeight);
    });

    it('should show a quoted post as a card under the media the quote adds', async () => {
      // Arrange
      const server = new FakeServer();
      const quoted = {
        $type: 'app.bsky.embed.record#viewRecord',
        uri: 'at://did:plc:quoted/app.bsky.feed.post/3kquoted',
        cid: 'bafyquoted',
        author: {
          did: 'did:plc:quoted',
          handle: 'quoted.bsky.social',
          avatar: 'https://cdn.bsky.app/img/avatar/plain/did:plc:quoted/b@jpeg',
        },
        value: {
          $type: 'app.bsky.feed.post',
          text: 'The quoted words',
          createdAt: '2026-09-01T00:00:00.000Z',
        },
        indexedAt: '2026-09-01T00:00:00.000Z',
      };
      const quote = POST;
      const quoteWithMedia =
        'https://bsky.app/profile/poster.bsky.social/post/3kquotemedia';
      server.links.set(
        quote,
        testLink(quote, {
          post: testPost({
            embed: { $type: 'app.bsky.embed.record#view', record: quoted },
          }),
        }),
      );
      server.links.set(
        quoteWithMedia,
        testLink(quoteWithMedia, {
          post: testPost({
            embed: {
              $type: 'app.bsky.embed.recordWithMedia#view',
              record: { record: quoted },
              media: imagesEmbed,
            },
          }),
        }),
      );
      board = await createTestBoard({ server });

      // Act
      const quoteHeight = await placedHeight(quote);
      const withMediaHeight = await placedHeight(quoteWithMedia);

      // Assert
      const quotedCard = {
        author: {
          name: 'quoted.bsky.social',
          avatarUrl:
            'https://cdn.bsky.app/img/avatar/plain/did:plc:quoted/b@jpeg',
        },
        text: 'The quoted words',
      };
      expect(linkCardPreview(linkOf(quote))).toMatchObject({
        media: null,
        quote: quotedCard,
      });
      expect(linkCardPreview(linkOf(quoteWithMedia))).toMatchObject({
        media: { kind: 'images' },
        quote: quotedCard,
      });
      // The 189px grid and the gap above it
      expect(withMediaHeight - quoteHeight).toBe(199);
    });

    describe('labelled media', () => {
      const LABEL = {
        src: 'did:plc:ar7c4by46qjdydhdevvrndac',
        uri: 'at://did:plc:poster/app.bsky.feed.post/3kpost',
        val: 'porn',
        cts: '2026-10-01T00:00:00.000Z',
      };
      const labelledPost = () =>
        testLink(POST, {
          post: testPost({ embed: imagesEmbed, labels: [LABEL] }),
        });

      it("should hide a labelled post's media behind the webapp's notice, keeping its text and the card's height", async () => {
        // Arrange
        const server = new FakeServer();
        const unlabelled =
          'https://bsky.app/profile/poster.bsky.social/post/3kplain';
        server.links.set(POST, labelledPost());
        server.links.set(
          unlabelled,
          testLink(unlabelled, { post: testPost({ embed: imagesEmbed }) }),
        );
        board = await createTestBoard({ server });

        // Act
        const labelledHeight = await placedHeight(POST);
        const unlabelledHeight = await placedHeight(unlabelled);

        // Assert
        expect(linkCardPreview(linkOf(POST))).toMatchObject({
          kind: 'post',
          text: 'What the post says',
          mediaHiddenBecause: 'Adult content',
        });
        expect(labelledHeight).toBe(unlabelledHeight);
      });

      it('should hide nothing on a labelled post with no media', async () => {
        // Arrange
        const server = new FakeServer();
        server.links.set(
          POST,
          testLink(POST, { post: testPost({ labels: [LABEL] }) }),
        );
        board = await createTestBoard({ server });

        // Act
        await placedHeight(POST);

        // Assert
        expect(linkCardPreview(linkOf(POST))).toMatchObject({
          mediaHiddenBecause: null,
        });
      });

      it("should show one copy's media, and hide it again, without changing the board", async () => {
        // Arrange
        const server = new FakeServer();
        server.links.set(POST, labelledPost());
        board = await createTestBoard({ server });
        await placedHeight(POST);
        await board.pasteUrl(POST);
        const [shown, other] = board.linkCards();
        const before = board.editor.store.getStoreSnapshot('document');

        // Act
        board.mediaReveals.toggle(shown.id);

        // Assert
        expect(board.mediaReveals.isRevealed(shown.id)).toBe(true);
        expect(board.mediaReveals.isRevealed(other.id)).toBe(false);
        expect(board.editor.store.getStoreSnapshot('document')).toEqual(before);
        board.mediaReveals.toggle(shown.id);
        expect(board.mediaReveals.isRevealed(shown.id)).toBe(false);
      });

      it('should hide shown media again when the board is reopened', async () => {
        // Arrange
        const first = await createTestBoard();
        first.server.links.set(POST, labelledPost());
        board = first;
        await placedHeight(POST);
        const [card] = first.linkCards();
        first.mediaReveals.toggle(card.id);
        await first.dispose();

        // Act
        board = await createTestBoard({
          storage: first.storage,
          canvasId: first.canvasId,
        });

        // Assert
        expect(board.mediaReveals.isRevealed(card.id)).toBe(false);
      });
    });

    it('should show a post that could not be loaded as a plain link', async () => {
      // Arrange
      const server = new FakeServer();
      server.links.set(POST, testLink(POST, { post: null }));
      board = await createTestBoard({ server });

      // Act
      await placedHeight(POST);

      // Assert
      expect(linkCardPreview(linkOf(POST))).toEqual({ kind: 'plain' });
    });

    it('should show a reopened board its post previews before any fetch returns', async () => {
      // Arrange
      const first = await createTestBoard();
      first.server.links.set(
        POST,
        testLink(POST, { post: testPost({ embed: imagesEmbed }) }),
      );
      board = first;
      const height = await placedHeight(POST);
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
      expect(linkCardPreview(linkOf(POST))).toMatchObject({
        kind: 'post',
        media: { images: [{ url: IMAGE }, {}] },
      });
      expect(board.linkCards()[0].props.h).toBe(height);
      respond();
    });
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
    board.runAction('quick-add');

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
    board.runAction('quick-add');

    // Act
    board.quickAdd.place('climate reading');

    // Assert
    expect(board.quickAdd.placeAt.get()).not.toBeNull();
    expect(board.editor.getCurrentPageShapes()).toHaveLength(0);
  });

  it('should place a link found in the library', async () => {
    // Arrange
    board = await createTestBoard();
    board.server.library = [
      { url: 'https://example.com/climate', title: 'Climate reading' },
    ];
    board.runAction('quick-add');

    // Act
    const [result] = await board.queryClient.fetchQuery(
      linkSearchQuery(board.server, 'mine', 'climate'),
    );
    board.quickAdd.place(result.url);

    // Assert
    expect(board.linkCards().map((card) => card.props.url)).toEqual([
      'https://example.com/climate',
    ]);
    expect(board.server.calls).toContainEqual({
      method: 'searchLibrary',
      args: ['climate'],
    });
  });

  it('should place a link found across Semble that is not in the library', async () => {
    // Arrange
    board = await createTestBoard();
    board.server.everyone = [
      { url: 'https://example.com/climate', title: 'Climate reading' },
    ];
    board.runAction('quick-add');

    // Act
    const mine = await board.queryClient.fetchQuery(
      linkSearchQuery(board.server, 'mine', 'climate'),
    );
    const [result] = await board.queryClient.fetchQuery(
      linkSearchQuery(board.server, 'everyone', 'climate'),
    );
    board.quickAdd.place(result.url);

    // Assert
    expect(mine).toEqual([]);
    expect(board.linkCards().map((card) => card.props.url)).toEqual([
      'https://example.com/climate',
    ]);
    expect(board.server.calls).toContainEqual({
      method: 'searchEveryone',
      args: ['climate'],
    });
  });

  it('should list nothing from Semble until there is a query', async () => {
    // Arrange
    board = await createTestBoard();
    board.server.everyone = [
      { url: 'https://example.com/climate', title: 'Climate reading' },
    ];

    // Act
    const results = await board.queryClient.fetchQuery(
      linkSearchQuery(board.server, 'everyone', ''),
    );

    // Assert
    expect(results).toEqual([]);
    expect(board.server.calls.map((call) => call.method)).not.toContain(
      'searchEveryone',
    );
  });

  it('should start on the library and keep the scope picked while the board is open', async () => {
    // Arrange
    board = await createTestBoard();
    expect(board.quickAdd.scope.get()).toBe('mine');
    board.runAction('quick-add');
    board.quickAdd.setScope('everyone');

    // Act
    board.quickAdd.close();
    board.doubleClick([300, 200]);

    // Assert
    expect(board.quickAdd.placeAt.get()).not.toBeNull();
    expect(board.quickAdd.scope.get()).toBe('everyone');
  });

  it('should not open quick-add in a read-only tab', async () => {
    // Arrange
    board = await createTestBoard();
    otherTab = await board.openInAnotherTab();

    // Act
    otherTab.doubleClick([300, 200]);
    otherTab.runAction('quick-add');

    // Assert
    expect(otherTab.quickAdd.placeAt.get()).toBeNull();
    expect(otherTab.editor.getCurrentPageShapes()).toHaveLength(0);
  });
});

describe('open in canvas from a link', () => {
  const A = 'https://example.com/a';
  const B = 'https://example.com/b';
  const C = 'https://example.com/c';
  const D = 'https://example.com/d';
  // Long enough for a fetch to reach the fake server and its answer to land
  const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
  const connection = (
    id: string,
    sourceUrl: string,
    targetUrl: string,
  ): LinkConnection => ({
    id,
    type: 'RELATED',
    sourceUrl,
    targetUrl,
    curatorId: 'did:plc:someone',
  });
  const centreOf = (card: LinkCardShape) =>
    board.editor.getShapePageBounds(card)!.center;
  const cardOf = (url: string) =>
    board.linkCards().find((card) => card.props.url === url)!;

  it('should place the link in the middle with the links it is connected to in a ring around it', async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [
      connection('c1', A, B),
      connection('c2', C, A),
      connection('c3', A, D),
      connection('c4', B, C),
    ];

    // Act
    board = await createTestBoard({ server, seedUrl: A });

    // Assert
    await vi.waitFor(() =>
      expect(
        board
          .linkCards()
          .map((card) => card.props.url)
          .sort(),
      ).toEqual([A, B, C, D]),
    );
    const middle = centreOf(cardOf(A));
    const distances = [B, C, D].map((url) =>
      Math.round(centreOf(cardOf(url)).dist(middle)),
    );
    expect(new Set(distances).size).toBe(1);
    const bounds = board
      .linkCards()
      .map((card) => board.editor.getShapePageBounds(card)!);
    bounds.forEach((one, i) =>
      bounds
        .slice(i + 1)
        .forEach((other) => expect(one.collides(other)).toBe(false)),
    );
    const view = board.editor.getViewportPageBounds();
    expect(bounds.every((card) => view.contains(card))).toBe(true);
  });

  it('should keep tall cards in the ring from touching', async () => {
    // Arrange
    const server = new FakeServer();
    const image = 'https://cdn.bsky.app/img/feed_thumbnail/plain/a@jpeg';
    const author = { id: 'did:plc:tester', name: 'Tester', handle: 'tester' };
    // A post with text, images, a quote and a note: the tallest a card gets
    const tallLink = (url: string) =>
      testLink(url, {
        note: { id: `note-${url}`, text: 'Worth a read', author },
        post: testPost({
          text: 'Long enough to wrap onto every line the card shows. '.repeat(
            4,
          ),
          embed: {
            $type: 'app.bsky.embed.recordWithMedia#view',
            record: {
              record: {
                $type: 'app.bsky.embed.record#viewRecord',
                uri: 'at://did:plc:quoted/app.bsky.feed.post/3kquoted',
                cid: 'bafyquoted',
                author: { did: 'did:plc:quoted', handle: 'quoted.bsky.social' },
                value: {
                  $type: 'app.bsky.feed.post',
                  text: 'The quoted words',
                  createdAt: '2026-09-01T00:00:00.000Z',
                },
                indexedAt: '2026-09-01T00:00:00.000Z',
              },
            },
            media: {
              $type: 'app.bsky.embed.images#view',
              images: [{ thumb: image, fullsize: image, alt: '' }],
            },
          },
        }),
      });
    const neighbours = Array.from(
      { length: 12 },
      (_, i) => `https://example.com/n${i}`,
    );
    for (const url of [A, ...neighbours]) server.links.set(url, tallLink(url));
    server.connections = neighbours.map((url, i) =>
      connection(`c${i}`, A, url),
    );

    // Act
    board = await createTestBoard({ server, seedUrl: A });

    // Assert
    await vi.waitFor(() => expect(board.linkCards()).toHaveLength(13));
    const bounds = board
      .linkCards()
      .map((card) => board.editor.getShapePageBounds(card)!);
    expect(Math.min(...bounds.map((card) => card.h))).toBeGreaterThan(560);
    bounds.forEach((one, i) =>
      bounds
        .slice(i + 1)
        .forEach((other) => expect(one.collides(other)).toBe(false)),
    );
  });

  describe('more than one ring', () => {
    const neighbours = Array.from(
      { length: 20 },
      (_, i) => `https://example.com/n${i}`,
    );
    const seededWithTwenty = async () => {
      const server = new FakeServer();
      server.connections = neighbours.map((url, i) =>
        connection(`c${i}`, A, url),
      );
      board = await createTestBoard({ server, seedUrl: A });
      await vi.waitFor(() => expect(board.linkCards()).toHaveLength(13));
    };
    const distanceOf = (url: string) =>
      Math.round(centreOf(cardOf(url)).dist(centreOf(cardOf(A))));

    it('should place the first 12 links and select the link so more can be placed', async () => {
      // Act
      await seededWithTwenty();

      // Assert
      expect(board.linkCards().map((card) => card.props.url)).toEqual(
        expect.arrayContaining([A, ...neighbours.slice(0, 12)]),
      );
      expect(board.popupCard.get()?.id).toBe(cardOf(A).id);
      expect(board.linkSeed.state.get()?.cardId).toBe(cardOf(A).id);
      expect(board.linkSeed.unplaced()).toEqual(neighbours.slice(12));
    });

    it('should not select the link when every connected link is placed', async () => {
      // Arrange
      const server = new FakeServer();
      server.connections = [connection('c1', A, B)];

      // Act
      board = await createTestBoard({ server, seedUrl: A });
      await vi.waitFor(() => expect(board.linkCards()).toHaveLength(2));

      // Assert
      expect(board.editor.getSelectedShapeIds()).toEqual([]);
      expect(board.linkSeed.unplaced()).toEqual([]);
    });

    it('should place the rest in a second ring outside the first, without touching it', async () => {
      // Arrange
      await seededWithTwenty();

      // Act
      await board.linkSeed.placeMore();

      // Assert
      expect(board.linkCards()).toHaveLength(21);
      const [first, ...otherFirst] = neighbours.slice(0, 12).map(distanceOf);
      const [second, ...otherSecond] = neighbours.slice(12).map(distanceOf);
      expect(new Set(otherFirst)).toEqual(new Set([first]));
      expect(new Set(otherSecond)).toEqual(new Set([second]));
      expect(second).toBeGreaterThan(first);
      const bounds = board
        .linkCards()
        .map((card) => board.editor.getShapePageBounds(card)!);
      bounds.forEach((one, i) =>
        bounds
          .slice(i + 1)
          .forEach((other) => expect(one.collides(other)).toBe(false)),
      );
      expect(board.linkSeed.unplaced()).toEqual([]);
    });

    it('should place links connected since in a new ring, even when the outer one has room', async () => {
      // Arrange
      const server = new FakeServer();
      server.connections = neighbours
        .slice(0, 5)
        .map((url, i) => connection(`c${i}`, A, url));
      board = await createTestBoard({ server, seedUrl: A });
      const before = board
        .linkCards()
        .map((card) => ({ id: card.id, x: card.x, y: card.y }));
      server.connections = neighbours
        .slice(0, 10)
        .map((url, i) => connection(`c${i}`, A, url));
      board.timedRefresh();
      await vi.waitFor(() =>
        expect(board.linkSeed.unplaced()).toEqual(neighbours.slice(5, 10)),
      );

      // Act
      await board.linkSeed.placeMore();

      // Assert
      expect(board.linkCards()).toHaveLength(11);
      expect(
        board
          .linkCards()
          .slice(0, 6)
          .map((card) => ({ id: card.id, x: card.x, y: card.y })),
      ).toEqual(before);
      const [first] = neighbours.slice(0, 5).map(distanceOf);
      const [second, ...others] = neighbours.slice(5, 10).map(distanceOf);
      expect(new Set(others)).toEqual(new Set([second]));
      expect(second).toBeGreaterThan(first);
    });

    it('should take back a ring placed with one undo', async () => {
      // Arrange
      await seededWithTwenty();
      await board.linkSeed.placeMore();

      // Act
      board.editor.undo();

      // Assert
      expect(board.linkCards()).toHaveLength(13);
      expect(board.linkSeed.unplaced()).toEqual(neighbours.slice(12));
    });

    it('should not place again a link deleted from a ring or one already on the board', async () => {
      // Arrange
      await seededWithTwenty();
      board.editor.deleteShape(cardOf(neighbours[0]).id);
      await board.pasteUrl(neighbours[12]);

      // Act
      await board.linkSeed.placeMore();

      // Assert
      const urls = board.linkCards().map((card) => card.props.url);
      expect(urls).not.toContain(neighbours[0]);
      expect(urls.filter((url) => url === neighbours[12])).toHaveLength(1);
      expect(urls).toHaveLength(20);
    });

    it('should offer more only on the card the board was opened from, not its copies', async () => {
      // Arrange
      await seededWithTwenty();
      const middle = cardOf(A).id;

      // Act
      board.runAction('duplicate');

      // Assert
      expect(board.editor.getOnlySelectedShape()?.id).not.toBe(middle);
      expect(board.linkSeed.state.get()?.cardId).toBe(middle);
    });
  });

  it('should finish loading only once the links are placed', async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [connection('c1', A, B)];
    const respond = server.holdResponses();
    let opened = false;

    // Act
    const opening = createTestBoard({ server, seedUrl: A }).then((board) => {
      opened = true;
      return board;
    });
    await vi.waitFor(() => expect(server.calls).toHaveLength(1));
    const openedBeforeResponse = opened;
    respond();
    board = await opening;

    // Assert
    expect(openedBeforeResponse).toBe(false);
    expect(board.linkCards()).toHaveLength(2);
  });

  it('should say what it is loading until the links are placed', async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [connection('c1', A, B), connection('c2', C, A)];
    const respondWithLink = server.holdResponses();
    const opening = createTestBoard({ server, seedUrl: A });
    await vi.waitFor(() => expect(server.calls).toHaveLength(1));

    // Act
    const respondWithRing = server.holdResponses();
    respondWithLink();
    await vi.waitFor(() => expect(server.calls).toHaveLength(2));
    respondWithRing();
    board = await opening;

    // Assert
    expect(board.seedProgress).toEqual([
      { step: 'link', url: A },
      { step: 'ring', count: 2 },
      null,
    ]);
  });

  it('should say nothing more once a link with no connections is loaded', async () => {
    // Act
    board = await createTestBoard({ seedUrl: A });

    // Assert
    expect(board.seedProgress).toEqual([{ step: 'link', url: A }, null]);
  });

  it('should show the arrows of the connections between the links it placed', async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [
      connection('c1', A, B),
      connection('c2', C, A),
      connection('c3', B, C),
    ];

    // Act
    board = await createTestBoard({ server, seedUrl: A });

    // Assert
    await vi.waitFor(() =>
      expect(
        board
          .arrows()
          .map((arrow) => arrow.connectionId)
          .sort(),
      ).toEqual(['c1', 'c2', 'c3']),
    );
    expect(board.arrows()).toContainEqual(
      expect.objectContaining({
        connectionId: 'c2',
        from: cardOf(C).id,
        to: cardOf(A).id,
      }),
    );
  });

  it('should open a link with no connections on its own', async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [connection('c1', B, C)];

    // Act
    board = await createTestBoard({ server, seedUrl: A });

    // Assert
    await vi.waitFor(() =>
      expect(server.calls.map((call) => call.method)).toContain('getLinks'),
    );
    await settle();
    expect(board.linkCards().map((card) => card.props.url)).toEqual([A]);
  });

  it("should place nothing and say so when the link's connections can't be loaded, so reloading tries again", async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [connection('c1', A, B)];
    server.connectionsFailing = true;

    // Act
    const first = await createTestBoard({ server, seedUrl: A });
    await vi.waitFor(() => expect(first.serverErrors).toHaveLength(1));
    const placedFirst = first.linkCards().length;
    await first.dispose();
    server.connectionsFailing = false;
    board = await createTestBoard({
      server,
      storage: first.storage,
      canvasId: first.canvasId,
      seedUrl: A,
    });

    // Assert
    expect(placedFirst).toBe(0);
    await vi.waitFor(() => expect(board.linkCards()).toHaveLength(2));
  });

  it('should keep a name given to the board while its links load', async () => {
    // Arrange
    const server = new FakeServer();
    const other = await createTestBoard();
    await other.dispose();
    const { storage } = other;
    const canvasId = crypto.randomUUID();
    const respond = server.holdResponses();
    const opening = createTestBoard({ server, storage, canvasId, seedUrl: A });
    await vi.waitFor(() => expect(server.calls).toHaveLength(1));

    // Act
    await storage.renameCanvas(canvasId, 'My reading');
    respond();
    board = await opening;
    await settle();

    // Assert
    expect(board.linkCards()).toHaveLength(1);
    expect(await storage.getCanvas(canvasId)).toMatchObject({
      name: 'My reading',
    });
  });

  it('should name the board after the link', async () => {
    // Arrange
    const server = new FakeServer();
    server.links.set(
      A,
      testLink(A, { metadata: { url: A, title: 'A page worth reading' } }),
    );

    // Act
    board = await createTestBoard({ server, seedUrl: A });

    // Assert
    await vi.waitFor(async () =>
      expect(await board.storage.getCanvas(board.canvasId)).toMatchObject({
        name: 'A page worth reading',
      }),
    );
  });

  it('should not place the links again when the board is reopened', async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [connection('c1', A, B)];
    const first = await createTestBoard({ server, seedUrl: A });
    await vi.waitFor(() => expect(first.linkCards()).toHaveLength(2));
    const placedB = first.linkCards().find((card) => card.props.url === B)!;
    first.editor.deleteShape(placedB.id);
    await first.dispose();

    // Act
    board = await createTestBoard({
      server,
      storage: first.storage,
      canvasId: first.canvasId,
      seedUrl: A,
    });
    await settle();

    // Assert
    expect(board.linkCards().map((card) => card.props.url)).toEqual([A]);
  });

  it('should not let undo take back the links it placed', async () => {
    // Arrange
    board = await createTestBoard({ seedUrl: A });
    await vi.waitFor(() => expect(board.linkCards()).toHaveLength(1));

    // Act
    board.editor.undo();

    // Assert
    expect(board.linkCards()).toHaveLength(1);
  });
});

describe('copies', () => {
  it('should make a copy when a link already on the board is added again', async () => {
    // Arrange
    board = await createTestBoard();
    await board.dropUrl('https://example.com/article', { x: 0, y: 0 });

    // Act
    await board.dropUrl('https://example.com/article', { x: 600, y: 0 });

    // Assert
    const copies = board.linkCards();
    expect(copies).toHaveLength(2);
    expect(copies.map((copy) => board.copies.count(copy.props.url))).toEqual([
      2, 2,
    ]);
  });

  it('should make a copy of the selected card on Cmd+D', async () => {
    // Arrange
    board = await createTestBoard();
    await board.dropUrl('https://example.com/article', { x: 0, y: 0 });
    board.editor.select(board.linkCards()[0].id);

    // Act
    board.runAction('duplicate');

    // Assert
    expect(board.linkCards()).toHaveLength(2);
    expect(board.copies.count('https://example.com/article')).toBe(2);
  });

  it('should make a copy when a card is Option-dragged, leaving the card where it was', async () => {
    // Arrange
    board = await createTestBoard();
    await board.dropUrl('https://example.com/article', { x: 300, y: 200 });
    const [card] = board.linkCards();

    // Act
    board.drag([300, 200], [300, 600], { altKey: true });

    // Assert
    expect(board.editor.getShape(card.id)).toMatchObject({
      x: card.x,
      y: card.y,
    });
    const copy = board.linkCards().find((shape) => shape.id !== card.id)!;
    expect(copy).toMatchObject({ x: card.x, y: card.y + 400 });
    expect(board.copies.count('https://example.com/article')).toBe(2);
  });

  it('should count the copies left once one is deleted', async () => {
    // Arrange
    board = await createTestBoard();
    for (const x of [0, 600, 1200]) {
      await board.dropUrl('https://example.com/article', { x, y: 0 });
    }
    expect(board.copies.count('https://example.com/article')).toBe(3);

    // Act
    board.editor.deleteShape(board.linkCards()[0].id);

    // Assert
    expect(board.copies.count('https://example.com/article')).toBe(2);
  });

  it('should outline the other copies of a hovered card', async () => {
    // Arrange
    board = await createTestBoard();
    await board.dropUrl('https://example.com/article', { x: 0, y: 0 });
    await board.dropUrl('https://example.com/article', { x: 600, y: 0 });
    await board.dropUrl('https://example.com/other', { x: 1200, y: 0 });
    const [hovered, sibling, other] = board.linkCards();

    // Act
    board.hover([0, 0]);

    // Assert
    await vi.waitFor(() =>
      expect(board.copies.isOutlined(sibling.id)).toBe(true),
    );
    expect(board.copies.isOutlined(hovered.id)).toBe(false);
    expect(board.copies.isOutlined(other.id)).toBe(false);
  });

  it('should stop outlining copies once the pointer leaves the card', async () => {
    // Arrange
    board = await createTestBoard();
    await board.dropUrl('https://example.com/article', { x: 0, y: 0 });
    await board.dropUrl('https://example.com/article', { x: 600, y: 0 });
    const [, sibling] = board.linkCards();
    board.hover([0, 0]);
    await vi.waitFor(() =>
      expect(board.copies.isOutlined(sibling.id)).toBe(true),
    );

    // Act
    board.hover([0, 600]);

    // Assert
    await vi.waitFor(() =>
      expect(board.copies.isOutlined(sibling.id)).toBe(false),
    );
  });

  it('should move one copy without moving the others', async () => {
    // Arrange
    board = await createTestBoard();
    await board.dropUrl('https://example.com/article', { x: 300, y: 200 });
    await board.dropUrl('https://example.com/article', { x: 900, y: 200 });
    const [moved, other] = board.linkCards();

    // Act
    board.drag([300, 200], [300, 600]);

    // Assert
    expect(board.editor.getShape(moved.id)).toMatchObject({ y: moved.y + 400 });
    expect(board.editor.getShape(other.id)).toEqual(other);
  });

  it('should fetch a link once for all its copies', async () => {
    // Arrange
    board = await createTestBoard();
    await board.dropUrl('https://example.com/article', { x: 0, y: 0 });
    await vi.waitFor(() => expect(board.server.calls).toHaveLength(1));
    board.editor.select(board.linkCards()[0].id);

    // Act
    board.runAction('duplicate');
    await board.dropUrl('https://example.com/article', { x: 600, y: 0 });

    // Assert
    expect(board.linkCards()).toHaveLength(3);
    expect(board.server.calls).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────
// selection popup
// ─────────────────────────────────────────────

describe('selection popup', () => {
  it('should show the popup for one selected card', async () => {
    // Arrange
    board = await createTestBoard();
    await board.dropUrl('https://example.com/article', { x: 0, y: 0 });
    const [card] = board.linkCards();

    // Act
    board.editor.select(card.id);

    // Assert
    expect(board.popupCard.get()?.url).toBe('https://example.com/article');
  });

  it('should show no popup when several cards are selected', async () => {
    // Arrange
    board = await createTestBoard();
    await board.dropUrl('https://example.com/article', { x: 0, y: 0 });
    await board.dropUrl('https://example.com/other', { x: 600, y: 0 });

    // Act
    board.editor.select(...board.linkCards().map((card) => card.id));

    // Assert
    expect(board.popupCard.get()).toBeNull();
  });

  it('should show no popup for a selected sticky note', async () => {
    // Arrange
    board = await createTestBoard();
    await board.pasteText('a thought');
    const [note] = board.editor.getCurrentPageShapes();

    // Act
    board.editor.select(note.id);

    // Assert
    expect(board.popupCard.get()).toBeNull();
  });

  it('should hide the popup while a menu is open', async () => {
    // Arrange
    board = await createTestBoard();
    await board.dropUrl('https://example.com/article', { x: 0, y: 0 });
    board.editor.select(board.linkCards()[0].id);

    // Act
    board.editor.menus.addOpenMenu('context menu');

    // Assert
    expect(board.popupCard.get()).toBeNull();
  });

  it('should hide the popup while the card is dragged', async () => {
    // Arrange
    board = await createTestBoard();
    await board.dropUrl('https://example.com/article', { x: 300, y: 200 });
    board.editor.select(board.linkCards()[0].id);

    // Act
    board.startDrag([300, 200], [300, 600]);

    // Assert
    await vi.waitFor(() => expect(board.popupCard.get()).toBeNull());
    expect(board.editor.isIn('select.translating')).toBe(true);
  });

  it('should offer no grouping, which would hide the popup for grouped cards, but still ungroup', async () => {
    // Arrange
    board = await createTestBoard();

    // Act
    const actionIds = board.actionIds();

    // Assert
    expect(actionIds).toContain('duplicate');
    expect(actionIds).not.toContain('group');
    expect(actionIds).toContain('ungroup');
  });
});

// ─────────────────────────────────────────────
// refresh
// ─────────────────────────────────────────────

describe('refresh', () => {
  const MINUTE = 60_000;
  const IN_VIEW = 'https://example.com/in-view';
  const OUT_OF_VIEW = 'https://example.com/out-of-view';
  const author = { id: 'did:plc:tester', name: 'Tester', handle: 'tester' };
  const withNote = (url: string) =>
    testLink(url, {
      saved: true,
      note: { id: 'note-1', text: 'Worth a read', author },
    });
  const linkOf = (url: string) =>
    board.queryClient.getQueryData<LinkInfo>(canvasKeys.link(url));
  const fetchedUrls = () =>
    board.server.calls
      .filter((call) => call.method === 'getLinks')
      .map((call) => call.args[0]);
  // Long enough for a fetch to reach the fake server and its answer to land
  const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

  // A board with a link in view and one off to the side, both loaded
  async function boardWithLinks(server = new FakeServer()) {
    board = await createTestBoard({ server });
    await board.dropUrl(IN_VIEW, { x: 0, y: 0 });
    await board.dropUrl(OUT_OF_VIEW, { x: 5000, y: 0 });
    await vi.waitFor(() => {
      expect(linkOf(IN_VIEW)).toBeDefined();
      expect(linkOf(OUT_OF_VIEW)).toBeDefined();
    });
    board.server.calls = [];
  }

  const heightOf = (id: TLShapeId) =>
    board.editor.getShape<LinkCardShape>(id)!.props.h;
  // As if the links were last fetched over a minute ago
  const ageLinks = (urls: string[]) => {
    for (const url of urls) {
      board.queryClient.setQueryData(canvasKeys.link(url), linkOf(url), {
        updatedAt: Date.now() - MINUTE - 1,
      });
    }
  };

  afterEach(async () => {
    // Closed first: showing the tab again would refresh it
    await board.dispose();
    focusManager.setFocused(undefined);
  });

  it('should refresh every link when the tab is shown again', async () => {
    // Arrange
    await boardWithLinks();
    ageLinks([IN_VIEW, OUT_OF_VIEW]);

    // Act
    board.hideTab();
    board.showTab();

    // Assert
    await vi.waitFor(() =>
      expect(fetchedUrls()).toEqual([[IN_VIEW, OUT_OF_VIEW]]),
    );
  });

  it('should not refresh links fetched within the last minute when the tab is shown again', async () => {
    // Arrange
    await boardWithLinks();

    // Act
    board.hideTab();
    board.showTab();
    await settle();

    // Assert
    expect(fetchedUrls()).toEqual([]);
  });

  it('should refresh the links in view on a timer, and not while the tab is hidden', async () => {
    // Arrange
    await boardWithLinks();

    // Act
    board.timedRefresh();
    await vi.waitFor(() => expect(fetchedUrls()).toEqual([[IN_VIEW]]));
    board.hideTab();
    board.timedRefresh();
    await settle();

    // Assert
    expect(fetchedUrls()).toEqual([[IN_VIEW]]);
  });

  it("should not say it couldn't refresh after one failure", async () => {
    // Arrange
    await boardWithLinks();
    board.server.failing = true;

    // Act
    board.timedRefresh();
    await vi.waitFor(() => expect(fetchedUrls()).toHaveLength(1));
    await settle();

    // Assert
    expect(board.refreshFailed.get()).toBe(false);
  });

  it("should say it couldn't refresh after two failures in a row", async () => {
    // Arrange
    await boardWithLinks();
    board.server.failing = true;

    // Act
    board.timedRefresh();
    await vi.waitFor(() => expect(fetchedUrls()).toHaveLength(1));
    board.timedRefresh();

    // Assert
    await vi.waitFor(() => expect(board.refreshFailed.get()).toBe(true));
  });

  it("should stop saying it couldn't refresh once a refresh succeeds", async () => {
    // Arrange
    await boardWithLinks();
    board.server.failing = true;
    board.timedRefresh();
    await vi.waitFor(() => expect(fetchedUrls()).toHaveLength(1));
    board.timedRefresh();
    await vi.waitFor(() => expect(board.refreshFailed.get()).toBe(true));
    board.server.failing = false;

    // Act
    board.timedRefresh();

    // Assert
    await vi.waitFor(() => expect(board.refreshFailed.get()).toBe(false));
  });

  it('should not count links it had no need to fetch as a successful refresh', async () => {
    // Arrange
    await boardWithLinks();
    board.server.failing = true;
    ageLinks([IN_VIEW]);

    // Act
    board.hideTab();
    board.showTab();
    await vi.waitFor(() => expect(fetchedUrls()).toHaveLength(1));
    board.hideTab();
    board.showTab();

    // Assert
    await vi.waitFor(() => expect(board.refreshFailed.get()).toBe(true));
  });

  it('should clear the note on every copy of a link unsaved elsewhere, leaving them in place', async () => {
    // Arrange
    const server = new FakeServer();
    server.links.set(IN_VIEW, withNote(IN_VIEW));
    await boardWithLinks(server);
    board.editor.select(board.linkCards()[0].id);
    board.runAction('duplicate');
    const before = board
      .linkCards()
      .filter((card) => card.props.url === IN_VIEW);

    // Act
    server.links.set(IN_VIEW, testLink(IN_VIEW));
    board.timedRefresh();

    // Assert
    await vi.waitFor(() => expect(linkOf(IN_VIEW)?.note).toBeNull());
    expect(linkOf(IN_VIEW)?.saved).toBe(false);
    for (const card of before) {
      const after = board.editor.getShape(card.id)!;
      expect(heightOf(card.id)).toBeLessThan(card.props.h);
      expect({ x: after.x, y: after.y }).toEqual({ x: card.x, y: card.y });
    }
  });

  it('should change nothing when the same refresh runs twice', async () => {
    // Arrange
    await boardWithLinks();
    board.server.links.set(IN_VIEW, withNote(IN_VIEW));
    board.timedRefresh();
    await vi.waitFor(() => expect(linkOf(IN_VIEW)?.note).not.toBeNull());
    await settle();
    let changes = 0;
    const unlisten = board.editor.store.listen(() => changes++, {
      scope: 'document',
    });

    // Act
    board.timedRefresh();
    await vi.waitFor(() => expect(fetchedUrls()).toHaveLength(2));
    await settle();
    unlisten();

    // Assert
    expect(changes).toBe(0);
  });

  it('should not let undo take back what a refresh changed', async () => {
    // Arrange
    await boardWithLinks();
    const [card] = board.linkCards();
    board.drag([0, 0], [200, 0]);
    board.server.links.set(IN_VIEW, withNote(IN_VIEW));
    board.timedRefresh();
    await vi.waitFor(() =>
      expect(heightOf(card.id)).toBeGreaterThan(card.props.h),
    );
    const refreshedHeight = heightOf(card.id);

    // Act
    board.editor.undo();

    // Assert
    expect(board.editor.getShape(card.id)!.x).toBe(card.x);
    await vi.waitFor(() => expect(heightOf(card.id)).toBe(refreshedHeight));
  });

  it('should keep a card moved while a refresh is under way where it was moved', async () => {
    // Arrange
    await boardWithLinks();
    const [card] = board.linkCards();
    board.server.links.set(IN_VIEW, withNote(IN_VIEW));
    const respond = board.server.holdResponses();
    board.timedRefresh();
    await vi.waitFor(() => expect(fetchedUrls()).toHaveLength(1));

    // Act
    board.drag([0, 0], [200, 0]);
    respond();

    // Assert
    await vi.waitFor(() => expect(linkOf(IN_VIEW)?.note).not.toBeNull());
    await settle();
    expect(board.editor.getShape(card.id)!.x).toBe(card.x + 200);
  });

  it('should show a save made elsewhere on a board just reopened', async () => {
    // Arrange
    await boardWithLinks();
    const first = board;
    await first.dispose();
    board = await createTestBoard({
      storage: first.storage,
      canvasId: first.canvasId,
      server: first.server,
    });

    // Act
    board.server.links.set(IN_VIEW, testLink(IN_VIEW, { saved: true }));
    await board.queryClient.invalidateQueries({ queryKey: cardKeys.all() });

    // Assert
    await vi.waitFor(() => expect(linkOf(IN_VIEW)?.saved).toBe(true));
  });

  it('should show a save made in another tab straight away', async () => {
    // Arrange
    await boardWithLinks();
    const first = board;
    await first.dispose();
    board = await createTestBoard({
      storage: first.storage,
      canvasId: first.canvasId,
      server: first.server,
    });
    otherTab = await board.openInAnotherTab();
    await vi.waitFor(() =>
      expect(
        otherTab!.queryClient.getQueryData<LinkInfo>(canvasKeys.link(IN_VIEW)),
      ).toMatchObject({ saved: false }),
    );

    // Act
    board.server.links.set(IN_VIEW, testLink(IN_VIEW, { saved: true }));
    await board.queryClient.invalidateQueries({ queryKey: cardKeys.all() });

    // Assert
    await vi.waitFor(() =>
      expect(
        otherTab!.queryClient.getQueryData<LinkInfo>(canvasKeys.link(IN_VIEW)),
      ).toMatchObject({ saved: true }),
    );
  });

  it('should not let a refresh under way overwrite a save made in another tab meanwhile', async () => {
    // Arrange
    await boardWithLinks();
    const first = board;
    await first.dispose();
    board = await createTestBoard({
      storage: first.storage,
      canvasId: first.canvasId,
      server: first.server,
    });
    otherTab = await board.openInAnotherTab();
    const otherLinkOf = (url: string) =>
      otherTab!.queryClient.getQueryData<LinkInfo>(canvasKeys.link(url));
    await vi.waitFor(() => expect(otherLinkOf(IN_VIEW)).toBeDefined());
    const respond = board.server.holdResponses();
    board.server.calls = [];
    otherTab.timedRefresh();
    await vi.waitFor(() => expect(fetchedUrls()).toHaveLength(1));

    // Act
    board.server.links.set(IN_VIEW, testLink(IN_VIEW, { saved: true }));
    await board.queryClient.invalidateQueries({ queryKey: cardKeys.all() });
    await settle();
    respond();

    // Assert
    await vi.waitFor(() => expect(otherLinkOf(IN_VIEW)?.saved).toBe(true));
    await settle();
    expect(otherLinkOf(IN_VIEW)?.saved).toBe(true);
  });

  it('should not let a refresh under way overwrite a save made elsewhere meanwhile', async () => {
    // Arrange
    await boardWithLinks();
    const respond = board.server.holdResponses();
    board.timedRefresh();
    await vi.waitFor(() => expect(fetchedUrls()).toHaveLength(1));

    // Act
    board.server.links.set(IN_VIEW, testLink(IN_VIEW, { saved: true }));
    await board.queryClient.invalidateQueries({ queryKey: cardKeys.all() });
    await settle();
    respond();

    // Assert
    await vi.waitFor(() => expect(linkOf(IN_VIEW)?.saved).toBe(true));
    await settle();
    expect(linkOf(IN_VIEW)?.saved).toBe(true);
  });
});

// ─────────────────────────────────────────────
// arrows
// ─────────────────────────────────────────────

describe('arrows', () => {
  // Long enough for a fetch to reach the fake server and its answer to land
  const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
  const A = 'https://example.com/a';
  const B = 'https://example.com/b';
  const C = 'https://example.com/c';
  const VIEWER = 'did:plc:tester';
  const connection = (
    id: string,
    sourceUrl: string,
    targetUrl: string,
    overrides: Partial<LinkConnection> = {},
  ): LinkConnection => ({
    id,
    type: 'SUPPORTS',
    sourceUrl,
    targetUrl,
    curatorId: VIEWER,
    ...overrides,
  });
  const ends = () =>
    board
      .arrows()
      .map((arrow) => `${arrow.connectionId}: ${arrow.from} -> ${arrow.to}`)
      .sort();
  const copiesOf = (url: string) =>
    board
      .linkCards()
      .filter((card) => card.props.url === url)
      .map((card) => card.id);

  // Places each link where given and waits for every arrow to be drawn
  async function boardWith(
    server: FakeServer,
    places: [string, number, number][],
    arrowCount: number,
  ) {
    board = await createTestBoard({ server });
    for (const [url, x, y] of places) await board.dropUrl(url, { x, y });
    await vi.waitFor(() => expect(board.arrows()).toHaveLength(arrowCount));
  }

  it('should draw an arrow for every pair of copies a connection joins', async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [connection('c1', A, B)];

    // Act
    await boardWith(
      server,
      [
        [A, 0, 0],
        [A, 0, 600],
        [B, 800, 0],
        [C, 800, 600],
      ],
      2,
    );

    // Assert
    const [a1, a2] = copiesOf(A);
    const [b] = copiesOf(B);
    expect(ends()).toEqual([`c1: ${a1} -> ${b}`, `c1: ${a2} -> ${b}`].sort());
  });

  it('should remove the arrows of a connection deleted elsewhere on the next refresh', async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [connection('c1', A, B), connection('c2', B, C)];
    await boardWith(
      server,
      [
        [A, 0, 0],
        [B, 600, 0],
        [C, 1200, 0],
      ],
      2,
    );

    // Act
    server.connections = [connection('c2', B, C)];
    board.timedRefresh();

    // Assert
    await vi.waitFor(() =>
      expect(board.arrows().map((arrow) => arrow.connectionId)).toEqual(['c2']),
    );
  });

  it("should keep a link's arrows when its connections fail to load", async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [connection('c1', A, B)];
    await boardWith(
      server,
      [
        [A, 0, 0],
        [B, 600, 0],
      ],
      1,
    );
    const before = board.arrows();
    server.connections = [];
    server.connectionsFailing = true;

    // Act
    board.timedRefresh();
    await vi.waitFor(() =>
      expect(
        server.calls.filter((call) => call.method === 'getLinks'),
      ).toHaveLength(2),
    );
    await settle();

    // Assert
    expect(board.arrows()).toEqual(before);
  });

  it('should remove at once the arrows of a connection deleted in another tab', async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [connection('c1', A, B), connection('c2', B, C)];
    await boardWith(
      server,
      [
        [A, 0, 0],
        [B, 600, 0],
        [C, 1200, 0],
      ],
      2,
    );

    // Act
    server.connections = [connection('c2', B, C)];
    announceLinkChange({ connectionIds: ['c1'] });

    // Assert
    await vi.waitFor(() =>
      expect(board.arrows().map((arrow) => arrow.connectionId)).toEqual(['c2']),
    );
  });

  it('should draw at once a connection made in another tab', async () => {
    // Arrange
    const server = new FakeServer();
    await boardWith(
      server,
      [
        [A, 0, 0],
        [B, 600, 0],
      ],
      0,
    );
    await settle();

    // Act
    server.connections = [connection('c1', A, B)];
    announceLinkChange({ urls: [A, B] });

    // Assert
    await vi.waitFor(() => expect(board.arrows()).toHaveLength(1));
  });

  it('should refresh arrows when the board is reopened, however recently they were fetched', async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [connection('c1', A, B)];
    await boardWith(
      server,
      [
        [A, 0, 0],
        [B, 600, 0],
      ],
      1,
    );
    const first = board;
    await first.dispose();
    server.connections = [];

    // Act
    board = await createTestBoard({
      storage: first.storage,
      canvasId: first.canvasId,
      server,
    });

    // Assert
    await vi.waitFor(() => expect(board.arrows()).toEqual([]));
  });

  it('should follow a connection whose type changed elsewhere', async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [connection('c1', A, B)];
    await boardWith(
      server,
      [
        [A, 0, 0],
        [B, 600, 0],
      ],
      1,
    );
    const [before] = board.arrows();

    // Act
    server.connections = [connection('c1', A, B, { type: 'OPPOSES' })];
    board.timedRefresh();

    // Assert
    await vi.waitFor(() =>
      expect(board.editor.getShape(before.id)!.meta).toMatchObject({
        connectionType: 'OPPOSES',
      }),
    );
    expect(board.arrows()).toEqual([before]);
  });

  // A connection arrow and a third card to drag it towards
  async function boardWithArrowAndSpareCard() {
    const server = new FakeServer();
    server.connections = [connection('c1', A, B)];
    await boardWith(
      server,
      [
        [A, 0, 0],
        [B, 600, 0],
        [C, 600, 500],
      ],
      1,
    );
    const [arrow] = board.arrows();
    return {
      before: arrow,
      shape: board.editor.getShape<TLArrowShape>(arrow.id)!,
    };
  }

  it('should give a connection arrow no ends to drag', async () => {
    // Arrange
    const { shape } = await boardWithArrowAndSpareCard();

    // Act
    board.editor.select(shape.id);

    // Assert
    expect(board.editor.getShapeHandles(shape) ?? []).toEqual([]);
  });

  it('should keep a connection arrow bound to its cards when it is dragged', async () => {
    // Arrange
    const { before, shape } = await boardWithArrowAndSpareCard();
    const middle = board.editor.getShapePageBounds(shape)!.center;
    board.editor.select(shape.id);

    // Act
    board.drag([middle.x, middle.y], [600, 500]);

    // Assert
    expect(board.arrows()).toEqual([before]);
    expect(board.editor.getShape(shape.id)!.props).toEqual(shape.props);
    await settle();
    expect(board.arrows()).toEqual([before]);
  });

  it("should keep a connection arrow's style when the user restyles it", async () => {
    // Arrange
    const { shape } = await boardWithArrowAndSpareCard();
    board.editor.select(shape.id);

    // Act
    board.editor.setStyleForSelectedShapes(DefaultColorStyle, 'red');
    board.editor.setStyleForSelectedShapes(DefaultDashStyle, 'draw');

    // Assert
    expect(board.editor.getShape(shape.id)!.props).toEqual(shape.props);
  });

  it("should draw the viewer's connections solid and other people's dotted", async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [
      connection('mine', A, B),
      connection('ghost', B, C, { curatorId: 'did:plc:someone-else' }),
    ];

    // Act
    await boardWith(
      server,
      [
        [A, 0, 0],
        [B, 600, 0],
        [C, 1200, 0],
      ],
      2,
    );

    // Assert
    const dashOf = (connectionId: string) => {
      const arrow = board
        .arrows()
        .find((candidate) => candidate.connectionId === connectionId)!;
      return board.editor.getShape<TLArrowShape>(arrow.id)!.props.dash;
    };
    expect(dashOf('mine')).toBe('solid');
    expect(dashOf('ghost')).toBe('dotted');
  });

  it('should change nothing when the same refresh runs twice', async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [connection('c1', A, B)];
    await boardWith(
      server,
      [
        [A, 0, 0],
        [A, 0, 600],
        [B, 800, 0],
      ],
      2,
    );
    board.timedRefresh();
    await settle();
    let changes = 0;
    const unlisten = board.editor.store.listen(() => changes++, {
      scope: 'document',
    });

    // Act
    board.timedRefresh();
    await settle();
    unlisten();

    // Assert
    expect(changes).toBe(0);
  });

  it("should remove a deleted card's arrows, and bring them back with it on undo", async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [connection('c1', A, B)];
    await boardWith(
      server,
      [
        [A, 0, 0],
        [B, 800, 0],
      ],
      1,
    );
    const before = board.arrows();
    const [a] = copiesOf(A);

    // Act
    board.editor.markHistoryStoppingPoint('delete');
    board.editor.deleteShape(a);
    await vi.waitFor(() => expect(board.arrows()).toEqual([]));
    board.editor.undo();

    // Assert
    await vi.waitFor(() => expect(board.arrows()).toEqual(before));
  });

  it('should remove again an arrow an undo brought back after its connection was deleted', async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [connection('c1', A, B)];
    await boardWith(
      server,
      [
        [A, 0, 0],
        [B, 800, 0],
      ],
      1,
    );
    const [a] = copiesOf(A);
    board.editor.markHistoryStoppingPoint('delete');
    board.editor.deleteShape(a);
    await vi.waitFor(() => expect(board.arrows()).toEqual([]));
    server.connections = [];
    board.timedRefresh();
    await settle();
    board.editor.undo();
    await settle();

    // Act
    board.timedRefresh();

    // Assert
    await vi.waitFor(() => expect(board.arrows()).toEqual([]));
    expect(board.editor.getShape(a)).toBeDefined();
  });

  it('should show its arrows when the board is reopened, before any refresh returns', async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [connection('c1', A, B)];
    await boardWith(
      server,
      [
        [A, 0, 0],
        [B, 800, 0],
      ],
      1,
    );
    const before = board.arrows();
    const first = board;
    await first.dispose();
    server.holdResponses();

    // Act
    board = await createTestBoard({
      storage: first.storage,
      canvasId: first.canvasId,
      server,
    });

    // Assert
    expect(board.arrows()).toEqual(before);
  });

  it('should correct the arrows of a reopened board on its next refresh', async () => {
    // Arrange
    const server = new FakeServer();
    server.connections = [connection('c1', A, B)];
    await boardWith(
      server,
      [
        [A, 0, 0],
        [B, 800, 0],
      ],
      1,
    );
    const first = board;
    await first.dispose();
    server.connections = [];
    board = await createTestBoard({
      storage: first.storage,
      canvasId: first.canvasId,
      server,
    });
    expect(board.arrows()).toHaveLength(1);

    // Act
    board.timedRefresh();

    // Assert
    await vi.waitFor(() => expect(board.arrows()).toEqual([]));
  });

  describe('focus', () => {
    // A -> B is the viewer's, B -> C a ghost, and C sits apart
    async function boardWithMineAndGhost() {
      const server = new FakeServer();
      server.connections = [
        connection('mine', A, B),
        connection('ghost', B, C, { curatorId: 'did:plc:someone-else' }),
      ];
      await boardWith(
        server,
        [
          [A, 0, 0],
          [B, 600, 0],
          [C, 600, 600],
        ],
        2,
      );
    }
    const displayOf = (connectionId: string) => {
      const arrow = board
        .arrows()
        .find((candidate) => candidate.connectionId === connectionId)!;
      return board.arrowDisplay(arrow.id);
    };
    const FAINT = { strong: false, pill: false };

    it('should draw every arrow faint and without its type until a card is focused', async () => {
      // Arrange
      await boardWithMineAndGhost();

      // Act
      board.hover([-500, 600]);
      await settle();

      // Assert
      expect(displayOf('mine')).toEqual(FAINT);
      expect(displayOf('ghost')).toEqual(FAINT);
    });

    it("should bring a hovered card's arrows to full strength with their types", async () => {
      // Arrange
      await boardWithMineAndGhost();

      // Act
      board.hover([0, 0]);

      // Assert
      await vi.waitFor(() =>
        expect(displayOf('mine')).toEqual({ strong: true, pill: true }),
      );
      expect(displayOf('ghost')).toEqual(FAINT);
    });

    it("should bring a selected card's arrows to full strength, ghosts included", async () => {
      // Arrange
      await boardWithMineAndGhost();
      const [b] = copiesOf(B);

      // Act
      board.editor.select(b);

      // Assert
      expect(displayOf('mine')).toEqual({ strong: true, pill: true });
      expect(displayOf('ghost')).toEqual({ strong: true, pill: true });
    });

    it('should draw every arrow at full strength once focus is turned off, naming ghosts only on focus', async () => {
      // Arrange
      await boardWithMineAndGhost();

      // Act
      board.arrowView.toggleFocus();

      // Assert
      expect(board.arrowView.isFocusOn()).toBe(false);
      expect(displayOf('mine')).toEqual({ strong: true, pill: true });
      expect(displayOf('ghost')).toEqual({ strong: true, pill: false });
    });
  });

  describe('hiding', () => {
    // Two copies of A, each connected to B
    async function boardWithTwoCopies() {
      const server = new FakeServer();
      server.connections = [connection('c1', A, B)];
      await boardWith(
        server,
        [
          [A, 0, 0],
          [A, 0, 600],
          [B, 800, 0],
        ],
        2,
      );
      return server;
    }
    const hiddenArrows = (copy: TLShapeId) =>
      board
        .arrows()
        .filter((arrow) => arrow.from === copy)
        .map((arrow) => board.editor.isShapeHidden(arrow.id));

    it("should hide one copy's arrows without hiding the other copies'", async () => {
      // Arrange
      await boardWithTwoCopies();
      const [hidden, other] = copiesOf(A);
      board.editor.select(hidden);

      // Act
      board.runAction('toggle-card-arrows');

      // Assert
      expect(hiddenArrows(hidden)).toEqual([true]);
      expect(hiddenArrows(other)).toEqual([false]);
    });

    it("should show a copy's arrows again when toggled twice", async () => {
      // Arrange
      await boardWithTwoCopies();
      const [copy] = copiesOf(A);
      board.editor.select(copy);
      board.runAction('toggle-card-arrows');

      // Act
      board.runAction('toggle-card-arrows');

      // Assert
      expect(hiddenArrows(copy)).toEqual([false]);
    });

    it('should hide every arrow from the board toggle', async () => {
      // Arrange
      await boardWithTwoCopies();

      // Act
      board.arrowView.toggleHidden();

      // Assert
      expect(
        board.arrows().map((arrow) => board.editor.isShapeHidden(arrow.id)),
      ).toEqual([true, true]);
    });

    it('should hide arrows drawn on the board too when every arrow is hidden', async () => {
      // Arrange
      await boardWithTwoCopies();
      board.editor.setCurrentTool('arrow');
      board.drag([2000, 2000], [2400, 2000]);
      const drawn = board.editor
        .getCurrentPageShapes()
        .find((shape) => shape.type === 'arrow' && !shape.meta.connectionId)!;

      // Act
      board.arrowView.toggleHidden();

      // Assert
      expect(board.editor.isShapeHidden(drawn.id)).toBe(true);
    });

    it('should keep hiding out of undo', async () => {
      // Arrange
      await boardWithTwoCopies();
      const [copy] = copiesOf(A);
      const [b] = copiesOf(B);
      const before = board.editor.getShape(b)!;
      board.drag([800, 0], [800, 300]);
      board.editor.select(copy);
      board.runAction('toggle-card-arrows');
      board.arrowView.toggleFocus();

      // Act
      board.editor.undo();

      // Assert
      expect(board.editor.getShape(b)!.y).toBe(before.y);
      expect(hiddenArrows(copy)).toEqual([true]);
      expect(board.arrowView.isFocusOn()).toBe(false);
    });

    it('should keep arrows hidden when their connection changes elsewhere', async () => {
      // Arrange
      const server = await boardWithTwoCopies();
      const [copy] = copiesOf(A);
      board.editor.select(copy);
      board.runAction('toggle-card-arrows');

      // Act
      server.connections = [connection('c1', A, B, { type: 'OPPOSES' })];
      board.timedRefresh();
      await vi.waitFor(() =>
        expect(board.editor.getShape(board.arrows()[0].id)!.meta).toMatchObject(
          { connectionType: 'OPPOSES' },
        ),
      );

      // Assert
      expect(hiddenArrows(copy)).toEqual([true]);
    });

    it('should restore the arrow toggles when the board is reopened', async () => {
      // Arrange
      const server = await boardWithTwoCopies();
      board.arrowView.toggleFocus();
      board.arrowView.toggleHidden();
      const first = board;
      await first.dispose();

      // Act
      board = await createTestBoard({
        storage: first.storage,
        canvasId: first.canvasId,
        server,
      });

      // Assert
      expect(board.arrowView.isFocusOn()).toBe(false);
      expect(board.arrowView.areHidden()).toBe(true);
      expect(
        board.arrows().map((arrow) => board.editor.isShapeHidden(arrow.id)),
      ).toEqual([true, true]);
    });
  });
});

describe('making connections', () => {
  const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
  const A = 'https://example.com/a';
  const B = 'https://example.com/b';
  const writes = () =>
    board.server.calls.filter(({ method }) =>
      ['createConnection', 'deleteConnection'].includes(method),
    );

  // A at the left, B at the right, both loaded
  async function boardWithTwoLinks() {
    board = await createTestBoard();
    await board.dropUrl(A, { x: 0, y: 0 });
    await board.dropUrl(B, { x: 800, y: 0 });
    await settle();
  }

  it('should open the type picker on an arrow drawn from one link to another, and publish Relates to on Enter', async () => {
    // Arrange
    await boardWithTwoLinks();

    // Act
    board.drawArrow([0, 0], [800, 0]);
    const opened = board.connectionPicker.state.get();
    await board.connectionPicker.publish();

    // Assert
    expect(opened).toMatchObject({
      sourceUrl: A,
      targetUrl: B,
      highlighted: 'RELATED',
    });
    expect(writes()).toEqual([
      {
        method: 'createConnection',
        args: [{ sourceUrl: A, targetUrl: B, type: 'RELATED' }],
      },
    ]);
    await vi.waitFor(() => expect(board.arrows()).toHaveLength(1));
    expect(board.sketchArrows()).toEqual([]);
    expect(board.connectionPicker.state.get()).toBeNull();
  });
  it('should move through the types with the arrow keys and publish the one highlighted', async () => {
    // Arrange
    await boardWithTwoLinks();
    board.drawArrow([0, 0], [800, 0]);

    // Act
    board.connectionPicker.moveHighlight(1);
    board.connectionPicker.moveHighlight(1);
    board.connectionPicker.moveHighlight(-1);
    await board.connectionPicker.publish();

    // Assert
    expect(writes()).toEqual([
      {
        method: 'createConnection',
        args: [{ sourceUrl: A, targetUrl: B, type: 'SUPPORTS' }],
      },
    ]);
  });

  it('should wrap round from the first type to the last', async () => {
    // Arrange
    await boardWithTwoLinks();
    board.drawArrow([0, 0], [800, 0]);

    // Act
    board.connectionPicker.moveHighlight(-1);

    // Assert
    expect(board.connectionPicker.state.get()?.highlighted).toBe('REFERENCES');
  });

  it('should publish the connection the other way round once swapped', async () => {
    // Arrange
    await boardWithTwoLinks();
    board.drawArrow([0, 0], [800, 0]);

    // Act
    board.connectionPicker.swap();
    const named = board.connectionPicker.state.get();
    await board.connectionPicker.publish('OPPOSES');

    // Assert
    expect(named).toMatchObject({ sourceUrl: B, targetUrl: A });
    expect(writes()).toEqual([
      {
        method: 'createConnection',
        args: [{ sourceUrl: B, targetUrl: A, type: 'OPPOSES' }],
      },
    ]);
  });

  it('should leave no arrow and call nothing when the picker is dismissed with Escape', async () => {
    // Arrange
    await boardWithTwoLinks();
    board.drawArrow([0, 0], [800, 0]);

    // Act
    board.connectionPicker.discard();
    await settle();

    // Assert
    expect(board.connectionPicker.state.get()).toBeNull();
    expect(board.sketchArrows()).toEqual([]);
    expect(board.arrows()).toEqual([]);
    expect(writes()).toEqual([]);
  });

  it('should not bring the discarded arrow back on undo or redo', async () => {
    // Arrange
    await boardWithTwoLinks();
    board.drawArrow([0, 0], [800, 0]);
    board.connectionPicker.discard();

    // Act
    board.runAction('undo');
    board.runAction('redo');

    // Assert
    expect(board.sketchArrows()).toEqual([]);
    expect(board.linkCards()).toHaveLength(2);
  });

  it('should keep an arrow to a sticky note on the board without opening the picker', async () => {
    // Arrange
    await boardWithTwoLinks();
    board.editor.createShape({ type: 'note', x: -100, y: 400 });

    // Act
    board.drawArrow([0, 0], [0, 500]);
    await settle();

    // Assert
    expect(board.connectionPicker.state.get()).toBeNull();
    expect(board.sketchArrows()).toHaveLength(1);
    expect(writes()).toEqual([]);
  });

  it('should keep an arrow from a drawing to a link on the board without opening the picker', async () => {
    // Arrange
    await boardWithTwoLinks();
    board.editor.setCurrentTool('draw');
    board.drag([300, 500], [500, 600]);

    // Act
    board.drawArrow([400, 550], [800, 0]);
    await settle();

    // Assert
    expect(board.connectionPicker.state.get()).toBeNull();
    expect(board.sketchArrows()).toHaveLength(1);
    expect(writes()).toEqual([]);
  });

  it('should show a toast with Undo after publishing, whose Undo deletes the connection', async () => {
    // Arrange
    await boardWithTwoLinks();
    board.drawArrow([0, 0], [800, 0]);
    await board.connectionPicker.publish();
    await vi.waitFor(() => expect(board.arrows()).toHaveLength(1));
    const toast = board.undoToast.current.get();

    // Act
    board.undoToast.undo();

    // Assert
    expect(toast).toMatchObject({
      sourceUrl: A,
      targetUrl: B,
      type: 'RELATED',
    });
    await vi.waitFor(() => expect(board.arrows()).toEqual([]));
    expect(writes().map(({ method, args }) => [method, args[0]])).toEqual([
      ['createConnection', { sourceUrl: A, targetUrl: B, type: 'RELATED' }],
      ['deleteConnection', 'new-1'],
    ]);
    expect(board.undoToast.current.get()).toBeNull();
  });

  it('should delete the published connection on Cmd+Z while the toast shows, with nothing to redo', async () => {
    // Arrange
    await boardWithTwoLinks();
    board.drawArrow([0, 0], [800, 0]);
    await board.connectionPicker.publish();
    await vi.waitFor(() => expect(board.arrows()).toHaveLength(1));

    // Act
    board.runAction('undo');
    await vi.waitFor(() => expect(board.arrows()).toEqual([]));
    board.runAction('redo');
    await settle();

    // Assert
    expect(writes().map(({ method }) => method)).toEqual([
      'createConnection',
      'deleteConnection',
    ]);
    expect(board.arrows()).toEqual([]);
    expect(board.sketchArrows()).toEqual([]);
    expect(board.linkCards()).toHaveLength(2);
  });

  it('should undo board edits as usual on Cmd+Z once the toast has gone', async () => {
    // Arrange
    await boardWithTwoLinks();
    board.drawArrow([0, 0], [800, 0]);
    await board.connectionPicker.publish();
    await vi.waitFor(() => expect(board.arrows()).toHaveLength(1));
    board.undoToast.dismiss();

    // Act
    board.runAction('undo');
    await settle();

    // Assert
    expect(writes().map(({ method }) => method)).toEqual(['createConnection']);
    expect(board.linkCards()).toHaveLength(1);
  });

  it('should say so and leave no arrow when publishing fails', async () => {
    // Arrange
    await boardWithTwoLinks();
    board.drawArrow([0, 0], [800, 0]);
    board.server.failing = true;

    // Act
    await board.connectionPicker.publish();

    // Assert
    expect(board.serverErrors).toEqual(["Couldn't publish the connection."]);
    expect(board.sketchArrows()).toEqual([]);
    expect(board.arrows()).toEqual([]);
    expect(board.undoToast.current.get()).toBeNull();
  });
  it('should keep the Undo when deleting the connection fails, so it can be tried again', async () => {
    // Arrange
    await boardWithTwoLinks();
    board.drawArrow([0, 0], [800, 0]);
    await board.connectionPicker.publish();
    const toast = board.undoToast.current.get();
    board.server.failing = true;

    // Act
    board.undoToast.undo();
    await settle();

    // Assert
    expect(board.serverErrors).toEqual(["Couldn't delete the connection."]);
    expect(board.undoToast.current.get()).toBe(toast);
  });

  it('should not save the drawn arrow when the board closes with the picker open', async () => {
    // Arrange
    await boardWithTwoLinks();
    board.drawArrow([0, 0], [800, 0]);
    const first = board;

    // Act
    await first.dispose();
    board = await createTestBoard({
      storage: first.storage,
      canvasId: first.canvasId,
    });

    // Assert
    expect(board.sketchArrows()).toEqual([]);
    expect(board.linkCards()).toHaveLength(2);
  });
});

describe('editing connections', () => {
  const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
  const A = 'https://example.com/a';
  const B = 'https://example.com/b';
  const C = 'https://example.com/c';
  const VIEWER = 'did:plc:tester';
  const connection = (
    id: string,
    sourceUrl: string,
    targetUrl: string,
    overrides: Partial<LinkConnection> = {},
  ): LinkConnection => ({
    id,
    type: 'SUPPORTS',
    sourceUrl,
    targetUrl,
    curatorId: VIEWER,
    ...overrides,
  });
  const writes = () =>
    board.server.calls
      .filter(({ method }) =>
        ['createConnection', 'updateConnection', 'deleteConnection'].includes(
          method,
        ),
      )
      .map(({ method, args }) => [method, ...args]);
  const arrowOf = (connectionId: string) =>
    board.arrows().find((arrow) => arrow.connectionId === connectionId);
  const metaOf = (connectionId: string) =>
    board.editor.getShape(arrowOf(connectionId)!.id)!.meta;
  const urlOfCard = (id: TLShapeId | undefined) =>
    board.editor.getShape<LinkCardShape>(id!)!.props.url;

  // Mine from A to B, and someone else's from B to C, with the given one
  // selected
  async function boardWithConnections(selected: 'mine' | 'ghost' = 'mine') {
    const server = new FakeServer();
    server.connections = [
      connection('mine', A, B),
      connection('ghost', B, C, { curatorId: 'did:plc:someone-else' }),
    ];
    board = await createTestBoard({ server });
    await board.dropUrl(A, { x: 0, y: 0 });
    await board.dropUrl(B, { x: 600, y: 0 });
    await board.dropUrl(C, { x: 1200, y: 0 });
    await vi.waitFor(() => expect(board.arrows()).toHaveLength(2));
    board.editor.select(arrowOf(selected)!.id);
  }

  it('should change the type of my connection, and change it back from the toast', async () => {
    // Arrange
    await boardWithConnections();
    const editable = board.connectionEdits.selected.get()!;

    // Act
    await board.connectionEdits.changeType(editable, 'OPPOSES');
    await vi.waitFor(() =>
      expect(metaOf('mine')).toMatchObject({ connectionType: 'OPPOSES' }),
    );
    const toast = board.undoToast.current.get();
    board.undoToast.undo();

    // Assert
    expect(editable).toMatchObject({
      connectionId: 'mine',
      type: 'SUPPORTS',
      sourceUrl: A,
      targetUrl: B,
    });
    expect(toast).toMatchObject({ kind: 'retyped', type: 'OPPOSES' });
    await vi.waitFor(() =>
      expect(metaOf('mine')).toMatchObject({ connectionType: 'SUPPORTS' }),
    );
    expect(writes()).toEqual([
      ['updateConnection', 'mine', { type: 'OPPOSES' }],
      ['updateConnection', 'mine', { type: 'SUPPORTS' }],
    ]);
    expect(board.undoToast.current.get()).toBeNull();
  });

  it('should flip my connection, and flip it back from the toast', async () => {
    // Arrange
    await boardWithConnections();
    const editable = board.connectionEdits.selected.get()!;
    const ends = () => {
      const arrow = arrowOf('mine')!;
      return [urlOfCard(arrow.from), urlOfCard(arrow.to)];
    };

    // Act
    await board.connectionEdits.flip(editable);
    await vi.waitFor(() => expect(ends()).toEqual([B, A]));
    const toast = board.undoToast.current.get();
    board.undoToast.undo();

    // Assert
    expect(toast).toMatchObject({
      kind: 'flipped',
      sourceUrl: B,
      targetUrl: A,
    });
    await vi.waitFor(() => expect(ends()).toEqual([A, B]));
    expect(writes()).toEqual([
      ['updateConnection', 'mine', { swap: true }],
      ['updateConnection', 'mine', { swap: true }],
    ]);
  });

  it("should offer no edits on someone else's connection", async () => {
    // Arrange
    await boardWithConnections('ghost');

    // Act
    const editable = board.connectionEdits.selected.get();

    // Assert
    expect(editable).toBeNull();
  });

  it('should open the delete confirmation on the Delete key, and delete nothing until confirmed', async () => {
    // Arrange
    await boardWithConnections();

    // Act
    board.runAction('delete');
    await settle();

    // Assert
    expect(board.connectionEdits.deleting.get()).toMatchObject({
      connections: [{ connectionId: 'mine' }],
    });
    expect(arrowOf('mine')).toBeDefined();
    expect(writes()).toEqual([]);
  });

  it('should delete my connection on confirming, with nothing to undo', async () => {
    // Arrange
    await boardWithConnections();
    board.runAction('delete');

    // Act
    await board.connectionEdits.confirmDelete();
    const arrowGone = !arrowOf('mine');
    board.runAction('undo');
    await settle();

    // Assert
    expect(arrowGone).toBe(true);
    expect(arrowOf('mine')).toBeUndefined();
    expect(board.connectionEdits.deleting.get()).toBeNull();
    expect(board.undoToast.current.get()).toBeNull();
    // Undo skipped the delete and took back the last board edit, C's drop
    expect(board.linkCards().map((card) => card.props.url)).toEqual([A, B]);
    expect(writes()).toEqual([['deleteConnection', 'mine']]);
  });

  it('should keep my connection when the confirmation is cancelled', async () => {
    // Arrange
    await boardWithConnections();
    board.runAction('delete');

    // Act
    board.connectionEdits.cancelDelete();
    await settle();

    // Assert
    expect(board.connectionEdits.deleting.get()).toBeNull();
    expect(arrowOf('mine')).toBeDefined();
    expect(writes()).toEqual([]);
  });

  it("should delete nothing on the Delete key with someone else's connection selected", async () => {
    // Arrange
    await boardWithConnections('ghost');

    // Act
    board.runAction('delete');
    await settle();

    // Assert
    expect(board.connectionEdits.deleting.get()).toBeNull();
    expect(arrowOf('ghost')).toBeDefined();
    expect(writes()).toEqual([]);
  });

  it('should drop the Undo of a change once its connection is deleted', async () => {
    // Arrange
    await boardWithConnections();
    await board.connectionEdits.changeType(
      board.connectionEdits.selected.get()!,
      'OPPOSES',
    );
    board.editor.select(arrowOf('mine')!.id);
    board.runAction('delete');

    // Act
    await board.connectionEdits.confirmDelete();

    // Assert
    expect(board.undoToast.current.get()).toBeNull();
  });

  it('should keep the connection and its arrow when the arrow is cut', async () => {
    // Arrange
    await boardWithConnections();
    const before = arrowOf('mine');

    // Act
    board.runAction('cut');
    await settle();

    // Assert
    expect(arrowOf('mine')).toEqual(before);
    expect(writes()).toEqual([]);
  });

  it('should change the type back on Cmd+Z while the toast shows', async () => {
    // Arrange
    await boardWithConnections();
    await board.connectionEdits.changeType(
      board.connectionEdits.selected.get()!,
      'OPPOSES',
    );

    // Act
    board.runAction('undo');
    await settle();

    // Assert
    expect(writes()).toEqual([
      ['updateConnection', 'mine', { type: 'OPPOSES' }],
      ['updateConnection', 'mine', { type: 'SUPPORTS' }],
    ]);
    expect(board.linkCards()).toHaveLength(3);
  });

  it('should keep a deleted connection off the board while its links are still refetching', async () => {
    // Arrange
    await boardWithConnections();
    board.runAction('delete');
    const respond = board.server.holdResponses();

    // Act
    await board.connectionEdits.confirmDelete();
    await board.dropUrl('https://example.com/d', { x: 0, y: 600 });
    await settle();
    const whileRefetching = arrowOf('mine');
    respond();
    await settle();

    // Assert
    expect(whileRefetching).toBeUndefined();
    expect(arrowOf('mine')).toBeUndefined();
    expect(arrowOf('ghost')).toBeDefined();
  });

  it('should delete the cards selected with my connection only once confirmed', async () => {
    // Arrange
    await boardWithConnections();
    const cardA = board.linkCards().find((card) => card.props.url === A)!;
    board.editor.select(arrowOf('mine')!.id, cardA.id);

    // Act
    board.runAction('delete');
    const whileAsking = board.linkCards().map((card) => card.props.url);
    await board.connectionEdits.confirmDelete();

    // Assert
    expect(whileAsking).toEqual([A, B, C]);
    expect(board.linkCards().map((card) => card.props.url)).toEqual([B, C]);
    expect(writes()).toEqual([['deleteConnection', 'mine']]);
  });

  it('should keep the cards selected with my connection when the confirmation is cancelled', async () => {
    // Arrange
    await boardWithConnections();
    const cardA = board.linkCards().find((card) => card.props.url === A)!;
    board.editor.select(arrowOf('mine')!.id, cardA.id);
    board.runAction('delete');

    // Act
    board.connectionEdits.cancelDelete();

    // Assert
    expect(board.linkCards()).toHaveLength(3);
    expect(writes()).toEqual([]);
  });

  it('should not delete a connection from a read-only tab', async () => {
    // Arrange
    await boardWithConnections();
    board.runAction('delete');

    // Act
    board.editor.updateInstanceState({ isReadonly: true });
    await board.connectionEdits.confirmDelete();

    // Assert
    expect(writes()).toEqual([]);
  });

  it('should keep offering edits while the type menu is open, but not under another menu', async () => {
    // Arrange
    await boardWithConnections();

    // Act
    board.editor.menus.addOpenMenu(CONNECTION_TYPE_MENU);
    const withTypeMenu = board.connectionEdits.selected.get();
    board.editor.menus.addOpenMenu('context menu');
    const withContextMenu = board.connectionEdits.selected.get();
    board.editor.menus.clearOpenMenus();

    // Assert
    expect(withTypeMenu).toMatchObject({ connectionId: 'mine' });
    expect(withContextMenu).toBeNull();
  });

  it('should keep the arrow selected once it is flipped', async () => {
    // Arrange
    await boardWithConnections();

    // Act
    await board.connectionEdits.flip(board.connectionEdits.selected.get()!);
    await vi.waitFor(() =>
      expect(board.connectionEdits.selected.get()).toMatchObject({
        sourceUrl: B,
        targetUrl: A,
      }),
    );

    // Assert
    expect(board.editor.getSelectedShapeIds()).toEqual([arrowOf('mine')!.id]);
  });

  it('should send one write when flip is clicked twice before the first lands', async () => {
    // Arrange
    await boardWithConnections();
    const editable = board.connectionEdits.selected.get()!;

    // Act
    await Promise.all([
      board.connectionEdits.flip(editable),
      board.connectionEdits.flip(editable),
    ]);

    // Assert
    expect(writes()).toEqual([['updateConnection', 'mine', { swap: true }]]);
  });

  it('should not undo a change from a read-only tab', async () => {
    // Arrange
    await boardWithConnections();
    await board.connectionEdits.changeType(
      board.connectionEdits.selected.get()!,
      'OPPOSES',
    );

    // Act
    board.editor.updateInstanceState({ isReadonly: true });
    board.undoToast.undo();
    await settle();

    // Assert
    expect(writes()).toEqual([
      ['updateConnection', 'mine', { type: 'OPPOSES' }],
    ]);
  });

  it("should keep another connection's Undo when a connection with no type is given one", async () => {
    // Arrange
    await boardWithConnections();
    const mine = board.connectionEdits.selected.get()!;
    await board.connectionEdits.flip(mine);
    const toast = board.undoToast.current.get();

    // Act
    await board.connectionEdits.changeType(
      { ...mine, connectionId: 'untyped', type: null },
      'OPPOSES',
    );

    // Assert
    expect(board.undoToast.current.get()).toBe(toast);
  });

  it("should drop a change's Undo as soon as its connection's delete is confirmed", async () => {
    // Arrange
    await boardWithConnections();
    await board.connectionEdits.changeType(
      board.connectionEdits.selected.get()!,
      'OPPOSES',
    );
    board.editor.select(arrowOf('mine')!.id);
    board.runAction('delete');

    // Act
    const deleted = board.connectionEdits.confirmDelete();
    const whileDeleting = board.undoToast.current.get();
    await deleted;

    // Assert
    expect(whileDeleting).toBeNull();
  });

  it('should take a connection arrow inside a frame along with the frame', async () => {
    // Arrange
    await boardWithConnections();
    const frameId = createShapeId('frame');
    board.editor.createShape({
      id: frameId,
      type: 'frame',
      x: -400,
      y: -400,
      props: { w: 2000, h: 1000 },
    });
    const inFrame = [
      ...board.linkCards().map((card) => card.id),
      arrowOf('mine')!.id,
    ];
    board.editor.reparentShapes(inFrame, frameId);
    board.editor.select(frameId);

    // Act
    board.runAction('delete');
    await settle();

    // Assert
    const orphans = board.editor
      .getCurrentPageShapes()
      .filter((shape) => !board.editor.getShape(shape.parentId as TLShapeId));
    expect(
      orphans.filter(
        (shape) => shape.parentId !== board.editor.getCurrentPageId(),
      ),
    ).toEqual([]);
    expect(board.arrows()).toEqual([]);
    expect(writes()).toEqual([]);
  });
});
