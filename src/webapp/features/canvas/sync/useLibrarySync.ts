import { useEffect, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Editor, TLShapeId, useValue } from 'tldraw';
import { getCardFromMyLibrary } from '@/features/cards/lib/dal';
import { cardKeys } from '@/features/cards/lib/cardKeys';
import { getCollectionPageById } from '@/features/collections/lib/dal';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { COLLECTION_SEED_LIMIT, RECONCILE_CAP } from '../const';
import { isCardShape } from '../lib/arrows';
import type { CanvasSession } from '../lib/canvasSession';
import { isCollectionShape } from '../lib/frames';
import { applyCollectionPage, applyLibraryStatus } from '../lib/librarySync';

// One request per link and per collection, so refresh gently: on focus, then every few minutes
const REFRESH = {
  staleTime: 60_000,
  refetchInterval: 300_000,
  refetchOnWindowFocus: true,
} as const;

// Keeps the canvas in step with changes made in the webapp or on other devices
export function useLibrarySync(editor: Editor, session: CanvasSession) {
  const urlsKey = useValue(
    'library sync urls',
    () =>
      Array.from(
        new Set(
          editor
            .getCurrentPageShapes()
            .filter(isCardShape)
            .filter((s) => !s.props.ghost && s.props.status !== 'loading')
            .map((s) => s.props.url),
        ),
      )
        .sort()
        .join('\n'),
    [editor],
  );
  const urls = useMemo(
    () => (urlsKey ? urlsKey.split('\n').slice(0, RECONCILE_CAP) : []),
    [urlsKey],
  );

  const collectionsKey = useValue(
    'library sync collections',
    () =>
      editor
        .getCurrentPageShapes()
        .filter(isCollectionShape)
        .map((s) => `${s.id} ${s.props.collectionId}`)
        .sort()
        .join('\n'),
    [editor],
  );
  const collections = useMemo(
    () =>
      collectionsKey
        ? collectionsKey.split('\n').map((line) => {
            const [id, collectionId] = line.split(' ');
            return { id: id as TLShapeId, collectionId };
          })
        : [],
    [collectionsKey],
  );

  // Same keys the webapp uses, so its mutations refresh these too
  const statuses = useQueries({
    queries: urls.map((url) => ({
      queryKey: cardKeys.byUrl(url),
      queryFn: () => getCardFromMyLibrary(url),
      ...REFRESH,
    })),
  });
  const pages = useQueries({
    queries: collections.map((c) => ({
      queryKey: [...collectionKeys.collection(c.collectionId), 'canvas'],
      queryFn: () =>
        getCollectionPageById(c.collectionId, { limit: COLLECTION_SEED_LIMIT }),
      ...REFRESH,
    })),
  });

  const saving = useValue(session.savingUrls);
  const statusSignature = statuses.map((r) => r.dataUpdatedAt).join(',');
  const pageSignature = pages.map((r) => r.dataUpdatedAt).join(',');

  useEffect(() => {
    statuses.forEach((r, i) => {
      const url = urls[i];
      if (!r.data || saving.has(url)) return;
      if (session.touchedSince(url, r.dataUpdatedAt)) return;
      applyLibraryStatus(editor, url, r.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, session, statusSignature, saving]);

  useEffect(() => {
    pages.forEach((r, i) => {
      if (!r.data) return;
      const fetchedAt = r.dataUpdatedAt;
      applyCollectionPage(
        editor,
        collections[i].id,
        r.data,
        session.userId,
        (key) => saving.has(key) || session.touchedSince(key, fetchedAt),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, session, pageSignature, saving]);
}
