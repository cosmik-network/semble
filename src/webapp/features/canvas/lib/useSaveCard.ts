import { notifications } from '@mantine/notifications';
import type { Editor } from 'tldraw';
import useAddCard from '@/features/cards/lib/mutations/useAddCard';
import { CARD_TYPE } from '../const';
import { serverWrite } from './arrows';
import { useCanvasSession } from './canvasSession';
import { getCardCopies } from './nodes';

// Cards on the canvas are a scratchpad until saved; saving one saves every copy
export function useSaveCard(editor: Editor) {
  const addCard = useAddCard();
  const session = useCanvasSession();

  return async (url: string, note?: string) => {
    const setSaving = (saving: boolean) =>
      session.savingUrls.update((prev) => {
        const next = new Set(prev);
        if (saving) next.add(url);
        else next.delete(url);
        return next;
      });

    setSaving(true);
    try {
      const saved = await session.track(
        url,
        addCard.mutateAsync({ url, note }),
      );
      // One copy is enough: copy sync passes it on to the rest
      const copy = getCardCopies(editor, url)[0];
      if (copy) {
        serverWrite(editor, () =>
          editor.updateShape({
            id: copy.id,
            type: CARD_TYPE,
            props: {
              cardId: saved.urlCardId,
              status: 'ready',
              ...(note !== undefined && { note }),
            },
          }),
        );
      }
      return true;
    } catch {
      notifications.show({
        message: 'Could not save this card.',
        color: 'red',
        position: 'top-center',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };
}
