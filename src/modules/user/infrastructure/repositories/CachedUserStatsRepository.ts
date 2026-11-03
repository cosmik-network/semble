import {
  IUserStatsRepository,
  UserGrowthStatsDTO,
  UserGrowthStatsOptions,
  UserEngagementStatsDTO,
  UserEngagementStatsOptions,
  DailyActivityStatsDTO,
  DailyActivityStatsOptions,
  ContentBreakdownStatsDTO,
  ContentBreakdownStatsOptions,
} from '../../domain/IUserStatsRepository';
import { StatsCache } from '../../../analytics/infrastructure/StatsCache';

// These include the current (in-progress) period and several are all-time
// aggregates over the largest tables, so a modest TTL trades a little
// freshness for not re-scanning on every dashboard load.
const USER_STATS_TTL_SECONDS = 30 * 60;

export class CachedUserStatsRepository implements IUserStatsRepository {
  constructor(
    private readonly repository: IUserStatsRepository,
    private readonly cache: StatsCache,
  ) {}

  async getUserGrowthStats(
    options: UserGrowthStatsOptions,
  ): Promise<UserGrowthStatsDTO> {
    return this.cache.getOrCompute(
      `user-growth:${options.interval}:${options.limit}`,
      USER_STATS_TTL_SECONDS,
      () => this.repository.getUserGrowthStats(options),
    );
  }

  async getUserEngagementStats(
    options: UserEngagementStatsOptions,
  ): Promise<UserEngagementStatsDTO> {
    const timeSeriesKey = options.includeTimeSeries
      ? `${options.interval ?? 'day'}:${options.limit ?? 30}`
      : 'none';
    return this.cache.getOrCompute(
      `user-engagement:${timeSeriesKey}`,
      USER_STATS_TTL_SECONDS,
      () => this.repository.getUserEngagementStats(options),
    );
  }

  async getDailyActivityStats(
    options: DailyActivityStatsOptions,
  ): Promise<DailyActivityStatsDTO> {
    return this.cache.getOrCompute(
      `user-activity:${options.interval}:${options.limit}`,
      USER_STATS_TTL_SECONDS,
      () => this.repository.getDailyActivityStats(options),
    );
  }

  async getContentBreakdownStats(
    options: ContentBreakdownStatsOptions,
  ): Promise<ContentBreakdownStatsDTO> {
    return this.cache.getOrCompute(
      `user-breakdown:${options.interval}:${options.limit}`,
      USER_STATS_TTL_SECONDS,
      () => this.repository.getContentBreakdownStats(options),
    );
  }
}
