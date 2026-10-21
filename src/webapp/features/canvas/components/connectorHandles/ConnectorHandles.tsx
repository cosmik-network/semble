import { useState } from 'react';
import { TLShapeId, useEditor, useValue, Vec, VecLike } from 'tldraw';
import { createUserArrow, isCardShape } from '../../lib/arrows';
import { isNodeShape } from '../../lib/nodes';
import { useCanvasSession } from '../../lib/canvasSession';
import styles from './ConnectorHandles.module.css';

// Hovering this close to a card or collection keeps its handles up so they can be reached
const HOVER_MARGIN = 16;
const MIN_DRAG = 24;

interface Drag {
  fromId: TLShapeId;
  handle: number;
  start: VecLike;
  current: VecLike;
}

export default function ConnectorHandles() {
  const editor = useEditor();
  const session = useCanvasSession();
  const [drag, setDrag] = useState<Drag | null>(null);

  const hovered = useValue(
    'connector card',
    () => {
      if (!editor.isIn('select.idle') || session.quickAdd.get()) return null;
      const point = editor.inputs.getCurrentPagePoint();
      const shape = editor.getShapeAtPoint(point, {
        hitInside: true,
        hitFrameInside: true,
        margin: HOVER_MARGIN / editor.getZoomLevel(),
        filter: (s) => isNodeShape(s) && !(isCardShape(s) && s.props.ghost),
      });
      const b = shape && editor.getShapePageBounds(shape);
      if (!shape || !b) return null;
      const points = [
        { x: b.midX, y: b.minY },
        { x: b.maxX, y: b.midY },
        { x: b.midX, y: b.maxY },
        { x: b.minX, y: b.midY },
      ];
      return {
        id: shape.id,
        points: points.map((page) => ({
          page,
          view: editor.pageToViewport(page),
        })),
      };
    },
    [editor, session],
  );

  const preview = useValue(
    'connector preview',
    () => {
      if (!drag) return null;
      const shape = editor.getShapeAtPoint(drag.current, {
        hitInside: true,
        hitFrameInside: true,
        // A card and the collection holding it can't be connected
        filter: (s) =>
          isNodeShape(s) &&
          s.id !== drag.fromId &&
          !editor.hasAncestor(s, drag.fromId) &&
          !editor.hasAncestor(drag.fromId, s.id),
      });
      const b = shape && editor.getShapePageBounds(shape);
      const zoom = editor.getZoomLevel();
      return {
        from: editor.pageToViewport(drag.start),
        to: editor.pageToViewport(drag.current),
        target:
          shape && b
            ? {
                id: shape.id,
                ...editor.pageToViewport(b.point),
                w: b.w * zoom,
                h: b.h * zoom,
              }
            : null,
      };
    },
    [editor, drag],
  );

  const toPage = (e: React.PointerEvent) =>
    editor.screenToPage({ x: e.clientX, y: e.clientY });

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    e.stopPropagation();
    const end = toPage(e);
    const targetId = preview?.target?.id;
    setDrag(null);
    if (targetId) {
      createUserArrow(editor, drag.fromId, targetId);
    } else if (Vec.Dist(drag.start, end) * editor.getZoomLevel() > MIN_DRAG) {
      session.quickAdd.set({ point: end, connectFrom: drag.fromId });
    }
  };

  // While dragging, only the grabbed handle stays mounted: it holds the pointer capture
  const handles = drag
    ? [
        {
          key: drag.handle,
          page: drag.start,
          view: preview?.from,
          fromId: drag.fromId,
        },
      ]
    : (hovered?.points.map((p, i) => ({ key: i, ...p, fromId: hovered.id })) ??
      []);

  return (
    <>
      {preview && (
        <svg className={styles.preview}>
          <line
            className={styles.line}
            x1={preview.from.x}
            y1={preview.from.y}
            x2={preview.to.x}
            y2={preview.to.y}
          />
          {preview.target && (
            <rect
              className={styles.target}
              x={preview.target.x - 4}
              y={preview.target.y - 4}
              width={preview.target.w + 8}
              height={preview.target.h + 8}
              rx={14}
            />
          )}
        </svg>
      )}
      {handles.map(
        (h) =>
          h.view && (
            <div
              key={h.key}
              className={styles.dot}
              data-dragging={drag ? true : undefined}
              style={{ left: h.view.x, top: h.view.y }}
              title="Drag to connect"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                setDrag({
                  fromId: h.fromId,
                  handle: h.key,
                  start: h.page,
                  current: toPage(e),
                });
              }}
              onPointerMove={(e) => {
                if (!drag) return;
                e.stopPropagation();
                setDrag({ ...drag, current: toPage(e) });
              }}
              onPointerUp={onPointerUp}
              onPointerCancel={() => setDrag(null)}
            />
          ),
      )}
    </>
  );
}
