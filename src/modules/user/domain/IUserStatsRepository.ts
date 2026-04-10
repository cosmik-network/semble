// DTOs for User Statistics

export interface UserGrowthDataPoint {
  date: string; // ISO date string for chart x-axis
  totalUsers: number; // Cumulative total users up to this date
  newUsers: number; // New users added in this period
}

export interface UserGrowthStatsDTO {
  dataPoints: UserGrowthDataPoint[];
  currentTotal: number;
  periodStart: string;
  periodEnd: string;
}

export type TimeInterval = 'day' | 'week' | 'month';

export interface UserGrowthStatsOptions {
  interval: TimeInterval;
  limit: number; // Number of intervals to return
}

// Future stat types can be added here
export type UserStatType = 'growth' | 'activity' | 'engagement';

/**
 * Repository interface for user statistics and analytics queries
 * This is a read-only query repository focused on aggregations and time-series data
 */
export interface IUserStatsRepository {
  /**
   * Get user growth statistics over time
   * Returns cumulative user counts with period-over-period growth
   */
  getUserGrowthStats(
    options: UserGrowthStatsOptions,
  ): Promise<UserGrowthStatsDTO>;

  // Future methods can be added here:
  // getUserActivityStats(options: UserActivityStatsOptions): Promise<UserActivityStatsDTO>;
  // getUserEngagementStats(options: UserEngagementStatsOptions): Promise<UserEngagementStatsDTO>;
}
