import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import type { Editor, VecLike } from 'tldraw';
import { Collection } from '@semble/types';
import { getCollectionPageById } from '@/features/collections/lib/dal';
import { COLLECTION_SEED_LIMIT } from '../const';
import { useCanvasSession } from './canvasSession';
import { placeCollection } from './frames';

export function useAddCollectionToCanvas(editor: Editor | null) {
  const session = useCanvasSession();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const add = async (
    collection: Pick<Collection, 'id' | 'cardCount'>,
    point?: VecLike,
  ) => {
    if (!editor) return;
    setLoadingId(collection.id);
    try {
      // By id: resolving the author's handle to a DID can fail where the id lookup won't
      const page = await getCollectionPageById(collection.id, {
        limit: COLLECTION_SEED_LIMIT,
      });
      placeCollection(editor, page, page.urlCards, session.userId, point);

      if (page.pagination.hasMore) {
        notifications.show({
          message: `Showing the first ${page.urlCards.length} of ${page.cardCount} cards.`,
          position: 'top-center',
        });
      }
    } catch {
      notifications.show({
        message: 'Could not load collection.',
        color: 'red',
        position: 'top-center',
      });
    } finally {
      setLoadingId(null);
    }
  };

  return { add, loadingId };
}
