import {
  createShapeId,
  Editor,
  TLArrowBinding,
  TLArrowShape,
  TLShape,
  TLShapeId,
  TLShapePartial,
  toRichText,
} from 'tldraw';
import { ConnectionType } from '@semble/types';
import {
  CONNECTION_TYPES,
  NON_DIRECTIONAL_CONNECTION_TYPES,
} from '@/features/connections/const/connectionTypes';
import { CARD_TYPE, CONNECTION_TYPE_COLOR } from '../const';
import type { CardShape } from '../shapes/cardShape/CardShapeUtil';
import type { ArrowMeta, ArrowStatus, CanvasConnection } from '../types';
import { connectionArrowId } from './ids';
import { findNodeShapes, isNodeShape, NodeShape } from './nodes';

export const isCardShape = (
  shape: TLShape | null | undefined,
): shape is CardShape => shape?.type === CARD_TYPE;

export const getArrowMeta = (shape: TLShape): ArrowMeta =>
  shape.meta as ArrowMeta;

// Writes that mirror server state: not undoable, and ignored by sync handlers
export function serverWrite(editor: Editor, fn: () => void) {
  editor.store.mergeRemoteChanges(() => {
    editor.run(fn, { history: 'ignore', ignoreShapeLock: true });
  });
}

// The cards or collections an arrow joins, unless one sits inside the other
// or both are copies of the same card
export function getArrowEnds(editor: Editor, arrowId: TLShapeId) {
  const bindings = editor.getBindingsFromShape<TLArrowBinding>(
    arrowId,
    'arrow',
  );
  const startId = bindings.find((b) => b.props.terminal === 'start')?.toId;
  const endId = bindings.find((b) => b.props.terminal === 'end')?.toId;
  if (!startId || !endId || startId === endId) return null;

  const source = editor.getShape(startId);
  const target = editor.getShape(endId);
  if (!isNodeShape(source) || !isNodeShape(target)) return null;
  if (
    (isCardShape(source) &&
      isCardShape(target) &&
      source.props.url === target.props.url) ||
    editor.hasAncestor(source, target.id) ||
    editor.hasAncestor(target, source.id)
  ) {
    return null;
  }
  return { source, target };
}

export const getConnectionLabel = (type: ConnectionType) =>
  CONNECTION_TYPES.find((t) => t.value === type)?.label ?? type;

export function arrowStyle(
  type: ConnectionType | undefined,
  status: ArrowStatus,
): Partial<TLArrowShape['props']> {
  if (!type || status === 'pending' || status === 'saving') {
    return {
      font: 'sans',
      size: 's',
      color: 'grey',
      labelColor: 'grey',
      dash: 'dashed',
      arrowheadEnd: 'triangle',
      richText: toRichText(status === 'saving' ? 'Saving…' : ''),
    };
  }

  const color = CONNECTION_TYPE_COLOR[type];
  return {
    font: 'sans',
    size: 's',
    color,
    labelColor: color,
    dash: status === 'ghost' ? 'dotted' : 'solid',
    arrowheadEnd: NON_DIRECTIONAL_CONNECTION_TYPES.has(type)
      ? 'none'
      : 'triangle',
    richText: toRichText(getConnectionLabel(type)),
  };
}

