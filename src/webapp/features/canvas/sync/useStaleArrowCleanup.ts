import { useEffect } from 'react';
import { Editor } from 'tldraw';
import { getArrowMeta, isCardShape, serverWrite } from '../lib/arrows';

// Pending or saving arrows restored from storage lost their in-flight request,
// and suggestions only live while their card is selected
export function useStaleArrowCleanup(editor: Editor) {
  useEffect(() => {
    const stale = editor.getCurrentPageShapes().filter((shape) => {
      if (isCardShape(shape)) return shape.props.ghost;
      const status = shape.type === 'arrow' && getArrowMeta(shape).status;
      return status === 'pending' || status === 'saving';
    });
    if (stale.length) {
      serverWrite(editor, () => editor.deleteShapes(stale.map((s) => s.id)));
    }
  }, [editor]);
}
