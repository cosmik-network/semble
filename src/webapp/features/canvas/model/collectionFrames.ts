import type { VecLike } from 'tldraw';
import type { CollectionEntry, CollectionInfo } from '../server/canvasServer';
import { LINK_CARD_WIDTH, type TextFont } from './linkCards';

// Entries a frame loads when placed, and each Load more adds
export const COLLECTION_PAGE_SIZE = 10;

// In a collection frame's meta. A frame without it is one the user drew.
export interface CollectionFrameMeta {
  collection: CollectionInfo;
  // Each entry the frame placed (its card id) and its copy's shape id, most
  // recent first. A copy made from one of them isn't in it, so it starts out
  // free.
  entries: Record<string, string>;
  // Entries whose copies were deleted on this board, which refreshes skip
  hidden: string[];
  pages: number;
  hasMore: boolean;
  // Fits the collection's name and description
  headerHeight: number;
  // While collapsed, the height it opens back to
  expandedHeight: number | null;
}

export const COLLECTION_META_KEY = 'collection';

export function collectionFrameMeta(meta: object): CollectionFrameMeta | null {
  const value = (meta as Record<string, unknown>)[COLLECTION_META_KEY];
  // Frames placed before entries could be hidden have no list
  if (!value) return null;
  const frame = value as CollectionFrameMeta;
  return { ...frame, hidden: frame.hidden ?? [] };
}

export const collectionFrameOf = (shape: { type: string; meta: object }) =>
  shape.type === 'frame' ? collectionFrameMeta(shape.meta) : null;

// Where a frame's connections point. Injected so tests fix the app's host.
export type CollectionPageUrl = (collection: {
  handle: string;
  rkey: string;
}) => string;

export const isCollapsed = (meta: CollectionFrameMeta) =>
  meta.expandedHeight !== null;

export interface CollectionFrameFooter {
  shown: number;
  total: number;
  canLoadMore: boolean;
  hidden: number;
}

export const frameFooter = (
  meta: CollectionFrameMeta,
): CollectionFrameFooter => {
  const total = meta.collection.cardCount;
  return {
    shown: meta.hasMore
      ? Math.min(meta.pages * COLLECTION_PAGE_SIZE, total)
      : total,
    total,
    canLoadMore: meta.hasMore,
    hidden: meta.hidden.length,
  };
};

export const FRAME_PADDING = 24;
export const FRAME_GAP = 24;
const FRAME_COLUMNS = 4;
// Its text sits about a padding below the cards, as they sit below the header
export const FRAME_FOOTER_HEIGHT = 64;
export const COLLECTION_FRAME_WIDTH =
  FRAME_PADDING * 2 +
  FRAME_COLUMNS * LINK_CARD_WIDTH +
  (FRAME_COLUMNS - 1) * FRAME_GAP;

// The header follows the collection page's: a "Collection" label over the
// name with the author beside them, then the description cut to three lines
// at a readable width, and the card count. The face lays its rows out with
// these sizes.
export const FRAME_DESCRIPTION_FONT: TextFont = {
  fontSize: 14,
  fontWeight: 400,
  lineHeight: 1.55,
  richText: true,
};
export const FRAME_DESCRIPTION_LINES = 3;
export const FRAME_DESCRIPTION_WIDTH = 700;
export const HEADER_PADDING = 20;
export const HEADER_LABEL_HEIGHT = 24;
export const HEADER_TITLE_HEIGHT = 34;
export const HEADER_DESCRIPTION_MARGIN = 10;
const DESCRIPTION_LINE = 22;
export const HEADER_STATS_MARGIN = 10;
export const HEADER_STATS_HEIGHT = 20;

export function frameHeaderHeight(descriptionLines: number) {
  const lines = Math.min(descriptionLines, FRAME_DESCRIPTION_LINES);
  return (
    HEADER_PADDING +
    HEADER_LABEL_HEIGHT +
    HEADER_TITLE_HEIGHT +
    (lines ? HEADER_DESCRIPTION_MARGIN + DESCRIPTION_LINE * lines : 0) +
    HEADER_STATS_MARGIN +
    HEADER_STATS_HEIGHT +
    HEADER_PADDING
  );
}

// Each card goes in the shortest column, starting at top. Points are the
// cards' top-left corners in the frame; bottom is below the lowest card.
export function layOutColumns(heights: number[], top: number) {
  const columns = Array.from({ length: FRAME_COLUMNS }, () => top);
  const at = heights.map((h): VecLike => {
    const column = columns.indexOf(Math.min(...columns));
    const point = {
      x: FRAME_PADDING + column * (LINK_CARD_WIDTH + FRAME_GAP),
      y: columns[column],
    };
    columns[column] += h + FRAME_GAP;
    return point;
  });
  const used = heights.length > 0 ? Math.max(...columns) - FRAME_GAP : top;
  return { at, bottom: used };
}

export const cardsTop = (headerHeight: number) => headerHeight + FRAME_PADDING;

export const frameHeightFor = (cardsBottom: number) =>
  cardsBottom + FRAME_FOOTER_HEIGHT;

// A copy a frame placed, as the board has it
export interface FrameCopy {
  cardId: string;
  shapeId: string;
  inFrame: boolean;
}

export interface FrameRefresh {
  // On the first page, not on the board and not hidden, most recent first
  placing: CollectionEntry[];
  // Kept copies whose entries are on the first page, to show it as it is now
  updating: { shapeId: string; entry: CollectionEntry }[];
  removing: string[];
  // Dragged out of the frame, and their entries left the collection
  freeing: string[];
  // The entries the frame keeps or places, most recent first: the first
  // page's, then those dragged out that slid off it
  ranked: string[];
}

// Puts a frame back to the collection's first page. A copy dragged out of the
// frame whose entry isn't on it is freed only once an entry ranked below it
// still is: the entry left the collection rather than slid down.
export function refreshFrame(
  hidden: string[],
  copies: FrameCopy[],
  firstPage: CollectionEntry[],
): FrameRefresh {
  const onPage = new Map(firstPage.map((entry) => [entry.cardId, entry]));
  const onBoard = new Set(copies.map((copy) => copy.cardId));
  const result: FrameRefresh = {
    placing: firstPage.filter(
      ({ cardId }) => !onBoard.has(cardId) && !hidden.includes(cardId),
    ),
    updating: [],
    removing: [],
    freeing: [],
    ranked: [],
  };
  const slidOff: string[] = [];
  copies.forEach((copy, i) => {
    const entry = onPage.get(copy.cardId);
    if (entry) result.updating.push({ shapeId: copy.shapeId, entry });
    else if (copy.inFrame) result.removing.push(copy.shapeId);
    else if (copies.slice(i + 1).some(({ cardId }) => onPage.has(cardId))) {
      result.freeing.push(copy.shapeId);
    } else slidOff.push(copy.cardId);
  });
  const placing = new Set(result.placing.map(({ cardId }) => cardId));
  result.ranked = [
    ...firstPage
      .map(({ cardId }) => cardId)
      .filter((cardId) => onBoard.has(cardId) || placing.has(cardId)),
    ...slidOff,
  ];
  return result;
}
