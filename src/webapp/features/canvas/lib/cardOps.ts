import { Box, Editor, TLShapeId, VecLike } from 'tldraw';
import { UrlMetadata } from '@semble/types';
import { CARD_H, CARD_TYPE, CARD_W, FLY_IN_MS, PLACE_GAP } from '../const';
import type { CardShape } from '../shapes/cardShape/CardShapeUtil';
import { isCardShape, serverWrite } from './arrows';
import { cardShapeId } from './ids';
import { getCardCopies } from './nodes';
import { columnSlots, Rect, Side } from './placement';

export interface PlaceItem {
  url: string;
  metadata?: Partial<UrlMetadata>;
  note?: string;
}

export const metadataProps = (metadata: Partial<UrlMetadata>) => ({
  title: metadata.title ?? '',
  description: metadata.description ?? '',
  imageUrl: metadata.imageUrl ?? '',
  siteName: metadata.siteName ?? '',
});

// Top-level shapes new cards should not be dropped on
export function getOccupiedRects(editor: Editor): Rect[] {
  const pageId = editor.getCurrentPageId();
  return editor
    .getCurrentPageShapes()
    .filter((s) => s.parentId === pageId && s.type !== 'arrow')
    .flatMap((s) => {
      const b = editor.getShapePageBounds(s);
      return b ? [{ x: b.x, y: b.y, w: b.w, h: b.h }] : [];
    });
}

// Starts a just-created card at `from` (page space) and glides it to where it was placed
export function flyIn(editor: Editor, id: TLShapeId, from: VecLike) {
  const shape = editor.getShape(id);
  const bounds = shape && editor.getShapePageBounds(shape);
  if (!shape || !bounds) return;
  const dx = from.x - bounds.midX;
  const dy = from.y - bounds.midY;
  serverWrite(editor, () =>
    editor.updateShape({
      id,
      type: shape.type,
      x: shape.x + dx,
      y: shape.y + dy,
    }),
  );
  editor.animateShape(
    { id, type: shape.type, x: shape.x, y: shape.y },
    { animation: { duration: FLY_IN_MS } },
  );
}

// Pans or zooms out so new cards are in view as they land; never zooms in
export function revealRects(editor: Editor, rects: Box[]) {
  if (!rects.length) return;
  const target = Box.Common(rects);
  const viewport = editor.getViewportPageBounds();
  if (viewport.contains(target)) return;
  editor.zoomToBounds(target, {
    inset: 80,
    targetZoom: editor.getZoomLevel(),
    animation: { duration: FLY_IN_MS },
  });
}

// Goes through the URL handler, so the card is saved and lands in any container under it.
// A card already on the canvas is shown instead; drag it in to place a copy.
export async function addCardAt(
  editor: Editor,
  item: PlaceItem,
  point: VecLike,
  from?: VecLike,
) {
  const existing = getCardCopies(editor, item.url)[0];
  if (existing) {
    editor.select(existing.id);
    editor.zoomToSelection({ animation: { duration: 300 } });
    return existing.id;
  }

  // With no saved copies around, the new card takes the URL's own id
  const id = cardShapeId(item.url);
  await editor.putExternalContent({ type: 'url', url: item.url, point });
  const created = editor.getShape<CardShape>(id);
  if (created && from) flyIn(editor, id, from);
  if (created?.props.status === 'loading' && (item.metadata || item.note)) {
    serverWrite(editor, () =>
      editor.updateShape({
        id,
        type: CARD_TYPE,
        props: {
          ...(item.metadata && metadataProps(item.metadata)),
          note: item.note ?? '',
        },
      }),
    );
  }
  return id;
}

export function addCardsNear(
  editor: Editor,
  anchorId: TLShapeId,
  items: PlaceItem[],
  side: Side,
) {
  const anchor = editor.getShapePageBounds(anchorId);
  if (!anchor) return [];
  const fresh = items.filter((item) => !isOnCanvas(editor, item.url));
  const slots = columnSlots(
    anchor,
    fresh.map(() => ({ w: CARD_W, h: CARD_H })),
    getOccupiedRects(editor),
    side,
    PLACE_GAP,
  );
  editor.markHistoryStoppingPoint('add cards');
  const targets = slots.map((slot) => new Box(slot.x, slot.y, CARD_W, CARD_H));
  revealRects(editor, [anchor, ...targets]);
  fresh.forEach((item, i) =>
    addCardAt(editor, item, targets[i].center, anchor.center),
  );
  return fresh;
}

export const isOnCanvas = (editor: Editor, url: string) =>
  getCardCopies(editor, url).length > 0;
