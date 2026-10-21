import { Box, Editor, TLShape, TLShapeId, TLShapePartial } from 'tldraw';
import { getDomain } from '@/lib/utils/link';
import { getArrowEnds, isCardShape } from './arrows';
import { isCollectionShape, isFrameShape } from './frames';
import { clearStacks } from './stacks';
import {
  clusterLayout,
  layeredLayout,
  LayoutNode,
  LayoutPositions,
  radialLayout,
} from './layout';

export type LayoutMode = 'graph' | 'radial' | 'site' | 'grid';

const ANIMATION = { animation: { duration: 400 } };

const isBlock = (s: TLShape) =>
  isCardShape(s) || isFrameShape(s) || isCollectionShape(s);

// Top-level cards and containers; containers move as one block with their cards.
// A multi-selection limits the layout to the selected blocks.
function getBlocks(editor: Editor) {
  const pageId = editor.getCurrentPageId();
  const all = editor
    .getCurrentPageShapes()
    .filter((s) => s.parentId === pageId && isBlock(s));
  const selectedIds = new Set(editor.getSelectedShapeIds());
  const selected = all.filter((s) => selectedIds.has(s.id));
  return selected.length > 1 ? selected : all;
}

function getEdges(editor: Editor, blockIds: Set<TLShapeId>) {
  const pageId = editor.getCurrentPageId();
  const blockOf = (id: TLShapeId) => {
    const shape = editor.getShape(id);
    if (!shape) return undefined;
    if (shape.parentId === pageId) return shape.id;
    return editor.findShapeAncestor(shape, (a) => a.parentId === pageId)?.id;
  };
  return editor.getCurrentPageShapes().flatMap((shape) => {
    if (shape.type !== 'arrow') return [];
    const ends = getArrowEnds(editor, shape.id);
    const from = ends && blockOf(ends.source.id);
    const to = ends && blockOf(ends.target.id);
    return from && to && from !== to && blockIds.has(from) && blockIds.has(to)
      ? [{ from, to }]
      : [];
  });
}

const groupKey = (s: TLShape) =>
  isCardShape(s)
    ? (s.props.siteName || getDomain(s.props.url)).toLowerCase()
    : 'containers';

export function applyLayout(editor: Editor, mode: LayoutMode) {
  const blocks = getBlocks(editor);
  if (blocks.length < 2) return;

  const sizes = new Map(
    blocks.map((b) => {
      const bounds = editor.getShapePageBounds(b)!;
      return [b.id, { w: bounds.w, h: bounds.h }];
    }),
  );
  const nodes: LayoutNode[] = blocks.map((b) => ({
    id: b.id,
    ...sizes.get(b.id)!,
  }));
  const edges = getEdges(editor, new Set(blocks.map((b) => b.id)));

  let positions: LayoutPositions;
  if (mode === 'graph') {
    positions = layeredLayout(nodes, edges);
  } else if (mode === 'radial') {
    const selected = editor.getOnlySelectedShape();
    const selectedBlock =
      selected &&
      (selected.parentId === editor.getCurrentPageId()
        ? selected
        : editor.findShapeAncestor(
            selected,
            (a) => a.parentId === editor.getCurrentPageId(),
          ));
    const root =
      blocks.find((b) => b.id === selectedBlock?.id)?.id ??
      mostConnected(
        blocks.map((b) => b.id),
        edges,
      );
    positions = radialLayout(nodes, edges, root);
  } else if (mode === 'site') {
    const groups = new Map<string, LayoutNode[]>();
    blocks.forEach((b, i) => {
      const key = groupKey(b);
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(nodes[i]);
    });
    positions = clusterLayout(Array.from(groups.values()));
  } else {
    positions = clusterLayout([nodes]);
  }

  // Keep the layout centred where the shapes already were
  const before = Box.Common(blocks.map((b) => editor.getShapePageBounds(b)!));
  const after = Box.Common(
    blocks.map((b) => {
      const p = positions.get(b.id)!;
      const size = sizes.get(b.id)!;
      return new Box(p.x, p.y, size.w, size.h);
    }),
  );
  const dx = before.midX - after.midX;
  const dy = before.midY - after.midY;

  editor.markHistoryStoppingPoint('layout');
  clearStacks(
    editor,
    blocks.map((b) => b.id),
  );
  editor.animateShapes(
    blocks.map((b): TLShapePartial => {
      const p = positions.get(b.id)!;
      return { id: b.id, type: b.type, x: p.x + dx, y: p.y + dy };
    }),
    ANIMATION,
  );
  editor.timers.setTimeout(() => {
    const bounds = Box.Common(
      blocks.map((b) => editor.getShapePageBounds(b.id)!),
    );
    editor.zoomToBounds(bounds, { inset: 64, ...ANIMATION });
  }, 420);
}

function mostConnected(
  ids: TLShapeId[],
  edges: { from: string; to: string }[],
) {
  const degree = new Map<string, number>();
  edges.forEach((e) => {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
  });
  return ids.reduce((best, id) =>
    (degree.get(id) ?? 0) > (degree.get(best) ?? 0) ? id : best,
  );
}

export function zoomToFitAll(editor: Editor) {
  editor.zoomToFit(ANIMATION);
}
