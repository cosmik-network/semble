import { notifications } from '@mantine/notifications';
import { Editor, TLShapeId } from 'tldraw';
import { getSembleHref } from '@/lib/utils/link';
import { CARD_TYPE, CARD_W, CARD_W_LARGE } from '../const';
import type { CardShape, CardSize } from '../shapes/cardShape/CardShapeUtil';
import { useCanvasSession } from './canvasSession';
import { expandNeighbors, ExpandDirection } from './expandNeighbors';
import { trailFrom, trailFromSelection } from './trail';

const toast = (message: string, color?: string) =>
  notifications.show({ message, color, position: 'top-center' });

export function useCardActions(editor: Editor) {
  const session = useCanvasSession();

  const getCard = (id: TLShapeId) => editor.getShape<CardShape>(id);

  return {
    openDetails: (id: TLShapeId) => session.panelShapeId.set(id),

    startTrail: (id?: TLShapeId) => {
      const ids = id ? trailFrom(editor, id) : trailFromSelection(editor);
      if (ids.length < 2) {
        toast(
          id
            ? 'No outgoing connections to follow from this card'
            : 'Select at least two cards',
        );
        return;
      }
      session.panelShapeId.set(null);
      session.trail.set({ ids, index: 0 });
    },

    openInSemble: (id: TLShapeId) => {
      const card = getCard(id);
      if (card) window.open(getSembleHref(card.props.url), '_blank');
    },

    copyLink: async (id: TLShapeId) => {
      const card = getCard(id);
      if (!card) return;
      await navigator.clipboard.writeText(card.props.url);
      toast('Link copied');
    },

    expand: async (id: TLShapeId, direction: ExpandDirection) => {
      const card = getCard(id);
      if (!card) return;
      try {
        const res = await expandNeighbors(
          editor,
          id,
          card.props.url,
          direction,
        );
        if (!res.found) {
          toast(
            direction === 'forward'
              ? 'No outgoing connections'
              : 'No incoming connections',
          );
        } else if (res.hasMore) {
          toast('Showing the first connections. See all in the side panel.');
        }
      } catch {
        toast('Could not load connections.', 'red');
      }
    },

    toggleSimilar: (id: TLShapeId) => {
      session.similarAnchorId.update((current) => (current === id ? null : id));
    },

    setSize: (id: TLShapeId, size: CardSize) => {
      editor.markHistoryStoppingPoint('resize card');
      editor.updateShape<CardShape>({
        id,
        type: CARD_TYPE,
        props: { size, w: size === 'large' ? CARD_W_LARGE : CARD_W },
      });
    },

    toggleConnections: (id: TLShapeId) => {
      const shape = editor.getShape<CardShape>(id);
      if (!shape) return;
      editor.markHistoryStoppingPoint('toggle connections');
      editor.updateShape<CardShape>({
        id,
        type: CARD_TYPE,
        props: { hideConnections: !shape.props.hideConnections },
      });
    },

    addToCollection: (id: TLShapeId) => session.addToCollectionShapeId.set(id),

    remove: (id: TLShapeId) => {
      editor.markHistoryStoppingPoint('remove card');
      editor.deleteShape(id);
    },
  };
}
