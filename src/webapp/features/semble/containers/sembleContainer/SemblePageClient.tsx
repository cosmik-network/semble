'use client';

import { useRef, useEffect } from 'react';
import { buildSembleQuery } from '@/lib/utils/link';
import { useAuth } from '@/hooks/useAuth';
import { useNavHistory } from '@/providers/navHistory';
import { hasStartedSembleVisit, startSembleVisit } from '../../lib/analytics';
import { resolveEntrySource } from '@/features/analytics/pageVisit';

interface Props {
  /** The page's subject url. Omitted on embeds, which start no visit. */
  url?: string;
  viaCardId?: string;
  entryRef?: string;
  children: React.ReactNode;
}

/**
 * Client wrapper that starts the analytics visit and cleans viaCardId and ref
 * from the URL after server captures them.
 * Uses children prop pattern to maintain server component status for nested components.
 */
export default function SemblePageClient(props: Props) {
  const cleanedUrlRef = useRef(false);
  const visitStartedRef = useRef(false);
  const { isAuthenticated, isLoading } = useAuth();
  const { canGoBack } = useNavHistory();

  // Clean URL on mount if viaCardId or ref exists
  useEffect(() => {
    if ((props.viaCardId || props.entryRef) && !cleanedUrlRef.current) {
      const params = new URLSearchParams(window.location.search);
      window.history.replaceState(
        null,
        '',
        buildSembleQuery(params, { omit: ['viaCardId', 'ref'] }),
      );
      cleanedUrlRef.current = true;
    }
  }, [props.viaCardId, props.entryRef]);

  // One visit per mount; the page remounts per url. Waits for auth so
  // is_logged_in is accurate.
  useEffect(() => {
    if (!props.url || isLoading || visitStartedRef.current) return;
    visitStartedRef.current = true;

    startSembleVisit({
      url: props.url,
      is_logged_in: isAuthenticated,
      entry_source: resolveEntrySource(
        props.entryRef,
        canGoBack || hasStartedSembleVisit(),
      ),
    });
  }, [isLoading, isAuthenticated, canGoBack, props.url, props.entryRef]);

  return <>{props.children}</>;
}
