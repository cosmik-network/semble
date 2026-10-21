import { useEffect, useEffectEvent } from 'react';
import { Editor, TLShapeId } from 'tldraw';
import useAddCard from '@/features/cards/lib/mutations/useAddCard';
import { getCardFromMyLibrary, getUrlMetadata } from '@/features/cards/lib/dal';
import { CARD_H, CARD_TYPE, CARD_W } from '../const';
import { isCardShape, serverWrite } from '../lib/arrows';
import type { CanvasSession } from '../lib/canvasSession';
import { cardShapeId } from '../lib/ids';
import { getCardCopies, newCardId, sharedCardProps } from '../lib/nodes';
import {
  getCollectionIdOfParent,
  isCollectionShape,
  isFrameShape,
} from '../lib/frames';

export function useExternalUrlContent(editor: Editor, session: CanvasSession) {
  const addCard = useAddCard();

  // Fills in a new card's details; it's only saved when it lands in a collection
  const fillCard = useEffectEvent(async (id: TLShapeId, url: string) => {
    const parentId = editor.getShape(id)?.parentId;
    const collectionId = parentId && getCollectionIdOfParent(editor, parentId);
    const [metadata, library] = await Promise.allSettled([
      getUrlMetadata({ url }),
      collectionId
        ? session
            .track(
              url,
              addCard.mutateAsync({ url, collectionIds: [collectionId] }),
            )
            .then((saved) => ({ cardId: saved.urlCardId, note: '' }))
        : getCardFromMyLibrary(url).then((status) => ({
            cardId: status.card?.id ?? '',
            note: status.card?.note?.text ?? '',
          })),
    ]);
    serverWrite(editor, () => {
      if (!editor.getShape(id)) return;
      const meta =
        metadata.status === 'fulfilled' ? metadata.value.metadata : undefined;
      const saved = library.status === 'fulfilled' ? library.value : null;
      editor.updateShape({
        id,
        type: CARD_TYPE,
        props: {
          title: meta?.title ?? '',
          description: meta?.description ?? '',
          imageUrl: meta?.imageUrl ?? '',
          siteName: meta?.siteName ?? '',
          cardId: saved?.cardId ?? '',
          ...(saved?.note && { note: saved.note }),
          status: collectionId && !saved ? 'error' : 'ready',
        },
      });
    });
  });

  useEffect(() => {
    // Dropping or pasting a card that's already on the canvas places another copy of it
    editor.registerExternalContentHandler('url', ({ url, point }) => {
      // A suggestion being added for real is replaced by a saved card
      const suggestion = editor.getShape(cardShapeId(url));
      if (isCardShape(suggestion) && suggestion.props.ghost) {
        serverWrite(editor, () => editor.deleteShape(suggestion.id));
      }
      const sibling = getCardCopies(editor, url).find(
        (s) => s.props.status === 'ready',
      );

      const id = newCardId(editor, url);
      const center = point ?? editor.getViewportPageBounds().center;
      editor.markHistoryStoppingPoint('add card');
      editor.createShape({
        id,
        type: CARD_TYPE,
        x: center.x - CARD_W / 2,
        y: center.y - CARD_H / 2,
        props: sibling ? { ...sharedCardProps(sibling), url } : { url },
      });
      const container = editor.getShapeAtPoint(center, {
        hitInside: true,
        hitFrameInside: true,
        filter: (s) =>
          (isFrameShape(s) || isCollectionShape(s)) &&
          editor.getShapeUtil(s).canReceiveNewChildrenOfType(s, CARD_TYPE),
      });
      if (container && sibling) {
        // An already-saved copy joins the collection the way a dragged-in card does
        editor.reparentShapes([id], container.id);
      } else if (container) {
        // Not a user move, so collection sync doesn't also add it
        serverWrite(editor, () => editor.reparentShapes([id], container.id));
      }
      editor.select(id);
      if (!sibling) fillCard(id, url);
    });

    // Cards left loading by a reload never got their save confirmed
    for (const shape of editor.getCurrentPageShapes()) {
      if (isCardShape(shape) && shape.props.status === 'loading') {
        fillCard(shape.id, shape.props.url);
      }
    }

    const stopKeep = editor.sideEffects.registerAfterChangeHandler(
      'shape',
      (prev, next) => {
        if (!isCardShape(prev) || !isCardShape(next)) return;
        if (prev.props.ghost && !next.props.ghost) {
          fillCard(next.id, next.props.url);
        }
      },
    );

    return () => {
      editor.registerExternalContentHandler('url', null);
      stopKeep();
    };
  }, [editor, session]);
}
