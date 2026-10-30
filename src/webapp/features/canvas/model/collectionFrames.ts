import type { VecLike } from 'tldraw';
import type { CollectionInfo } from '../server/canvasServer';
import { LINK_CARD_WIDTH, type TextFont } from './linkCards';

// Entries a frame loads when placed, and each Load more adds
export const COLLECTION_PAGE_SIZE = 10;

// In a collection frame's meta. A frame without it is one the user drew.
export interface CollectionFrameMeta {
  collection: CollectionInfo;
  // Each entry the frame placed (its card id) and its copy's shape id. A
  // copy made from one of them isn't in it, so it starts out free.
  entries: Record<string, string>;
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
  return value ? (value as CollectionFrameMeta) : null;
}

export const isCollapsed = (meta: CollectionFrameMeta) =>
  meta.expandedHeight !== null;

export interface CollectionFrameFooter {
  shown: number;
  total: number;
  canLoadMore: boolean;
}

export const frameFooter = (
  meta: CollectionFrameMeta,
): CollectionFrameFooter => ({
  shown: Object.keys(meta.entries).length,
  total: meta.collection.cardCount,
  canLoadMore: meta.hasMore,
});

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
