import { useEditor, useValue } from 'tldraw';
import AddConnectionModal from '@/features/connections/components/addConnectionModal/AddConnectionModal';
import { isCardShape } from '../../lib/arrows';
import { useCanvasSession } from '../../lib/canvasSession';

// The webapp's connect flow; once saved, connection sync draws the arrow if both cards are here
export default function ConnectOverlay() {
  const editor = useEditor();
  const session = useCanvasSession();
  const url = useValue(
    'connect card url',
    () => {
      const id = session.connectShapeId.get();
      const shape = id ? editor.getShape(id) : undefined;
      return isCardShape(shape) ? shape.props.url : null;
    },
    [editor, session],
  );

  if (!url) return null;

  return (
    <AddConnectionModal
      isOpen
      onClose={() => session.connectShapeId.set(null)}
      sourceUrl={url}
      zIndex={1000}
    />
  );
}
