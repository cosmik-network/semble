export interface LayoutNode {
  id: string;
  w: number;
  h: number;
}

export interface LayoutEdge {
  from: string;
  to: string;
}

export type LayoutPositions = Map<string, { x: number; y: number }>;

const COL_GAP = 140;
const ROW_GAP = 40;

// Left-to-right layered layout: longest-path ranks, barycenter ordering,
// unconnected nodes in a grid underneath. Positions are top-left corners.
export function layeredLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
): LayoutPositions {
  const ids = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter(
    (e) => e.from !== e.to && ids.has(e.from) && ids.has(e.to),
  );
  const dag = breakCycles(nodes, validEdges);

  const connected = new Set(validEdges.flatMap((e) => [e.from, e.to]));
  const ranked = nodes.filter((n) => connected.has(n.id));
  const isolated = nodes.filter((n) => !connected.has(n.id));

  const rank = longestPathRanks(ranked, dag);
  const layers: string[][] = [];
  ranked.forEach((n) => (layers[rank.get(n.id)!] ??= []).push(n.id));

  orderByBarycenter(layers, dag);

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const colW = Math.max(0, ...nodes.map((n) => n.w)) + COL_GAP;
  const positions: LayoutPositions = new Map();
  let maxBottom = 0;

  layers.forEach((layer, col) => {
    const heights = layer.map((id) => byId.get(id)!.h);
    const total =
      heights.reduce((a, b) => a + b, 0) + ROW_GAP * (layer.length - 1);
    let y = -total / 2;
    layer.forEach((id, i) => {
      positions.set(id, { x: col * colW, y });
      y += heights[i] + ROW_GAP;
    });
    maxBottom = Math.max(maxBottom, total / 2);
  });

  const gridTop = positions.size ? maxBottom + ROW_GAP * 3 : 0;
  const perRow = Math.max(1, Math.ceil(Math.sqrt(isolated.length)));
  const rowH = Math.max(0, ...isolated.map((n) => n.h)) + ROW_GAP;
  isolated.forEach((n, i) => {
    positions.set(n.id, {
      x: (i % perRow) * colW,
      y: gridTop + Math.floor(i / perRow) * rowH,
    });
  });

  return positions;
}

function breakCycles(nodes: LayoutNode[], edges: LayoutEdge[]) {
  const out = new Map<string, string[]>();
  edges.forEach((e) =>
    (out.get(e.from) ?? out.set(e.from, []).get(e.from)!).push(e.to),
  );

  const state = new Map<string, 'visiting' | 'done'>();
  const dag: LayoutEdge[] = [];

  const visit = (start: string) => {
    const stack: [string, number][] = [[start, 0]];
    state.set(start, 'visiting');
    while (stack.length) {
      const top = stack[stack.length - 1];
      const [id, i] = top;
      const next = out.get(id)?.[i];
      if (next === undefined) {
        state.set(id, 'done');
        stack.pop();
        continue;
      }
      top[1]++;
      // Back edges would form a cycle, so they are left out of ranking
      if (state.get(next) === 'visiting') continue;
      dag.push({ from: id, to: next });
      if (!state.has(next)) {
        state.set(next, 'visiting');
        stack.push([next, 0]);
      }
    }
  };

  nodes.forEach((n) => {
    if (!state.has(n.id)) visit(n.id);
  });
  return dag;
}

