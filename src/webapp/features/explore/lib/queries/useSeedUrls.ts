'use client';

import { useState } from 'react';
import useGlobalFeedSeeds from '@/features/feeds/lib/queries/useGlobalFeedSeeds';

interface Props {
  /** Seeds from the reader's own library, undefined while the caller's lookup
   * is still in flight. */
  candidates: string[] | undefined;
  /** True once that lookup has settled. One that failed has settled on no
   * candidates — a failure is not a reason to keep waiting. */
  hasSettled: boolean;
}

interface SeedState {
  /** The set frozen by an earlier render, empty until one is. */
  frozen: string[];
  candidates: string[] | undefined;
  hasSettled: boolean;
}

/**
 * Whether the reader's own candidates have run out, leaving recent network
 * activity as the only place left to draw seeds from.
 *
 * Waits for the caller's lookup, since going to the network early would seed
 * the reader from strangers when their own library was about to answer. A
 * failed lookup has settled all the same — it arrives as undefined candidates,
 * the same shape a pending one has, which is why settling is reported
 * separately.
 */
export function needsGlobalFallback(state: SeedState): boolean {
  return (
    state.hasSettled && state.frozen.length === 0 && !state.candidates?.length
  );
}

/** The seeds to use, or undefined while it's still too early to say. */
export function resolveSeedUrls(
  state: SeedState,
  fallback: { urls: string[]; isPending: boolean },
): string[] | undefined {
  if (state.frozen.length > 0) return state.frozen;
  if (!needsGlobalFallback(state)) return undefined;
  return fallback.isPending ? undefined : fallback.urls;
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
 *
 * Undefined until the seeds settle, so callers can tell "still resolving" from
 * "resolved to none" by the value alone.
 */
export default function useSeedUrls(props: Props) {
  const [frozen, setFrozen] = useState<string[]>([]);
  if (frozen.length === 0 && props.candidates && props.candidates.length > 0) {
    setFrozen(props.candidates);
  }

  const state: SeedState = {
    frozen,
    candidates: props.candidates,
    hasSettled: props.hasSettled,
  };
  const fallback = useGlobalFeedSeeds({ enabled: needsGlobalFallback(state) });

  return resolveSeedUrls(state, fallback);
}