// Draws a server connection between one pair of copies; call inside serverWrite
function upsertArrowBetween(
  editor: Editor,
  connection: CanvasConnection,
  status: 'saved' | 'ghost',
  source: NodeShape,
  target: NodeShape,
) {
  const id = connectionArrowId(connection.id, source.id, target.id);
  const meta: ArrowMeta = {
    status,
    connectionId: connection.id,
    sourceId: source.id,
    targetId: target.id,
  };
  const style = arrowStyle(connection.type, status);
  const existing = editor.getShape<TLArrowShape>(id);

  if (!existing) {
    const s = editor.getShapePageBounds(source)!.center;
    const t = editor.getShapePageBounds(target)!.center;
    editor.createShape<TLArrowShape>({
      id,
      type: 'arrow',
      x: s.x,
      y: s.y,
      isLocked: status === 'ghost',
      opacity: status === 'ghost' ? 0.5 : 1,
      meta: { ...meta },
      props: {
        ...style,
        start: { x: 0, y: 0 },
        end: { x: t.x - s.x, y: t.y - s.y },
      },
    });
  } else {
    const partial: TLShapePartial<TLArrowShape> = {
      id,
      type: 'arrow',
      isLocked: status === 'ghost',
      opacity: status === 'ghost' ? 0.5 : 1,
      meta: { ...meta },
      props: style,
    };
    editor.updateShape(partial);
  }

  const ends = getArrowEnds(editor, id);
  if (ends?.source.id === source.id && ends.target.id === target.id) return id;

  const stale = editor.getBindingsFromShape(id, 'arrow').map((b) => b.id);
  if (stale.length) editor.deleteBindings(stale);
  editor.createBindings(
    (['start', 'end'] as const).map((terminal) => ({
      type: 'arrow' as const,
      fromId: id,
      toId: terminal === 'start' ? source.id : target.id,
      props: {
        terminal,
        normalizedAnchor: { x: 0.5, y: 0.5 },
        isPrecise: false,
        isExact: false,
        snap: 'none' as const,
      },
    })),
  );
  return id;
}

const canJoin = (editor: Editor, a: NodeShape, b: NodeShape) =>
  a.id !== b.id && !editor.hasAncestor(a, b.id) && !editor.hasAncestor(b, a.id);

// Draws a server connection between every pair of copies of its ends; call inside serverWrite
export function upsertConnectionArrows(
  editor: Editor,
  connection: CanvasConnection,
  status: 'saved' | 'ghost',
) {
  const sources = findNodeShapes(editor, connection.sourceUrl);
  const targets = findNodeShapes(editor, connection.targetUrl);
  return sources.flatMap((source) =>
    targets
      .filter((target) => canJoin(editor, source, target))
      .map((target) =>
        upsertArrowBetween(editor, connection, status, source, target),
      ),
  );
}

// Redraws one pair's arrow if both copies are still there; call inside serverWrite
export function restoreConnectionArrow(
  editor: Editor,
  connection: CanvasConnection,
  status: 'saved' | 'ghost',
  meta: ArrowMeta,
) {
  const source = meta.sourceId && editor.getShape(meta.sourceId);
  const target = meta.targetId && editor.getShape(meta.targetId);
  if (!isNodeShape(source) || !isNodeShape(target)) return false;
  if (!canJoin(editor, source, target)) return false;
  upsertArrowBetween(editor, connection, status, source, target);
  return true;
}

// Draws an arrow between two cards or collections as if the user did; arrow sync then asks for its type
export function createUserArrow(
  editor: Editor,
  fromId: TLShapeId,
  toId: TLShapeId,
) {
  const s = editor.getShapePageBounds(fromId)?.center;
  const t = editor.getShapePageBounds(toId)?.center;
  if (!s || !t || fromId === toId) return;
  const id = createShapeId();
  editor.markHistoryStoppingPoint('connect cards');
  editor.run(() => {
    editor.createShape<TLArrowShape>({
      id,
      type: 'arrow',
      x: s.x,
      y: s.y,
      props: { start: { x: 0, y: 0 }, end: { x: t.x - s.x, y: t.y - s.y } },
    });
    editor.createBindings(
      (['start', 'end'] as const).map((terminal) => ({
        type: 'arrow' as const,
        fromId: id,
        toId: terminal === 'start' ? fromId : toId,
        props: {
          terminal,
          normalizedAnchor: { x: 0.5, y: 0.5 },
          isPrecise: false,
          isExact: false,
          snap: 'none' as const,
        },
      })),
    );
  });
}

// Connections can be hidden board-wide or per card copy; one being drawn always shows
export function isConnectionArrowHidden(
  editor: Editor,
  shape: TLShape,
  hiddenEverywhere: boolean,
) {
  if (shape.type !== 'arrow') return false;
  const status = getArrowMeta(shape).status;
  if (!status || status === 'pending') return false;
  if (hiddenEverywhere) return true;
  return editor
    .getBindingsFromShape<TLArrowBinding>(shape.id, 'arrow')
    .some((b) => {
      const end = editor.getShape(b.toId);
      return isCardShape(end) && end.props.hideConnections;
    });
}
