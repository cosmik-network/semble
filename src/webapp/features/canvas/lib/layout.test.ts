import { describe, expect, it } from 'vitest';
import {
  clusterLayout,
  layeredLayout,
  masonryLayout,
  radialLayout,
} from './layout';

const node = (id: string) => ({ id, w: 200, h: 80 });

describe('layeredLayout', () => {
  it('places a chain left to right', () => {
    const pos = layeredLayout(
      [node('c'), node('a'), node('b')],
      [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
      ],
    );
    expect(pos.get('a')!.x).toBeLessThan(pos.get('b')!.x);
    expect(pos.get('b')!.x).toBeLessThan(pos.get('c')!.x);
  });

  it('terminates on cycles and positions every node', () => {
    const pos = layeredLayout(
      [node('a'), node('b'), node('c')],
      [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'a' },
      ],
    );
    expect(pos.size).toBe(3);
    expect(new Set(Array.from(pos.values()).map((p) => p.x)).size).toBe(3);
  });

  it('puts unconnected nodes below the graph without overlap', () => {
    const pos = layeredLayout(
      [node('a'), node('b'), node('x'), node('y')],
      [{ from: 'a', to: 'b' }],
    );
    const graphBottom = Math.max(pos.get('a')!.y, pos.get('b')!.y) + 80;
    expect(pos.get('x')!.y).toBeGreaterThan(graphBottom);
    expect(pos.get('x')).not.toEqual(pos.get('y'));
  });

  it('stacks siblings in the same column without overlap', () => {
    const pos = layeredLayout(
      [node('root'), node('a'), node('b')],
      [
        { from: 'root', to: 'a' },
        { from: 'root', to: 'b' },
      ],
    );
    expect(pos.get('a')!.x).toBe(pos.get('b')!.x);
    expect(Math.abs(pos.get('a')!.y - pos.get('b')!.y)).toBeGreaterThanOrEqual(
      80,
    );
  });

  it('ignores self loops and edges to unknown nodes', () => {
    const pos = layeredLayout(
      [node('a')],
      [
        { from: 'a', to: 'a' },
        { from: 'a', to: 'missing' },
      ],
    );
    expect(pos.get('a')).toEqual({ x: 0, y: 0 });
  });
});

describe('masonryLayout', () => {
  const opts = { pad: 10, gap: 5, maxCols: 3, minH: 60 };

  it('drops each card into the shortest column and fits the frame', () => {
    const grid = masonryLayout([100, 20, 20, 20], 50, opts);
    expect(grid.slots).toEqual([
      { x: 10, y: 10 },
      { x: 65, y: 10 },
      { x: 65, y: 35 },
      { x: 65, y: 60 },
    ]);
    expect(grid.w).toBe(10 * 2 + 2 * 50 + 5);
    expect(grid.h).toBe(10 + 100 + 10);
  });

  it('starts cards below a reserved header', () => {
    const grid = masonryLayout([20], 50, { ...opts, top: 40 });
    expect(grid.slots[0]).toEqual({ x: 10, y: 50 });
    expect(grid.h).toBe(40 + 10 + 20 + 10);
  });

  it('keeps a minimum frame when empty', () => {
    const grid = masonryLayout([], 50, opts);
    expect(grid.slots).toEqual([]);
    expect(grid.w).toBe(70);
    expect(grid.h).toBe(60);
  });
});

describe('radialLayout', () => {
  const center = (p: { x: number; y: number }) => ({
    x: p.x + 100,
    y: p.y + 40,
  });

  it('centres the root and puts neighbours on the first ring', () => {
    const pos = radialLayout(
      [node('r'), node('a'), node('b')],
      [
        { from: 'r', to: 'a' },
        { from: 'b', to: 'r' },
      ],
      'r',
    );
    expect(center(pos.get('r')!)).toEqual({ x: 0, y: 0 });
    const da = Math.hypot(center(pos.get('a')!).x, center(pos.get('a')!).y);
    const db = Math.hypot(center(pos.get('b')!).x, center(pos.get('b')!).y);
    expect(da).toBeCloseTo(db);
    expect(da).toBeGreaterThan(200);
  });

  it('puts two-hop nodes further out', () => {
    const pos = radialLayout(
      [node('r'), node('a'), node('c')],
      [
        { from: 'r', to: 'a' },
        { from: 'a', to: 'c' },
      ],
      'r',
    );
    const dist = (id: string) =>
      Math.hypot(center(pos.get(id)!).x, center(pos.get(id)!).y);
    expect(dist('c')).toBeGreaterThan(dist('a'));
  });

  it('places unreachable nodes below', () => {
    const pos = radialLayout(
      [node('r'), node('a'), node('x')],
      [{ from: 'r', to: 'a' }],
      'r',
    );
    expect(pos.get('x')!.y).toBeGreaterThan(pos.get('a')!.y);
    expect(pos.size).toBe(3);
  });
});

describe('clusterLayout', () => {
  it('keeps each group together without overlaps', () => {
    const pos = clusterLayout([
      [node('a1'), node('a2'), node('a3'), node('a4')],
      [node('b1')],
    ]);
    expect(pos.size).toBe(5);
    const rects = Array.from(pos.values()).map((p) => ({
      ...p,
      w: 200,
      h: 80,
    }));
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const overlap =
          a.x < b.x + b.w &&
          a.x + a.w > b.x &&
          a.y < b.y + b.h &&
          a.y + a.h > b.y;
        expect(overlap).toBe(false);
      }
    }
    const aMaxX = Math.max(
      ...['a1', 'a2', 'a3', 'a4'].map((id) => pos.get(id)!.x + 200),
    );
    expect(pos.get('b1')!.x).toBeGreaterThanOrEqual(aMaxX);
  });
});
