import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import {
  IUserStatsRepository,
  UserGrowthStatsDTO,
  UserGrowthStatsOptions,
  UserGrowthDataPoint,
} from '../../domain/IUserStatsRepository';
import { users } from './schema/user.sql';

export class DrizzleUserStatsRepository implements IUserStatsRepository {
  constructor(private db: PostgresJsDatabase) {}

  async getUserGrowthStats(
    options: UserGrowthStatsOptions,
  ): Promise<UserGrowthStatsDTO> {
    const { interval, limit } = options;

    // Get the time-series data with cumulative counts
    const query = sql`
      WITH date_series AS (
        SELECT
          date_trunc(${interval}, linked_at) AS period,
          COUNT(*) AS new_users_in_period
        FROM ${users}
        GROUP BY period
      ),
      cumulative_counts AS (
        SELECT
          period,
          new_users_in_period,
          SUM(new_users_in_period) OVER (ORDER BY period) AS total_users
        FROM date_series
      )
      SELECT
        period::text AS date,
        total_users::int AS total_users,
        new_users_in_period::int AS new_users
      FROM cumulative_counts
      ORDER BY period DESC
      LIMIT ${limit}
    `;

    const result = await this.db.execute(query);

    // Get current total user count
    const totalCountResult = await this.db.execute(sql`
      SELECT COUNT(*)::int AS count FROM ${users}
    `);
    const currentTotal = (totalCountResult[0] as any)?.count || 0;

    // Transform the results into the DTO format
    const dataPoints: UserGrowthDataPoint[] = result
      .map((row: any) => ({
        date: row.date,
        totalUsers: row.total_users,
        newUsers: row.new_users,
      }))
      .reverse(); // Reverse to get chronological order (oldest to newest)

    // Determine the period range
    const periodStart =
      dataPoints.length > 0 && dataPoints[0]
        ? dataPoints[0].date
        : new Date().toISOString();
    const lastDataPoint =
      dataPoints.length > 0 ? dataPoints[dataPoints.length - 1] : undefined;
    const periodEnd = lastDataPoint
      ? lastDataPoint.date
      : new Date().toISOString();

    return {
      dataPoints,
      currentTotal,
      periodStart,
      periodEnd,
    };
  }

  // Future stat methods can be added here
  // async getUserActivityStats(options: UserActivityStatsOptions): Promise<UserActivityStatsDTO> { ... }
  // async getUserEngagementStats(options: UserEngagementStatsOptions): Promise<UserEngagementStatsDTO> { ... }
}
