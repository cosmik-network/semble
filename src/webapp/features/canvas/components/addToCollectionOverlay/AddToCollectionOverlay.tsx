import { useEditor, useValue } from 'tldraw';
import AddCardToModal from '@/features/cards/components/addCardToModal/AddCardToModal';
import { isCardShape } from '../../lib/arrows';
import { useCanvasSession } from '../../lib/canvasSession';

export default function AddToCollectionOverlay() {
  const editor = useEditor();
  const session = useCanvasSession();
  const card = useValue(
    'add to collection card',
    () => {
      const id = session.addToCollectionShapeId.get();
      const shape = id ? editor.getShape(id) : undefined;
      return isCardShape(shape) ? shape : null;
    },
    [editor, session],
  );

  if (!card) return null;
  const p = card.props;

  return (
    <AddCardToModal
      isOpen
      onClose={() => session.addToCollectionShapeId.set(null)}
      url={p.url}
      isInYourLibrary={!!p.cardId}
      urlLibraryCount={0}
      cardContent={{
        url: p.url,
        title: p.title || undefined,
        description: p.description || undefined,
        imageUrl: p.imageUrl || undefined,
        siteName: p.siteName || undefined,
      }}
      zIndex={1000}
    />
  );
}
