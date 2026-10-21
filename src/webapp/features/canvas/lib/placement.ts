export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Side = 'left' | 'right';

const ROW_GAP = 24;
const MAX_SHIFTS = 12;

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// Top-left corners for a column of items beside the anchor, vertically centred
// on it and pushed outwards until the column is clear of occupied rects
export function columnSlots(
  anchor: Rect,
  sizes: { w: number; h: number }[],
  occupied: Rect[],
  side: Side,
  gap: number,
) {
  if (!sizes.length) return [];
  const colW = Math.max(...sizes.map((s) => s.w));
  const colH =
    sizes.reduce((sum, s) => sum + s.h, 0) + ROW_GAP * (sizes.length - 1);
  const top = anchor.y + anchor.h / 2 - colH / 2;
  const step = (colW + gap) * (side === 'right' ? 1 : -1);

  let x = side === 'right' ? anchor.x + anchor.w + gap : anchor.x - gap - colW;
  for (let i = 0; i < MAX_SHIFTS; i++) {
    const column = { x, y: top, w: colW, h: colH };
    if (!occupied.some((r) => overlaps(column, r))) break;
    x += step;
  }

  let y = top;
  return sizes.map((s) => {
    const slot = { x, y };
    y += s.h + ROW_GAP;
    return slot;
  });
}
