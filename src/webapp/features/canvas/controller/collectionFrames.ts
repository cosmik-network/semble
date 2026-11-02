import {
  atom,
  computed,
  createShapeId,
  react,
  unsafe__withoutCapture,
  type Editor,
  type TLFrameShape,
  type TLShape,
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
  collectionFrameOf,
  type CollectionPageUrl,
  frameHeaderHeight,
  frameHeightFor,
  isCollapsed,
  layOutColumns,
  refreshFrame,
  type CollectionFrameMeta,
  type FrameCopy,
} from '../model/collectionFrames';
import {
  ENTRY_META_KEY,
  LINK_CARD_TYPE,
  LINK_CARD_WIDTH,
  entryCardOf,
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
import {
  combineOutcomes,
  type FetchOutcome,
  type LinkPlacement,
} from './linkCards';
import type { SeedProgress } from './linkSeed';
import type { RefreshOptions } from './refreshLoop';
import { parseCollectionPage } from '@/lib/utils/link';

export interface CollectionFramesDeps {
  editor: Editor;
  server: CanvasServer;
  viewerDid: string;
  collectionPageUrl: CollectionPageUrl;
  fetchLinks(urls: string[]): Promise<FetchOutcome>;
  cardHeight(url: string, entry: EntryCard | null): number;
  placeLinks(places: LinkPlacement[]): TLShapeId[];
  countLines: CountLines;
  // Leaves a name the user has given the board
  rename(name: string): Promise<void>;
  onFailed(message: string): void;
  // A copy was kept out of a frame that already holds that person's card
  onAlreadyInCollection(collectionName: string): void;
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

// As links, a frame fetched this recently isn't refreshed unless forced
const FRESH_MS = 60_000;

export function collectionFramesOn(editor: Editor) {
  return editor
    .getCurrentPageShapes()
    .filter(
      (shape): shape is CollectionFrameShape => !!collectionFrameOf(shape),
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
  // The copies a frame placed, as opposed to free copies, and their frames
  const managed = computed(
    'frame-managed copies',
    () =>
      new Map(
        frames
          .get()
          .flatMap((frame) =>
            Object.values(frame.meta.collection.entries).map(
              (copyId) => [copyId as TLShapeId, frame] as const,
            ),
          ),
      ),
  );
  const ends = computed('collection frame ends', () =>
    frames.get().map((frame) => ({
      url: deps.collectionPageUrl(frame.meta.collection.collection),
      shapeIds: [frame.id],
    })),
  );
  const metaOf = (id: TLShapeId) => {
    const frame = editor.getShape(id);
    return frame ? collectionFrameOf(frame) : null;
  };
  const withMeta = (meta: CollectionFrameMeta) => ({
    [COLLECTION_META_KEY]: jsonMeta(meta),
  });
  const frameMetaOf = (frameId: TLShapeId, meta: CollectionFrameMeta) => ({
    id: frameId,
    type: 'frame' as const,
    meta: withMeta(meta),
  });
  // Shows the viewer's card, as no frame places it
  const asFree = (card: LinkCardShape): TLShapePartial<LinkCardShape> => ({
    id: card.id,
    type: LINK_CARD_TYPE,
    props: { cardId: null, h: deps.cardHeight(card.props.url, null) },
    meta: { [ENTRY_META_KEY]: null },
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
      const isCollection = !!collectionFrameOf(shape);
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
      const freeing = ids
        .map((id) => editor.getShape<LinkCardShape>(id))
        .filter(
          (card): card is LinkCardShape =>
            !!card?.props.cardId && !managed.get().has(card.id),
        )
        .map(asFree);
      if (freeing.length > 0) editor.updateShapes(freeing);
    },
  );

  // A deleted copy the frame placed, in it or dragged out, becomes a hidden
  // entry. Undo brings the copy back and unhides it in the same step.
  const unlistenDeleted = editor.sideEffects.registerAfterDeleteHandler(
    'shape',
    (shape, source) => {
      if (source !== 'user' || shape.type !== LINK_CARD_TYPE) return;
      const frame = managed.get().get(shape.id);
      if (!frame) return;
      const meta = collectionFrameOf(frame)!;
      const cardId = (shape as LinkCardShape).props.cardId!;
      const { [cardId]: _deleted, ...entries } = meta.entries;
      editor.updateShape(
        frameMetaOf(frame.id, {
          ...meta,
          entries,
          hidden: [...meta.hidden, cardId],
        }),
      );
    },
  );

  // A collection frame never holds two copies of one person's card for a
  // link, as a collection holds a card once. tldraw can't refuse a drop, so a
  // card dropped, pasted or duplicated into a frame holding that entry is put
  // just outside it. Checked once the gesture is done: tldraw moves a pasted
  // card after creating it, and a drag reparents cards as it goes.
  let arrived = new Set<TLShapeId>();
  let checking = false;
  let detached = false;
  const ownerOf = (card: LinkCardShape) =>
    entryCardOf(card.meta)?.author.id ?? deps.viewerDid;
  const isCard = (shape: TLShape | undefined): shape is LinkCardShape =>
    shape?.type === LINK_CARD_TYPE;
  function keepDuplicatesOut() {
    if (detached || arrived.size === 0 || editor.isIn('select.translating')) {
      return;
    }
    const ids = Array.from(arrived);
    arrived = new Set();
    for (const id of ids) {
      const card = editor.getShape<LinkCardShape>(id);
      const frame = card && editor.getShape(card.parentId);
      const meta = frame && collectionFrameOf(frame);
      if (!card || !meta) continue;
      const sameCard = (other: TLShape | undefined) =>
        isCard(other) &&
        other.props.url === card.props.url &&
        ownerOf(other) === ownerOf(card);
      const held = Object.values(meta.entries).some((copyId) =>
        sameCard(editor.getShape(copyId as TLShapeId)),
      );
      const duplicate =
        held &&
        editor
          .getSortedChildIdsForParent(frame.id)
          .some((child) => child !== id && sameCard(editor.getShape(child)));
      if (!duplicate) continue;
      const frameBounds = editor.getShapePageBounds(frame)!;
      const at = editor.getShapePageBounds(card)!;
      editor.reparentShapes([id], editor.getCurrentPageId());
      editor.updateShape({
        id,
        type: LINK_CARD_TYPE,
        x: frameBounds.maxX + FRAME_GAP,
        y: at.y,
      });
      deps.onAlreadyInCollection(meta.collection.name);
    }
  }
  function arrive(id: TLShapeId) {
    arrived.add(id);
    if (checking) return;
    checking = true;
    queueMicrotask(() => {
      checking = false;
      keepDuplicatesOut();
    });
  }
  const unlistenArrivedNew = editor.sideEffects.registerAfterCreateHandler(
    'shape',
    (shape, source) => {
      // Copies a frame places are its entries, never duplicates
      if (source === 'user' && isCard(shape) && !managed.get().has(shape.id)) {
        arrive(shape.id);
      }
    },
  );
  const unlistenArrivedMoved = editor.sideEffects.registerAfterChangeHandler(
    'shape',
    (prev, next, source) => {
      if (source === 'user' && isCard(next) && prev.parentId !== next.parentId)
        arrive(next.id);
    },
  );
  const stopWatchingDrags = react('keep duplicates out after a drag', () => {
    if (!editor.isIn('select.translating')) {
      unsafe__withoutCapture(keepDuplicatesOut);
    }
  });

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
      hidden: [],
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
      const page = await fetchPage(collectionId, 1).catch((error) => {
        console.warn(error);
        return null;
      });
      if (!page) {
        deps.onFailed(COLLECTION_LOAD_FAILED);
        return;
      }
      if (!deps.canPlace()) return;
      deps.onProgress({ step: 'entries', count: page.entries.length });
      await deps.fetchLinks(page.entries.map((entry) => entry.url));
      if (!deps.canPlace()) return;
      const frameId = placeFrame(page, startsBoard);
      fetchedAt.set(frameId, Date.now());
      show(frameId);
      void deps.fetchLinks([deps.collectionPageUrl(page.collection)]);
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
      if (!page) {
        if (deps.canPlace()) removeCollection(frameId);
        return;
      }
      await deps.fetchLinks(page.entries.map((entry) => entry.url));
      const meta = metaOf(frameId);
      // A refresh meanwhile put the frame back to its first page
      if (!meta || meta.pages !== before.pages || !deps.canPlace()) return;
      const frame = editor.getShape<TLFrameShape>(frameId)!;
      const placing = page.entries.filter(
        (entry) =>
          !(entry.cardId in meta.entries) &&
          !meta.hidden.includes(entry.cardId),
      );
      const headerHeight = headerHeightOf(page.collection);
      const top = Math.max(
        cardsTop(headerHeight),
        ...childBottoms(frameId).map((bottom) => bottom + FRAME_GAP),
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

  // In the frame's space
  const childBottoms = (frameId: TLShapeId) =>
    editor
      .getSortedChildIdsForParent(frameId)
      .map((id) => editor.getShape(id)!)
      .map((child) => child.y + editor.getShapeGeometry(child).bounds.maxY);

  // Remote changes, so never in undo
  const outsideUndo = (change: () => void) =>
    editor.store.mergeRemoteChanges(() =>
      editor.run(change, { history: 'ignore' }),
    );

  // Its frame goes with what's in it, and copies dragged out become free
  function removeCollection(frameId: TLShapeId) {
    const outside = Object.values(metaOf(frameId)!.entries)
      .map((id) => editor.getShape<LinkCardShape>(id as TLShapeId))
      .filter((card): card is LinkCardShape => card?.parentId !== frameId);
    outsideUndo(() => {
      editor.updateShapes(outside.map(asFree));
      editor.deleteShapes([frameId]);
    });
  }

  // Back to the first page: its new entries at the top, above what's in the
  // frame, and copies in the frame whose entries aren't on it removed
  function showFirstPage(
    frameId: TLShapeId,
    page: CollectionPage,
    write = outsideUndo,
  ) {
    const meta = metaOf(frameId)!;
    const copies = Object.entries(meta.entries).flatMap(
      ([cardId, shapeId]): FrameCopy[] => {
        const copy = editor.getShape(shapeId as TLShapeId);
        return copy
          ? [{ cardId, shapeId, inFrame: copy.parentId === frameId }]
          : [];
      },
    );
    const change = refreshFrame(meta.hidden, copies, page.entries);
    const { collection } = page;
    const headerHeight = headerHeightOf(collection);
    const top = cardsTop(headerHeight);
    const placing = layOut(change.placing, collection, top);
    const shift =
      (change.placing.length > 0 ? placing.bottom + FRAME_GAP : top) -
      cardsTop(meta.headerHeight);
    const updating = change.updating.flatMap(({ shapeId, entry }) => {
      const copy = editor.getShape<LinkCardShape>(shapeId as TLShapeId)!;
      const card = entryCard(entry, collection);
      if (JSON.stringify(entryCardOf(copy.meta)) === JSON.stringify(card)) {
        return [];
      }
      return {
        id: copy.id,
        type: LINK_CARD_TYPE,
        props: { h: deps.cardHeight(entry.url, card) },
        meta: { [ENTRY_META_KEY]: jsonMeta(card) },
      };
    });
    const entries = Object.fromEntries(
      change.ranked.map((cardId) => [
        cardId,
        placing.entries[cardId] ?? meta.entries[cardId],
      ]),
    );
    write(() => {
      editor.deleteShapes(change.removing as TLShapeId[]);
      editor.updateShapes(
        change.freeing.map((id) =>
          asFree(editor.getShape<LinkCardShape>(id as TLShapeId)!),
        ),
      );
      editor.updateShapes(updating);
      if (shift !== 0) {
        editor.updateShapes(
          editor.getSortedChildIdsForParent(frameId).map((id) => {
            const child = editor.getShape(id)!;
            return { id, type: child.type, y: child.y + shift };
          }),
        );
      }
      editor.updateShape({
        ...frameMetaOf(frameId, {
          ...meta,
          collection,
          entries,
          pages: 1,
          hasMore: page.hasMore,
          headerHeight,
        }),
        props: { name: collection.name },
      });
      placeCopies(frameId, placing);
      const h = frameHeightFor(Math.max(top, ...childBottoms(frameId)));
      const collapsed = isCollapsed(meta);
      editor.updateShape({
        ...frameMetaOf(frameId, {
          ...metaOf(frameId)!,
          expandedHeight: collapsed ? h : null,
        }),
        props: { h: collapsed ? headerHeight : h },
      });
    });
  }

  const fetchedAt = new Map<TLShapeId, number>();
  // The latest refresh of each frame, so an earlier one landing late is
  // dropped
  const refreshing = new Map<TLShapeId, number>();
  let refreshes = 0;

  async function refreshFrameNow(
    frameId: TLShapeId,
    force: boolean,
  ): Promise<FetchOutcome> {
    const meta = metaOf(frameId);
    if (!meta || !deps.canPlace()) return 'nothing-fetched';
    if (!force && Date.now() - (fetchedAt.get(frameId) ?? 0) < FRESH_MS) {
      return 'nothing-fetched';
    }
    const asked = ++refreshes;
    refreshing.set(frameId, asked);
    let page: CollectionPage | null;
    try {
      page = await fetchPage(meta.collection.id, 1);
      if (page) await deps.fetchLinks(page.entries.map((entry) => entry.url));
    } catch (error) {
      console.warn(error);
      return 'failed';
    }
    if (
      refreshing.get(frameId) !== asked ||
      !metaOf(frameId) ||
      !deps.canPlace()
    ) {
      return 'nothing-fetched';
    }
    fetchedAt.set(frameId, Date.now());
    if (page) showFirstPage(frameId, page);
    else removeCollection(frameId);
    return 'fetched';
  }

  // Every frame, or only those in view
  async function refresh(options: RefreshOptions) {
    const view = editor.getViewportPageBounds();
    const refreshed = frames
      .get()
      .filter(
        (frame) =>
          !options.inView || view.collides(editor.getShapePageBounds(frame)!),
      );
    return combineOutcomes(
      await Promise.all(
        refreshed.map((frame) => refreshFrameNow(frame.id, !!options.force)),
      ),
    );
  }

  // One step of undo with the copies it places, those still on the first
  // page, so undo hides them again
  async function showHidden(frameId: TLShapeId) {
    const before = metaOf(frameId);
    if (!before?.hidden.length || !deps.canPlace()) return;
    let page: CollectionPage | null;
    try {
      page = await fetchPage(before.collection.id, 1);
    } catch (error) {
      console.warn(error);
      deps.onFailed("Couldn't show the hidden entries. Try again.");
      return;
    }
    if (page) await deps.fetchLinks(page.entries.map((entry) => entry.url));
    const meta = metaOf(frameId);
    if (!meta || !deps.canPlace()) return;
    if (!page) {
      removeCollection(frameId);
      return;
    }
    fetchedAt.set(frameId, Date.now());
    editor.markHistoryStoppingPoint('show hidden entries');
    editor.run(() => {
      editor.updateShape(frameMetaOf(frameId, { ...meta, hidden: [] }));
      showFirstPage(frameId, page, (change) => change());
    });
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
    ends: () => ends.get(),
    // The collection whose page the URL names, on any host, if it has a frame
    nameAt(url: string) {
      const page = parseCollectionPage(url);
      if (!page) return null;
      const collection = frames
        .get()
        .map((frame) => frame.meta.collection.collection)
        .find(
          ({ handle, rkey }) => handle === page.handle && rkey === page.rkey,
        );
      return collection?.name ?? null;
    },
    open,
    loadMore,
    refresh,
    showHidden,
    toggleCollapsed,
    isLoadingMore: (frameId: TLShapeId) => loading.get().has(frameId),
    detach() {
      detached = true;
      unlistenCreated();
      unlistenComplete();
      unlistenKickout();
      unlistenDeleted();
      unlistenArrivedNew();
      unlistenArrivedMoved();
      stopWatchingDrags();
    },
  };
}

export type CollectionFrames = ReturnType<typeof attachCollectionFrames>;
