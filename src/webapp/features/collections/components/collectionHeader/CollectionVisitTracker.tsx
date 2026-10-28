'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Collection } from '@semble/types';
import { useAuth } from '@/hooks/useAuth';
import { useNavHistory } from '@/providers/navHistory';
import { resolveEntrySource } from '@/features/analytics/pageVisit';
import { startCollectionVisit } from '../../lib/analytics';

interface Props {
  collection: Collection;
  rkey: string;
}

/**
 * Starts the analytics visit for a collection page and cleans `ref` from the
 * URL. Lives in the layout, so switching tabs keeps the same visit.
 */
export default function CollectionVisitTracker(props: Props) {
  const startedForRef = useRef<string | null>(null);
  const searchParams = useSearchParams();
  const entryRef = searchParams.get('ref');
  const { user, isAuthenticated, isLoading } = useAuth();
  const { canGoBack } = useNavHistory();
  const { collection } = props;

  // One visit per collection. Waits for auth so is_logged_in and is_owner
  // are accurate.
  useEffect(() => {
    const collectionId = collection.uri ?? collection.id;
    if (isLoading || startedForRef.current === collectionId) return;
    startedForRef.current = collectionId;

    startCollectionVisit(props.rkey, {
      collection_id: collectionId,
      is_logged_in: isAuthenticated,
      is_owner: !!user && user.id === collection.author.id,
      entry_source: resolveEntrySource(entryRef, canGoBack),
      card_count: collection.cardCount,
    });

    if (entryRef) {
      const params = new URLSearchParams(window.location.search);
      params.delete('ref');
      const qs = params.toString();
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${qs ? `?${qs}` : ''}`,
      );
    }
  }, [
    isLoading,
    isAuthenticated,
    user,
    canGoBack,
    entryRef,
    collection,
    props.rkey,
  ]);

  return null;
}
