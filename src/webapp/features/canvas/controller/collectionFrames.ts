import {
  atom,
  computed,
  createShapeId,
  type Editor,
  type TLFrameShape,
  type TLShapeId,
  type TLShapePartial,
} from 'tldraw';
import {
  COLLECTION_FRAME_WIDTH,
  COLLECTION_META_KEY,
  COLLECTION_PAGE_SIZE,
  FRAME_DESCRIPTION_FONT,
  FRAME_DESCRIPTION_WIDTH,
  FRAME_GAP,
  cardsTop,
  collectionFrameMeta,
  frameHeaderHeight,
  frameHeightFor,
  isCollapsed,
  layOutColumns,
  type CollectionFrameMeta,
} from '../model/collectionFrames';
import {
  ENTRY_META_KEY,
  LINK_CARD_TYPE,
  LINK_CARD_WIDTH,
  type CountLines,
  type EntryCard,
} from '../model/linkCards';
import type {
  CanvasServer,
  CollectionEntry,
  CollectionInfo,
  CollectionPage,
} from '../server/canvasServer';
import { jsonMeta } from '../lib/jsonMeta';
import { isInCollapsedFrame } from '../shapes/collectionFrame/CollectionFrameShapeUtil';
import type { LinkCardShape } from '../shapes/linkCard/LinkCardShapeUtil';
import type { FetchOutcome, LinkPlacement } from './linkCards';
import type { SeedProgress } from './linkSeed';

export interface CollectionFramesDeps {
  editor: Editor;
  server: CanvasServer;
  fetchLinks(urls: string[]): Promise<FetchOutcome>;
  cardHeight(url: string, entry: EntryCard | null): number;
  placeLinks(places: LinkPlacement[]): TLShapeId[];
  countLines: CountLines;
  // Leaves a name the user has given the board
  rename(name: string): Promise<void>;
  onFailed(message: string): void;
  // Null once the collection is placed, or couldn't be
  onProgress(progress: SeedProgress | null): void;
  // False once the board is closed or another tab writes it
  canPlace(): boolean;
}

export type CollectionFrameShape = TLFrameShape & {
  meta: { [COLLECTION_META_KEY]: CollectionFrameMeta };
};

export const COLLECTION_LOAD_FAILED =
  "Couldn't load this collection. Try again from its page.";

// Between a frame and the board's other shapes when it joins a board
const FRAME_MARGIN = 160;

export function collectionFramesOn(editor: Editor) {
  return editor
    .getCurrentPageShapes()
    .filter(
      (shape): shape is CollectionFrameShape =>
        shape.type === 'frame' && !!collectionFrameMeta(shape.meta),
    );
}

const entryCard = (
  entry: CollectionEntry,
  collection: CollectionInfo,
): EntryCard => ({
  author: entry.author,
  note: entry.note,
  byRow: entry.author.id !== collection.author.id,
});

