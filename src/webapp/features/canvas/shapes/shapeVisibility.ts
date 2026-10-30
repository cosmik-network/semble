import {
  getArrowBindings,
  type Editor,
  type TLArrowShape,
  type TLShape,
} from 'tldraw';
import { isInCollapsedFrame } from './collectionFrame/CollectionFrameShapeUtil';
import { getShapeVisibility as getArrowVisibility } from './connectionArrow/connectionArrows';

// Hidden arrows, and the cards in a collapsed collection frame with their
// arrows
export function getShapeVisibility(shape: TLShape, editor: Editor) {
  if (isInCollapsedFrame(editor, shape)) return 'hidden';
  if (shape.type === 'arrow') {
    const { start, end } = getArrowBindings(editor, shape as TLArrowShape);
    const ends = [start?.toId, end?.toId].map(
      (id) => id && editor.getShape(id),
    );
    if (ends.some((shape) => shape && isInCollapsedFrame(editor, shape))) {
      return 'hidden';
    }
  }
  return getArrowVisibility(shape, editor);
}
