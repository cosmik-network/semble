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

// User Engagement Statistics DTOs

export interface UserEngagementDataPoint {
  date: string;
  activeUsers: number; // Users who created content in this period
  newlyActivatedUsers: number; // Previously inactive users who became active
  cumulativeActiveUsers: number; // Total active users up to this date
}

export interface UserEngagementStatsDTO {
  // Snapshot data
  totalUsers: number;
  activeUsers: number; // Created any content
  inactiveUsers: number; // Signed in, no content

  // Activity breakdown
  usersWithCards: number;
  usersWithCollections: number;
  usersWithConnections: number;
  usersWithFollows: number;
  usersWithContributions: number; // Added cards to others' collections

  // Engagement metrics
  activationRate: number; // activeUsers / totalUsers
  avgActionsPerActiveUser: number;

  // Optional: Time series for trends
  dataPoints?: UserEngagementDataPoint[];
}

export interface UserEngagementStatsOptions {
  interval?: TimeInterval; // For time series
  limit?: number; // For time series
  includeTimeSeries?: boolean;
}

// Daily Activity Statistics DTOs

export interface DailyActivityDataPoint {
  date: string; // ISO date string
  cardsCreated: number;
  collectionsCreated: number;
  connectionsCreated: number;
  followsCreated: number;
  totalActions: number; // Sum of all above
}

export interface DailyActivityStatsDTO {
  dataPoints: DailyActivityDataPoint[];
  totals: {
    cardsCreated: number;
    collectionsCreated: number;
    connectionsCreated: number;
    followsCreated: number;
    totalActions: number;
  };
  periodStart: string;
  periodEnd: string;
}

export interface DailyActivityStatsOptions {
  interval: TimeInterval; // day, week, month
  limit: number; // Number of intervals to return
}

// Content Breakdown Statistics DTOs

export interface ContentBreakdownDataPoint {
  date: string; // ISO date string

  // URL Cards breakdown
  urlCards: {
    total: number;
    byType: Record<string, number>; // e.g., { "article": 50, "video": 30, "tool": 20 }
  };

  // Collections breakdown
  collections: {
    total: number;
    byAccessType: Record<string, number>; // e.g., { "OPEN": 80, "CLOSED": 45 }
  };

  // Connections breakdown
  connections: {
    total: number;
    byType: Record<string, number>; // e.g., { "SUPPORTS": 30, "OPPOSES": 20, null: 15 }
  };
}

export interface ContentBreakdownStatsDTO {
  dataPoints: ContentBreakdownDataPoint[];

  // Current totals (latest snapshot)
  currentTotals: {
    urlCards: {
      total: number;
      byType: Record<string, number>;
    };
    collections: {
      total: number;
      byAccessType: Record<string, number>;
    };
    connections: {
      total: number;
      byType: Record<string, number>;
    };
  };

  periodStart: string;
  periodEnd: string;
}

export interface ContentBreakdownStatsOptions {
  interval: TimeInterval; // day, week, month
  limit: number; // Number of intervals to return
}

// Future stat types can be added here
export type UserStatType = 'growth' | 'activity' | 'engagement' | 'breakdown';

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

  /**
   * Get user engagement statistics
   * Returns active vs inactive users with content breakdown
   */
  getUserEngagementStats(
    options: UserEngagementStatsOptions,
  ): Promise<UserEngagementStatsDTO>;

  /**
   * Get daily activity statistics
   * Returns content creation volume over time periods
   */
  getDailyActivityStats(
    options: DailyActivityStatsOptions,
  ): Promise<DailyActivityStatsDTO>;

  /**
   * Get content breakdown statistics
   * Returns cumulative content totals broken down by subtypes over time
   */
  getContentBreakdownStats(
    options: ContentBreakdownStatsOptions,
  ): Promise<ContentBreakdownStatsDTO>;
}
