import { Editor, TLArrowBinding, TLShapeId } from 'tldraw';
import { getArrowEnds, getArrowMeta, isCardShape } from './arrows';

const TRAIL_ANIMATION = { animation: { duration: 500 } };

// Connection arrows leaving a card, as [arrow target] pairs; unsaved arrows don't count
function outgoing(editor: Editor, cardId: TLShapeId) {
  return editor
    .getBindingsToShape<TLArrowBinding>(cardId, 'arrow')
    .filter((b) => b.props.terminal === 'start')
    .flatMap((b) => {
      const arrow = editor.getShape(b.fromId);
      if (!arrow || !getArrowMeta(arrow).connectionId) return [];
      const ends = getArrowEnds(editor, arrow.id);
      return ends && isCardShape(ends.target) ? [ends.target.id] : [];
    });
}

const byPosition = (editor: Editor) => (a: TLShapeId, b: TLShapeId) => {
  const pa = editor.getShapePageBounds(a)!;
  const pb = editor.getShapePageBounds(b)!;
  return pa.y - pb.y || pa.x - pb.x;
};

// Follows outgoing connections depth first, nearest-to-top branches first
export function trailFrom(editor: Editor, startId: TLShapeId) {
  const order: TLShapeId[] = [];
  const seen = new Set<TLShapeId>();
  const visit = (id: TLShapeId) => {
    if (seen.has(id)) return;
    seen.add(id);
    order.push(id);
    outgoing(editor, id).sort(byPosition(editor)).forEach(visit);
  };
  visit(startId);
  return order;
}

// Orders selected cards so connected ones come after their sources, else left to right
export function trailFromSelection(editor: Editor) {
  const ids = editor
    .getSelectedShapes()
    .filter((s) => isCardShape(s) && !s.props.ghost)
    .map((s) => s.id);
  const inSet = new Set(ids);
  const indegree = new Map(ids.map((id) => [id, 0]));
  const edges = new Map(
    ids.map((id) => [id, outgoing(editor, id).filter((t) => inSet.has(t))]),
  );
  edges.forEach((targets) =>
    targets.forEach((t) => indegree.set(t, indegree.get(t)! + 1)),
  );

  const leftToRight = (a: TLShapeId, b: TLShapeId) => {
    const pa = editor.getShapePageBounds(a)!;
    const pb = editor.getShapePageBounds(b)!;
    return pa.x - pb.x || pa.y - pb.y;
  };
  const order: TLShapeId[] = [];
  const remaining = new Set(ids);
  while (remaining.size) {
    const ready = Array.from(remaining).filter((id) => !indegree.get(id));
    // Cycles: take the leftmost card and carry on
    const next = (ready.length ? ready : Array.from(remaining)).sort(
      leftToRight,
    )[0];
    remaining.delete(next);
    order.push(next);
    edges.get(next)!.forEach((t) => indegree.set(t, indegree.get(t)! - 1));
  }
  return order;
}

export function focusTrailStep(editor: Editor, id: TLShapeId) {
  const bounds = editor.getShapePageBounds(id);
  if (!bounds) return;
  editor.selectNone();
  editor.zoomToBounds(bounds, {
    inset: 160,
    targetZoom: 1.25,
    ...TRAIL_ANIMATION,
  });
}
