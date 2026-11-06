import { useEditor, useValue, type TLArrowShape } from 'tldraw';
import {
  arrowMiddle,
  connectionOf,
} from '../../shapes/connectionArrow/connectionArrows';
import { detailLevel } from '../../shapes/detailLevel';
import ArrowPill from './ArrowPill';

// The selected connection arrow's pill and note, in the overlays so other
// arrows and cards can't cover them
export default function SelectedArrowPill() {
  const editor = useEditor();
  const shown = useValue(
    'selected arrow pill',
    () => {
      const shape = editor.getOnlySelectedShape();
      const connection = shape && connectionOf(shape);
      if (!shape || !connection?.connectionType) return null;
      if (detailLevel(editor) !== 'full' || editor.isShapeHidden(shape)) {
        return null;
      }
      const middle = arrowMiddle(editor, shape as TLArrowShape);
      if (!middle) return null;
      return {
        arrowId: shape.id,
        connection,
        type: connection.connectionType,
        middle: editor.getShapePageTransform(shape).applyToPoint(middle),
      };
    },
    [editor],
  );
  if (!shown) return null;

  return (
    <ArrowPill
      arrowId={shown.arrowId}
      type={shown.type}
      own={shown.connection.own}
      note={shown.connection.note ?? null}
      showNote
      middle={shown.middle}
    />
  );
}
