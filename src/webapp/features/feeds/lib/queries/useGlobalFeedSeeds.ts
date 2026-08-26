import { useQuery } from '@tanstack/react-query';
import { ActivityType } from '@semble/types';
import { getGlobalFeed } from '../dal';
import { feedKeys } from '../feedKeys';

/**
 * Seed material for the recommendation endpoints, drawn from what the network
 * has recently saved rather than from the reader's own library.
 *
 * The recommendation endpoints do this themselves for signed-out callers, but
 * a signed-in reader with an empty library gets nothing back and has to be
 * seeded from the client instead. This mirrors the server's
 * GlobalFeedSeedService: sample the most recent card-saving activity, dedupe
 * by URL, and pick a few at random.
 */
const ACTIVITY_POOL_SIZE = 100;
const SEED_COUNT = 3;

interface Props {
  // Callers should leave this off until they know their own seeds came up
  // empty — this is a fallback, not a first choice.
  enabled?: boolean;
}

export default function useGlobalFeedSeeds(props?: Props) {
  const query = useQuery({
    queryKey: feedKeys.seeds(ACTIVITY_POOL_SIZE, SEED_COUNT),
    enabled: props?.enabled ?? true,
    queryFn: async () => {
      const feed = await getGlobalFeed({
        page: 1,
        limit: ACTIVITY_POOL_SIZE,
        activityTypes: [ActivityType.CARD_COLLECTED],
      });

      // The same card saved by several people shouldn't get extra weight in
      // the pick, so dedupe before sampling.
      const seen = new Set<string>();
      const cards = [];
      for (const activity of feed.activities) {
        if (activity.activityType !== ActivityType.CARD_COLLECTED) continue;
        const url = activity.card.url?.trim();
        if (!url || seen.has(url)) continue;
        seen.add(url);
        cards.push(activity.card);
      }

      // Picked inside the query function so the sample is cached with the
      // response — re-picking per render would reshuffle the recommendations
      // under the reader.
      const picked = pickRandom(cards, SEED_COUNT);

      return {
        urls: picked.map((card) => card.url),
        // Cards with neither title nor description can't produce a useful
        // query, the same rule the server applies to library seeds.
        queries: picked
          .map((card) =>
            [
              card.cardContent.title?.trim(),
              card.cardContent.description?.trim(),
            ]
              .filter(Boolean)
              .join(' '),
          )
          .filter((query) => query.length > 0),
      };
    },
    // The sample is deliberately arbitrary; re-rolling it on refocus would
    // swap the recommendations out from under the reader.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return {
    urls: query.data?.urls ?? [],
    queries: query.data?.queries ?? [],
    isPending: query.isPending,
    error: query.error,
  };
}

function pickRandom<T>(items: T[], count: number): T[] {
  if (items.length <= count) {
    return items;
  }
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, count);
}
