'use client';

import useGlobalFeedSeeds from '@/features/feeds/lib/queries/useGlobalFeedSeeds';

interface Props {
  candidates: string[] | undefined;
  /** True once the caller's lookup has settled. One that failed has settled on
   * no candidates — a failure is not a reason to keep waiting. */
  hasSettled: boolean;
}

/**
 * The seed URLs a recommendation query should use, or undefined while it's
 * still too early to say.
 *
 * The recommendation endpoints require at least one seed URL from an
 * authenticated caller, so a reader whose own library yields nothing is seeded
 * from recent network activity instead.
 */
export default function useSeedUrls(props: Props): string[] | undefined {
  const own = props.candidates ?? [];
  const fallback = useGlobalFeedSeeds({
    enabled: props.hasSettled && own.length === 0,
  });

  if (own.length > 0) return own;
  if (!props.hasSettled) return undefined;
  return fallback.isPending ? undefined : fallback.urls;
}
