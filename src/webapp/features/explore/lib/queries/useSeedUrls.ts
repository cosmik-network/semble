'use client';

import { useState } from 'react';
import useGlobalFeedSeeds from '@/features/feeds/lib/queries/useGlobalFeedSeeds';

interface Props {
  /** Seed URLs derived from the reader's own library; empty while resolving. */
  candidates: string[];
  /** True while the caller is still resolving its candidates. */
  isPending: boolean;
}

/**
 * Settles on the seed URLs a recommendation query should use.
 *
 * Two things happen here. The first non-empty set is frozen, so a background
 * refetch of the source query doesn't swap the seeds — and the whole
 * recommended list — out from under the reader. And when the reader's own
 * library yields nothing at all, seeds are drawn from recent network activity
 * instead: the recommendation endpoints require at least one seed URL from an
 * authenticated caller, so without this a reader who hasn't saved anything yet
 * would get no recommendations anywhere.
 */
export default function useSeedUrls(props: Props) {
  const [frozen, setFrozen] = useState<string[]>([]);
  if (frozen.length === 0 && props.candidates.length > 0) {
    setFrozen(props.candidates);
  }

  const needsFallback =
    !props.isPending && frozen.length === 0 && props.candidates.length === 0;
  const fallback = useGlobalFeedSeeds({ enabled: needsFallback });

  return {
    urls: frozen.length > 0 ? frozen : fallback.urls,
    isPending: props.isPending || (needsFallback && fallback.isPending),
  };
}
