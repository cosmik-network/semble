import {
  IProductAnalyticsQueryRepository,
  AnalyticsWeekOptions,
  WacStatsDTO,
  ActivationFunnelStatsDTO,
  ApiUsageStatsDTO,
  OnboardingStatsRaw,
  RetentionStatsDTO,
  RetentionSegmentBy,
  RetentionSegmentsStatsDTO,
} from '../../domain/IProductAnalyticsQueryRepository';
import { StatsCache } from '../StatsCache';
import {
  resolveWeekRange,
  startOfIsoWeekUTC,
} from './query-services/weekRange';

const DAY_MS = 24 * 60 * 60 * 1000;

// Series that only cover completed weeks can only change through late
// (backfilled) records, so they're cached for a long time. Anything that can
// still move — a range reaching into the in-progress week, or funnel cohorts
// whose rung windows are still open — gets a short TTL.
const FINAL_TTL_SECONDS = 12 * 3600;
const LIVE_TTL_SECONDS = 15 * 60;

// Widest activation-funnel rung window (notified30d).
const FUNNEL_MAX_RUNG_WINDOW_MS = 30 * DAY_MS;

/**
 * Caching decorator over the product analytics query repository. Keys use the
 * RESOLVED end week, so any endWeek date within the same ISO week (or an
 * omitted endWeek) shares an entry, and the default series rolls over to a
 * fresh key automatically when a new week completes.
 *
 * Onboarding raw stats pass straight through — they're cached after
 * hydration by OnboardingStatsComposer.
 */
export class CachedProductAnalyticsQueryRepository implements IProductAnalyticsQueryRepository {
  constructor(
    private readonly repository: IProductAnalyticsQueryRepository,
    private readonly cache: StatsCache,
  ) {}

  async getWacStats(options: AnalyticsWeekOptions): Promise<WacStatsDTO> {
    return this.cached('wac', options, 0, () =>
      this.repository.getWacStats(options),
    );
  }

  async getApiUsageStats(
    options: AnalyticsWeekOptions,
  ): Promise<ApiUsageStatsDTO> {
    return this.cached('api-usage', options, 0, () =>
      this.repository.getApiUsageStats(options),
    );
  }

  async getActivationFunnelStats(
    options: AnalyticsWeekOptions,
  ): Promise<ActivationFunnelStatsDTO> {
    return this.cached(
      'activation-funnel',
      options,
      FUNNEL_MAX_RUNG_WINDOW_MS,
      () => this.repository.getActivationFunnelStats(options),
    );
  }

  async getRetentionStats(
    options: AnalyticsWeekOptions,
  ): Promise<RetentionStatsDTO> {
    return this.cached('retention', options, 0, () =>
      this.repository.getRetentionStats(options),
    );
  }

  async getRetentionSegmentsStats(
    options: AnalyticsWeekOptions & { segmentBy: RetentionSegmentBy },
  ): Promise<RetentionSegmentsStatsDTO> {
    return this.cached(
      `retention-segments:${options.segmentBy}`,
      options,
      0,
      () => this.repository.getRetentionSegmentsStats(options),
    );
  }

  async getOnboardingWeeklyStatsRaw(options: {
    endWeek?: string;
  }): Promise<OnboardingStatsRaw> {
    return this.repository.getOnboardingWeeklyStatsRaw(options);
  }

  async getOnboardingSummaryStatsRaw(): Promise<OnboardingStatsRaw> {
    return this.repository.getOnboardingSummaryStatsRaw();
  }

  /**
   * @param settleMs how long after the range's last week ends the data can
   *   still change (e.g. funnel rung windows extending past the cohort week).
   */
  private cached<T>(
    name: string,
    options: AnalyticsWeekOptions,
    settleMs: number,
    compute: () => Promise<T>,
  ): Promise<T> {
    const now = new Date();
    const range = resolveWeekRange(options.endWeek, options.weeks, now);
    const isFinal =
      range.upperBoundExclusive.getTime() + settleMs <=
      startOfIsoWeekUTC(now).getTime();

    const key = `${name}:${range.endWeekStart.toISOString()}:${options.weeks || 0}`;
    return this.cache.getOrCompute(
      key,
      isFinal ? FINAL_TTL_SECONDS : LIVE_TTL_SECONDS,
      compute,
    );
  }
}