function longestPathRanks(nodes: LayoutNode[], dag: LayoutEdge[]) {
  const indegree = new Map(nodes.map((n) => [n.id, 0]));
  const out = new Map<string, string[]>();
  dag.forEach((e) => {
    indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
    (out.get(e.from) ?? out.set(e.from, []).get(e.from)!).push(e.to);
  });

  const rank = new Map(nodes.map((n) => [n.id, 0]));
  const queue = nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
  while (queue.length) {
    const id = queue.shift()!;
    for (const next of out.get(id) ?? []) {
      rank.set(next, Math.max(rank.get(next)!, rank.get(id)! + 1));
      indegree.set(next, indegree.get(next)! - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  return rank;
}

function orderByBarycenter(layers: string[][], dag: LayoutEdge[]) {
  const preds = new Map<string, string[]>();
  const succs = new Map<string, string[]>();
  dag.forEach((e) => {
    (preds.get(e.to) ?? preds.set(e.to, []).get(e.to)!).push(e.from);
    (succs.get(e.from) ?? succs.set(e.from, []).get(e.from)!).push(e.to);
  });

  const index = new Map<string, number>();
  const reindex = (layer: string[]) =>
    layer.forEach((id, i) => index.set(id, i));
  layers.forEach(reindex);

  const sortBy = (layer: string[], neighbors: Map<string, string[]>) => {
    const score = (id: string) => {
      const ns = (neighbors.get(id) ?? []).filter((n) => index.has(n));
      if (!ns.length) return index.get(id)!;
      return ns.reduce((sum, n) => sum + index.get(n)!, 0) / ns.length;
    };
    const scores = new Map(layer.map((id) => [id, score(id)]));
    layer.sort((a, b) => scores.get(a)! - scores.get(b)!);
    reindex(layer);
  };

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < layers.length; i++) sortBy(layers[i], preds);
    for (let i = layers.length - 2; i >= 0; i--) sortBy(layers[i], succs);
  }
}

// Card slots inside a frame in frame-local coordinates, each card going to the
// shortest column, plus the frame size that fits them
export function masonryLayout(
  heights: number[],
  cellW: number,
  opts: {
    pad: number;
    gap: number;
    maxCols: number;
    minH: number;
    // Space reserved above the cards, e.g. for a header
    top?: number;
  },
) {
  const top = opts.top ?? 0;
  const cols = Math.max(
    1,
    Math.min(opts.maxCols, Math.ceil(Math.sqrt(heights.length))),
  );
  const bottoms = Array<number>(cols).fill(top + opts.pad);
  const slots = heights.map((h) => {
    const col = bottoms.indexOf(Math.min(...bottoms));
    const slot = { x: opts.pad + col * (cellW + opts.gap), y: bottoms[col] };
    bottoms[col] += h + opts.gap;
    return slot;
  });
  const contentH = heights.length
    ? Math.max(...bottoms) - opts.gap
    : top + opts.pad;
  return {
    slots,
    w: opts.pad * 2 + cols * cellW + (cols - 1) * opts.gap,
    h: Math.max(opts.minH, contentH + opts.pad),
  };
}

const RING_GAP = 80;

// Root in the middle, everything else on rings by hop distance (edges treated
// as undirected); unreachable nodes go in a grid below
export function radialLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  rootId: string,
): LayoutPositions {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, string[]>();
  edges.forEach((e) => {
    if (!byId.has(e.from) || !byId.has(e.to) || e.from === e.to) return;
    (adj.get(e.from) ?? adj.set(e.from, []).get(e.from)!).push(e.to);
    (adj.get(e.to) ?? adj.set(e.to, []).get(e.to)!).push(e.from);
  });

  const positions: LayoutPositions = new Map();
  const root = byId.get(rootId);
  if (!root) return positions;

  const parent = new Map<string, string>();
  const rings: string[][] = [[rootId]];
  const seen = new Set([rootId]);
  for (let d = 0; rings[d]?.length; d++) {
    for (const id of rings[d]) {
      for (const next of adj.get(id) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        parent.set(next, id);
        (rings[d + 1] ??= []).push(next);
      }
    }
  }

  const step = Math.max(...nodes.map((n) => Math.max(n.w, n.h))) + RING_GAP;
  const angle = new Map([[rootId, 0]]);
  const place = (id: string, cx: number, cy: number) => {
    const n = byId.get(id)!;
    positions.set(id, { x: cx - n.w / 2, y: cy - n.h / 2 });
  };
  place(rootId, 0, 0);

  rings.slice(1).forEach((ring, i) => {
    // Children sit near their parent's angle so edges cross less
    ring.sort(
      (a, b) => angle.get(parent.get(a)!)! - angle.get(parent.get(b)!)!,
    );
    const radius = step * (i + 1);
    // Rings with more nodes than fit get pushed out
    const fit = Math.max(radius, (ring.length * step) / (2 * Math.PI));
    ring.forEach((id, j) => {
      const a = (2 * Math.PI * j) / ring.length;
      angle.set(id, a);
      place(id, Math.cos(a) * fit, Math.sin(a) * fit);
    });
  });

  const rest = nodes.filter((n) => !seen.has(n.id));
  const bottom = Math.max(
    ...Array.from(positions.entries()).map(([id, p]) => p.y + byId.get(id)!.h),
  );
  const grid = gridPositions(rest, bottom + RING_GAP * 2);
  grid.forEach((p, id) => positions.set(id, p));
  return positions;
}

// Each group packed into its own block of columns, blocks in rows
export function clusterLayout(groups: LayoutNode[][]): LayoutPositions {
  const positions: LayoutPositions = new Map();
  const blocks = groups
    .filter((g) => g.length)
    .sort((a, b) => b.length - a.length)
    .map((group) => {
      const cols = Math.max(1, Math.ceil(Math.sqrt(group.length)));
      const colW = Math.max(...group.map((n) => n.w));
      const bottoms = Array<number>(cols).fill(0);
      const local = group.map((n) => {
        const col = bottoms.indexOf(Math.min(...bottoms));
        const p = { id: n.id, x: col * (colW + ROW_GAP), y: bottoms[col] };
        bottoms[col] += n.h + ROW_GAP;
        return p;
      });
      return {
        local,
        w: cols * colW + (cols - 1) * ROW_GAP,
        h: Math.max(...bottoms) - ROW_GAP,
      };
    });

  const perRow = Math.max(1, Math.ceil(Math.sqrt(blocks.length)));
  let x = 0;
  let y = 0;
  let rowH = 0;
  blocks.forEach((block, i) => {
    if (i > 0 && i % perRow === 0) {
      x = 0;
      y += rowH + COL_GAP;
      rowH = 0;
    }
    block.local.forEach((p) => positions.set(p.id, { x: x + p.x, y: y + p.y }));
    x += block.w + COL_GAP;
    rowH = Math.max(rowH, block.h);
  });
  return positions;
}

function gridPositions(nodes: LayoutNode[], top: number): LayoutPositions {
  const positions: LayoutPositions = new Map();
  const perRow = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const colW = Math.max(0, ...nodes.map((n) => n.w)) + ROW_GAP;
  const rowH = Math.max(0, ...nodes.map((n) => n.h)) + ROW_GAP;
  nodes.forEach((n, i) =>
    positions.set(n.id, {
      x: (i % perRow) * colW,
      y: top + Math.floor(i / perRow) * rowH,
    }),
  );
  return positions;
}
