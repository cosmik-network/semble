import { useEffect, useEffectEvent } from 'react';
import { notifications } from '@mantine/notifications';
import { Editor, TLParentId, TLShapeId } from 'tldraw';
import useAddCard from '@/features/cards/lib/mutations/useAddCard';
import useUpdateCardAssociations from '@/features/cards/lib/mutations/useUpdateCardAssociations';
import { CARD_TYPE } from '../const';
import type { CardShape } from '../shapes/cardShape/CardShapeUtil';
import { isCardShape, serverWrite } from '../lib/arrows';
import type { CanvasSession } from '../lib/canvasSession';
import {
  getCollectionIdOfParent,
  isCollectionShape,
  isFrameShape,
  setUrlHidden,
} from '../lib/frames';
import { getCardCopies } from '../lib/nodes';

// Lets drag-in/drag-out bounces and quick undos cancel out before writing
const SETTLE_MS = 800;

export function useFrameCollectionSync(editor: Editor, session: CanvasSession) {
  const updateAssociations = useUpdateCardAssociations();
  const addCard = useAddCard();

  // Collections are read at flush time, so removing a frame never empties its collection
  const syncCard = useEffectEvent(async (id: TLShapeId, from: TLParentId) => {
    const shape = editor.getShape(id);
    if (!isCardShape(shape) || shape.props.ghost) return;
    const url = shape.props.url;
    // Putting a card back into a collection undoes hiding it there
    if (isCollectionShape(editor.getShape(shape.parentId as TLShapeId))) {
      setUrlHidden(editor, shape.parentId as TLShapeId, url, false);
    }
    // Another copy of the card can keep it in a collection, or already have put it there
    const otherCopyIn = (collectionId: string | null | undefined) =>
      !!collectionId &&
      getCardCopies(editor, shape.props.url).some(
        (c) =>
          c.id !== id &&
          getCollectionIdOfParent(editor, c.parentId) === collectionId,
      );
    const fromId = getCollectionIdOfParent(editor, from);
    const toId = getCollectionIdOfParent(editor, shape.parentId);
    if (fromId === toId) return;
    const fromCollection = otherCopyIn(fromId) ? undefined : fromId;
    const toCollection = otherCopyIn(toId) ? undefined : toId;
    if (!fromCollection && !toCollection) return;
    // Not the user's card, so it can't be taken out on the server; just hide it there
    if (fromCollection && !shape.props.cardId) {
      setUrlHidden(editor, from as TLShapeId, url, true);
      if (!toCollection) return;
    }

    try {
      if (shape.props.cardId) {
        await session.track(
          url,
          updateAssociations.mutateAsync({
            cardId: shape.props.cardId,
            addToCollectionIds: toCollection ? [toCollection] : undefined,
            removeFromCollectionIds: fromCollection
              ? [fromCollection]
              : undefined,
          }),
        );
      } else if (toCollection) {
        const saved = await session.track(
          url,
          addCard.mutateAsync({ url, collectionIds: [toCollection] }),
        );
        serverWrite(editor, () => {
          if (!editor.getShape(id)) return;
          editor.updateShape({
            id,
            type: CARD_TYPE,
            props: { cardId: saved.urlCardId, status: 'ready' },
          });
        });
      }
    } catch {
      serverWrite(editor, () => {
        if (
          editor.getShape(id) &&
          (from === editor.getCurrentPageId() ||
            editor.getShape(from as TLShapeId))
        ) {
          editor.reparentShapes([id], from);
        }
      });
      notifications.show({
        message: 'Could not update the collection.',
        color: 'red',
        position: 'top-center',
      });
    }
  });

  // Deleting a card inside a collection takes it out of the collection, unless the
  // collection itself is going too
  const removeDeleted = useEffectEvent(
    async (card: CardShape, collectionShapeId: TLShapeId) => {
      const collection = editor.getShape(collectionShapeId);
      if (!isCollectionShape(collection)) return;
      const url = card.props.url;
      const stillThere = getCardCopies(editor, url).some(
        (c) => c.parentId === collection.id,
      );
      if (stillThere) return;
      if (!card.props.cardId || collection.props.readOnly) {
        setUrlHidden(editor, collection.id, url, true);
        return;
      }
      try {
        await session.track(
          url,
          updateAssociations.mutateAsync({
            cardId: card.props.cardId,
            removeFromCollectionIds: [collection.props.collectionId],
          }),
        );
      } catch {
        setUrlHidden(editor, collection.id, url, true);
        notifications.show({
          message: 'Could not remove it from the collection.',
          color: 'red',
          position: 'top-center',
        });
      }
    },
  );

  useEffect(() => {
    const moves = new Map<TLShapeId, TLParentId>();
    // Links held busy from the move until it's written, so library sync can't undo it
    const held = new Map<TLShapeId, string>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const record = (id: TLShapeId, url: string, from: TLParentId) => {
      if (moves.has(id)) return;
      moves.set(id, from);
      if (!held.has(id)) {
        held.set(id, url);
        session.begin(url);
      }
    };
    const release = (id: TLShapeId) => {
      const url = held.get(id);
      if (url === undefined) return;
      held.delete(id);
      session.end(url);
    };

    const flush = () => {
      if (!editor.isIn('select.idle')) {
        schedule();
        return;
      }
      const entries = Array.from(moves);
      moves.clear();
      entries.forEach(([id, from]) =>
        syncCard(id, from).finally(() => release(id)),
      );
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(flush, SETTLE_MS);
    };

    const disposers = [
      editor.sideEffects.registerAfterChangeHandler(
        'shape',
        (prev, next, source) => {
          if (source !== 'user' || !isCardShape(next)) return;
          if (prev.parentId === next.parentId) return;
          record(next.id, next.props.url, prev.parentId);
          schedule();
        },
      ),
      editor.sideEffects.registerAfterDeleteHandler(
        'shape',
        (shape, source) => {
          if (source !== 'user' || !isCardShape(shape) || shape.props.ghost) {
            return;
          }
          const parentId = shape.parentId as TLShapeId;
          if (!isCollectionShape(editor.getShape(parentId))) return;
          // Wait for the rest of the delete, which may include the collection
          queueMicrotask(() => removeDeleted(shape, parentId));
        },
      ),
      editor.sideEffects.registerAfterCreateHandler(
        'shape',
        (shape, source) => {
          if (source !== 'user') return;
          // A card pasted or duplicated straight into a collection joins it
          if (
            isCardShape(shape) &&
            shape.parentId !== editor.getCurrentPageId()
          ) {
            record(shape.id, shape.props.url, editor.getCurrentPageId());
            schedule();
            return;
          }
          if (isFrameShape(shape)) {
            session.pendingFrameId.set(shape.id);
            return;
          }
          // A collection can only be on the canvas once; drop pasted or duplicated copies
          if (!isCollectionShape(shape)) return;
          const isDuplicate = editor
            .getCurrentPageShapes()
            .some(
              (s) =>
                s.id !== shape.id &&
                isCollectionShape(s) &&
                s.props.collectionId === shape.props.collectionId,
            );
          if (isDuplicate) {
            queueMicrotask(() =>
              serverWrite(editor, () => editor.deleteShape(shape.id)),
            );
            notifications.show({
              message: 'This collection is already on the canvas.',
              position: 'top-center',
            });
          }
        },
      ),
    ];

    return () => {
      clearTimeout(timer);
      Array.from(held.keys()).forEach(release);
      disposers.forEach((dispose) => dispose());
    };
  }, [editor, session]);
}