// Places a collection as a frame holding a copy per entry, and loads more of
// them on request. Nothing here writes to the server.
export function attachCollectionFrames(deps: CollectionFramesDeps) {
  const { editor } = deps;
  const frames = computed('collection frames', () =>
    collectionFramesOn(editor),
  );
  // The copies a frame placed, as opposed to free copies
  const managed = computed(
    'frame-managed copies',
    () =>
      new Set(
        frames
          .get()
          .flatMap((frame) => Object.values(frame.meta.collection.entries)),
      ),
  );
  const metaOf = (id: TLShapeId) => {
    const frame = editor.getShape(id);
    return frame?.type === 'frame' ? collectionFrameMeta(frame.meta) : null;
  };
  const withMeta = (meta: CollectionFrameMeta) => ({
    [COLLECTION_META_KEY]: jsonMeta(meta),
  });

  // A copy made from a frame's copy (Cmd+D, paste, Option-drag) carries its
  // card, but no frame placed it, so it shows the viewer's card instead. A
  // copy of a whole frame becomes a plain frame, as a collection appears once
  // per board; a frame cut and pasted back takes its pasted copies as its
  // entries. Checked once the whole operation has landed, so an undo that
  // brings back a frame with its copies keeps them.
  let created: TLShapeId[] = [];
  const unlistenCreated = editor.sideEffects.registerAfterCreateHandler(
    'shape',
    (shape, source) => {
      const carriesCard =
        shape.type === LINK_CARD_TYPE &&
        !!(shape as LinkCardShape).props.cardId;
      const isCollection =
        shape.type === 'frame' && !!collectionFrameMeta(shape.meta);
      if (source === 'user' && (carriesCard || isCollection)) {
        created.push(shape.id);
      }
    },
  );
  const unlistenComplete = editor.sideEffects.registerOperationCompleteHandler(
    () => {
      if (created.length === 0) return;
      const ids = created;
      created = [];
      const createdFrames = ids.flatMap((id) => {
        const meta = metaOf(id);
        if (!meta) return [];
        const elsewhere = frames
          .get()
          .some(
            (frame) =>
              !ids.includes(frame.id) &&
              frame.meta.collection.collection.id === meta.collection.id,
          );
        if (elsewhere) {
          return { id, type: 'frame', meta: { [COLLECTION_META_KEY]: null } };
        }
        const children = editor
          .getSortedChildIdsForParent(id)
          .map((child) => editor.getShape<LinkCardShape>(child)!)
          .filter((card) => card.type === LINK_CARD_TYPE && card.props.cardId);
        if (
          children.every((card) => meta.entries[card.props.cardId!] === card.id)
        ) {
          return [];
        }
        const entries = {
          ...meta.entries,
          ...Object.fromEntries(
            children.map((card) => [card.props.cardId!, card.id]),
          ),
        };
        return { id, type: 'frame', meta: withMeta({ ...meta, entries }) };
      });
      if (createdFrames.length > 0) editor.updateShapes(createdFrames);
      const freed = ids
        .map((id) => editor.getShape<LinkCardShape>(id))
        .filter(
          (card): card is LinkCardShape =>
            !!card?.props.cardId && !managed.get().has(card.id),
        )
        .map(
          (card): TLShapePartial<LinkCardShape> => ({
            id: card.id,
            type: LINK_CARD_TYPE,
            props: { cardId: null, h: deps.cardHeight(card.props.url, null) },
            meta: { [ENTRY_META_KEY]: null },
          }),
        );
      if (freed.length > 0) editor.updateShapes(freed);
    },
  );

  // Its cards are hidden, so nothing the user does moves them out; tldraw
  // does, as they lie outside its bounds, when the frame is aligned, flipped
  // or rotated. Kept in.
  const unlistenKickout = editor.sideEffects.registerBeforeChangeHandler(
    'shape',
    (prev, next) =>
      prev.parentId !== next.parentId && isInCollapsedFrame(editor, prev)
        ? {
            ...next,
            parentId: prev.parentId,
            index: prev.index,
            x: prev.x,
            y: prev.y,
          }
        : next,
  );

  const fetchPage = (collectionId: string, page: number) =>
    deps.server.getCollection(collectionId, {
      page,
      limit: COLLECTION_PAGE_SIZE,
    });

  const show = (id: TLShapeId) => {
    const bounds = editor.getShapePageBounds(id);
    if (bounds) editor.zoomToBounds(bounds, { targetZoom: 1, immediate: true });
  };

  // In the frame's space, from top down
  function layOut(
    entries: CollectionEntry[],
    collection: CollectionInfo,
    top: number,
  ) {
    const cards = entries.map((entry) => {
      const card = entryCard(entry, collection);
      const h = deps.cardHeight(entry.url, card);
      return { entry, card, h, id: createShapeId() };
    });
    const layout = layOutColumns(
      cards.map((card) => card.h),
      top,
    );
    return {
      cards,
      at: layout.at,
      bottom: layout.bottom,
      // Set on the frame before the copies exist, or they'd start out free
      entries: Object.fromEntries(
        cards.map(({ entry, id }) => [entry.cardId, id]),
      ),
    };
  }

  // Placed on the page, centred where the layout puts them in the frame, then
  // moved in
  function placeCopies(
    frameId: TLShapeId,
    { cards, at }: ReturnType<typeof layOut>,
  ) {
    const frame = editor.getShape(frameId)!;
    const ids = deps.placeLinks(
      cards.map(({ entry, card, h, id }, i) => ({
        url: entry.url,
        id,
        entry: { cardId: entry.cardId, card },
        at: {
          x: frame.x + at[i].x + LINK_CARD_WIDTH / 2,
          y: frame.y + at[i].y + h / 2,
        },
      })),
    );
    editor.reparentShapes(ids, frameId);
  }

  const headerHeightOf = (collection: CollectionInfo) => {
    const description = collection.description?.trim();
    return frameHeaderHeight(
      description
        ? deps.countLines(
            description,
            FRAME_DESCRIPTION_FONT,
            FRAME_DESCRIPTION_WIDTH,
          )
        : 0,
    );
  };

  function placeFrame(page: CollectionPage, startsBoard: boolean) {
    const { collection } = page;
    const headerHeight = headerHeightOf(collection);
    const layout = layOut(page.entries, collection, cardsTop(headerHeight));
    const w = COLLECTION_FRAME_WIDTH;
    const h = frameHeightFor(layout.bottom);
    const content = editor.getCurrentPageBounds();
    const view = editor.getViewportPageBounds();
    const at = content
      ? { x: content.maxX + FRAME_MARGIN, y: content.minY }
      : { x: view.midX - w / 2, y: view.midY - h / 2 };
    const id = createShapeId();
    const meta: CollectionFrameMeta = {
      collection,
      entries: layout.entries,
      pages: 1,
      hasMore: page.hasMore,
      headerHeight,
      expandedHeight: null,
    };
    // A new board's starting point, like the links of a link's page, which
    // undo doesn't take back. Added to a board, it's one step of undo.
    if (!startsBoard) editor.markHistoryStoppingPoint('place collection');
    editor.run(
      () => {
        editor.createShape<TLFrameShape>({
          id,
          type: 'frame',
          ...at,
          props: { w, h, name: collection.name },
          meta: withMeta(meta),
        });
        placeCopies(id, layout);
      },
      { history: startsBoard ? 'ignore' : 'record' },
    );
    return id;
  }

  const frameOf = (collectionId: string) =>
    frames
      .get()
      .find((frame) => frame.meta.collection.collection.id === collectionId);

  // A collection already on the board is shown rather than placed again
  async function open(collectionId: string, startsBoard: boolean) {
    if (!deps.canPlace()) return;
    const onBoard = frameOf(collectionId);
    if (onBoard) {
      show(onBoard.id);
      return;
    }
    deps.onProgress({ step: 'collection' });
    try {
      let page: CollectionPage;
      try {
        page = await fetchPage(collectionId, 1);
      } catch (error) {
        console.warn(error);
        deps.onFailed(COLLECTION_LOAD_FAILED);
        return;
      }
      if (!deps.canPlace()) return;
      deps.onProgress({ step: 'entries', count: page.entries.length });
      await deps.fetchLinks(page.entries.map((entry) => entry.url));
      if (!deps.canPlace()) return;
      show(placeFrame(page, startsBoard));
      await deps.rename(page.collection.name).catch(console.warn);
    } finally {
      deps.onProgress(null);
    }
  }

  const loading = atom('loading frames', new Set<TLShapeId>());
  const setLoading = (id: TLShapeId, on: boolean) => {
    const next = new Set(loading.get());
    if (on) next.add(id);
    else next.delete(id);
    loading.set(next);
  };

  // The next page, below the cards in the frame, skipping entries already on
  // the board. One step of undo.
  async function loadMore(frameId: TLShapeId) {
    const before = metaOf(frameId);
    if (!before?.hasMore || loading.get().has(frameId) || !deps.canPlace()) {
      return;
    }
    setLoading(frameId, true);
    try {
      const page = await fetchPage(before.collection.id, before.pages + 1);
      await deps.fetchLinks(page.entries.map((entry) => entry.url));
      const meta = metaOf(frameId);
      if (!meta || !deps.canPlace()) return;
      const frame = editor.getShape<TLFrameShape>(frameId)!;
      const placing = page.entries.filter(
        (entry) => !(entry.cardId in meta.entries),
      );
      const childBottoms = editor
        .getSortedChildIdsForParent(frameId)
        .map((id) => editor.getShape(id)!)
        .map((child) => child.y + editor.getShapeGeometry(child).bounds.maxY);
      const headerHeight = headerHeightOf(page.collection);
      const top = Math.max(
        cardsTop(headerHeight),
        ...childBottoms.map((bottom) => bottom + FRAME_GAP),
      );
      const layout = layOut(placing, page.collection, top);
      // A frame collapsed meanwhile stays collapsed, and opens to fit them
      const h = Math.max(
        meta.expandedHeight ?? frame.props.h,
        frameHeightFor(layout.bottom),
      );
      editor.markHistoryStoppingPoint('load more entries');
      editor.run(() => {
        editor.updateShape<TLFrameShape>({
          id: frameId,
          type: 'frame',
          props: {
            name: page.collection.name,
            h: isCollapsed(meta) ? headerHeight : h,
          },
          meta: withMeta({
            ...meta,
            collection: page.collection,
            entries: { ...meta.entries, ...layout.entries },
            pages: before.pages + 1,
            hasMore: page.hasMore,
            headerHeight,
            expandedHeight: isCollapsed(meta) ? h : null,
          }),
        });
        placeCopies(frameId, layout);
      });
    } catch (error) {
      console.warn(error);
      deps.onFailed("Couldn't load more of this collection. Try again.");
    } finally {
      setLoading(frameId, false);
    }
  }

  function toggleCollapsed(frameId: TLShapeId) {
    const meta = metaOf(frameId);
    const frame = editor.getShape<TLFrameShape>(frameId);
    if (!meta || !frame || editor.getIsReadonly()) return;
    editor.markHistoryStoppingPoint('collapse frame');
    editor.updateShape<TLFrameShape>({
      id: frameId,
      type: 'frame',
      props: { h: meta.expandedHeight ?? meta.headerHeight },
      meta: withMeta({
        ...meta,
        expandedHeight: isCollapsed(meta) ? null : frame.props.h,
      }),
    });
  }

  return {
    open,
    loadMore,
    toggleCollapsed,
    isLoadingMore: (frameId: TLShapeId) => loading.get().has(frameId),
    detach() {
      unlistenCreated();
      unlistenComplete();
      unlistenKickout();
    },
  };
}

export type CollectionFrames = ReturnType<typeof attachCollectionFrames>;
