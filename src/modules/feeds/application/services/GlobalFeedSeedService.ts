import { IFeedRepository } from '../../domain/IFeedRepository';
import { CardCollectedMetadata } from '../../domain/FeedActivity';
import {
  ICardQueryRepository,
  UrlCardView,
} from '../../../cards/domain/ICardQueryRepository';
import { ActivityType as ActivityTypeEnum } from '@semble/types';

export interface GlobalFeedSeedConfig {
  // How many of the most recent card-saving activities to draw the seeds from
  activityPoolSize: number;
  // How many cards to randomly pick out of that pool
  seedCount: number;
}

export const DEFAULT_GLOBAL_FEED_SEED_CONFIG: GlobalFeedSeedConfig = {
  activityPoolSize: 100,
  seedCount: 3,
};

/**
 * Picks random seed cards out of the most recent global feed activity.
 *
 * Used by the recommendation use cases when there's no authenticated caller to
 * derive seeds from: instead of a random sample of the caller's library, take a
 * random sample of what the network has recently saved. Only card-saving
 * activity is considered — connection activity carries no single card to seed
 * from.
 */
export class GlobalFeedSeedService {
  private config: GlobalFeedSeedConfig;

  constructor(
    private feedRepository: IFeedRepository,
    private cardQueryRepository: ICardQueryRepository,
    config?: Partial<GlobalFeedSeedConfig>,
  ) {
    this.config = { ...DEFAULT_GLOBAL_FEED_SEED_CONFIG, ...config };
  }

  /**
   * Returns up to `seedCount` randomly picked cards from the most recent
   * `activityPoolSize` card-saving activities. Returns an empty array when the
   * feed is empty or none of the activities resolve to a card.
   */
  async getSeedCards(
    overrides?: Partial<GlobalFeedSeedConfig>,
  ): Promise<UrlCardView[]> {
    const { activityPoolSize, seedCount } = { ...this.config, ...overrides };

    const feedResult = await this.feedRepository.getGlobalFeed({
      page: 1,
      limit: activityPoolSize,
      activityTypes: [ActivityTypeEnum.CARD_COLLECTED],
    });
    if (feedResult.isErr()) {
      console.warn(
        `GlobalFeedSeedService: failed to read global feed: ${feedResult.error.message}`,
      );
      return [];
    }

    // Dedupe by card: the same card saved by several users shouldn't get extra
    // weight in the random pick.
    const cardIds = [
      ...new Set(
        feedResult.value.activities
          .filter((activity) => activity.cardCollected)
          .map(
            (activity) => (activity.metadata as CardCollectedMetadata).cardId,
          )
          .filter((cardId): cardId is string => !!cardId),
      ),
    ];
    if (cardIds.length === 0) {
      return [];
    }

    // Pick before hydrating so we only fetch the cards we're actually using.
    const selectedIds = pickRandom(cardIds, seedCount);
    const cardMap =
      await this.cardQueryRepository.getBatchUrlCardViews(selectedIds);

    return selectedIds
      .map((cardId) => cardMap.get(cardId))
      .filter((card): card is UrlCardView => !!card);
  }
}

export function pickRandom<T>(items: T[], count: number): T[] {
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
