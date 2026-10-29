import { useState, type PointerEvent } from 'react';
import { getPointerInfo, useEditor, useValue, type TLShapeId } from 'tldraw';
import classes from './EdgeDots.module.css';

const EDGES = ['top', 'right', 'bottom', 'left'] as const;
type Edge = (typeof EDGES)[number];

// An arrow binds only to a card under the press, and half of each dot hangs
// off the card, so the press is moved this far inside
const INSET = 12;

// How far a dot reaches past the card's edge, hovered, in page units
export const EDGE_DOT_REACH = 10;

interface Props {
  cardId: TLShapeId;
}

// Pressing a dot starts an arrow from the card, as the arrow tool would
export default function EdgeDots(props: Props) {
  const editor = useEditor();
  // A dot hangs past the card's hover area, so it stays while it's pointed at
  const [isOnDot, setIsOnDot] = useState(false);
  const shown = useValue(
    'edge dots',
    () =>
      (isOnDot || editor.getHoveredShapeId() === props.cardId) &&
      editor.isIn('select.idle') &&
      !editor.getIsReadonly(),
    [editor, props.cardId, isOnDot],
  );
  if (!shown) return null;

  function startArrow(edge: Edge, event: PointerEvent) {
    const bounds = editor.getShapePageBounds(props.cardId);
    if (!bounds) return;
    const inside = {
      top: { x: bounds.midX, y: bounds.minY + INSET },
      right: { x: bounds.maxX - INSET, y: bounds.midY },
      bottom: { x: bounds.midX, y: bounds.maxY - INSET },
      left: { x: bounds.minX + INSET, y: bounds.midY },
    }[edge];
    const point = editor.pageToScreen(inside);
    // Marks the event handled, so the board doesn't dispatch it again
    const info = getPointerInfo(event);
    // Moves and the release still go to the board
    const canvas = event.currentTarget.closest('.tl-canvas');
    canvas?.setPointerCapture(event.pointerId);
    editor.setCurrentTool('arrow');
    editor.dispatch({
      ...info,
      type: 'pointer',
      name: 'pointer_down',
      target: 'canvas',
      point: { x: point.x, y: point.y, z: info.point.z },
    });
    // The dots go while the arrow is drawn, without a pointerleave
    setIsOnDot(false);
    // A press that never drags leaves the arrow tool waiting, so the select
    // tool comes back
    const pressEnded = () => {
      window.removeEventListener('pointerup', pressEnded);
      window.removeEventListener('pointercancel', pressEnded);
      setTimeout(() => {
        if (editor.isIn('arrow.idle')) editor.setCurrentTool('select');
      });
    };
    window.addEventListener('pointerup', pressEnded);
    window.addEventListener('pointercancel', pressEnded);
  }

  return EDGES.map((edge) => (
    <div
      key={edge}
      className={classes.dot}
      data-edge={edge}
      onPointerEnter={() => setIsOnDot(true)}
      onPointerLeave={() => setIsOnDot(false)}
      onPointerDown={(event) => startArrow(edge, event)}
    />
  ));
}
