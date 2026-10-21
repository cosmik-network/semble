import { describe, expect, it } from 'vitest';
import { columnSlots } from './placement';

const anchor = { x: 0, y: 0, w: 100, h: 100 };
const size = { w: 100, h: 50 };

describe('columnSlots', () => {
  it('stacks items beside the anchor, centred on it', () => {
    const slots = columnSlots(anchor, [size, size], [], 'right', 40);
    expect(slots).toEqual([
      { x: 140, y: 50 - 62 },
      { x: 140, y: 50 - 62 + 74 },
    ]);
  });

  it('places the column on the left', () => {
    const [slot] = columnSlots(anchor, [size], [], 'left', 40);
    expect(slot.x).toBe(-140);
  });

  it('moves outwards past occupied space', () => {
    const blocker = { x: 150, y: 0, w: 50, h: 100 };
    const [slot] = columnSlots(anchor, [size], [blocker], 'right', 40);
    expect(slot.x).toBe(280);
  });

  it('returns nothing for no items', () => {
    expect(columnSlots(anchor, [], [], 'right', 40)).toEqual([]);
  });
});
