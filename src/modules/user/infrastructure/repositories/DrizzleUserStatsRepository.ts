import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import {
  IUserStatsRepository,
  UserGrowthStatsDTO,
  UserGrowthStatsOptions,
  UserGrowthDataPoint,
  UserEngagementStatsDTO,
  UserEngagementStatsOptions,
  UserEngagementDataPoint,
} from '../../domain/IUserStatsRepository';
import { users } from './schema/user.sql';
import { cards } from '../../../cards/infrastructure/repositories/schema/card.sql';
import { collections } from '../../../cards/infrastructure/repositories/schema/collection.sql';
import { collectionCards } from '../../../cards/infrastructure/repositories/schema/collection.sql';
import { connections } from '../../../cards/infrastructure/repositories/schema/connection.sql';
import { follows } from './schema/follows.sql';

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

  async getUserEngagementStats(
    options: UserEngagementStatsOptions,
  ): Promise<UserEngagementStatsDTO> {
    // Main snapshot query
    const snapshotQuery = sql`
      WITH user_activity AS (
        SELECT
          u.id AS user_id,
          EXISTS(SELECT 1 FROM ${cards} WHERE author_id = u.id) AS has_cards,
          EXISTS(SELECT 1 FROM ${collections} WHERE author_id = u.id) AS has_collections,
          EXISTS(SELECT 1 FROM ${connections} WHERE curator_id = u.id) AS has_connections,
          EXISTS(SELECT 1 FROM ${follows} WHERE follower_id = u.id) AS has_follows,
          EXISTS(SELECT 1 FROM ${collectionCards} WHERE added_by = u.id) AS has_contributions,
          (
            (SELECT COUNT(*) FROM ${cards} WHERE author_id = u.id) +
            (SELECT COUNT(*) FROM ${collections} WHERE author_id = u.id) +
            (SELECT COUNT(*) FROM ${connections} WHERE curator_id = u.id) +
            (SELECT COUNT(*) FROM ${follows} WHERE follower_id = u.id)
          ) AS total_actions
        FROM ${users} u
      ),
      aggregated AS (
        SELECT
          COUNT(*)::int AS total_users,
          COUNT(*) FILTER (
            WHERE has_cards OR has_collections OR has_connections
                  OR has_follows OR has_contributions
          )::int AS active_users,
          COUNT(*) FILTER (WHERE has_cards)::int AS users_with_cards,
          COUNT(*) FILTER (WHERE has_collections)::int AS users_with_collections,
          COUNT(*) FILTER (WHERE has_connections)::int AS users_with_connections,
          COUNT(*) FILTER (WHERE has_follows)::int AS users_with_follows,
          COUNT(*) FILTER (WHERE has_contributions)::int AS users_with_contributions,
          COALESCE(AVG(total_actions) FILTER (WHERE total_actions > 0), 0)::numeric AS avg_actions
        FROM user_activity
      )
      SELECT
        total_users,
        active_users,
        (total_users - active_users) AS inactive_users,
        users_with_cards,
        users_with_collections,
        users_with_connections,
        users_with_follows,
        users_with_contributions,
        CASE
          WHEN total_users > 0 THEN (active_users::numeric / total_users::numeric)
          ELSE 0
        END AS activation_rate,
        avg_actions AS avg_actions_per_active_user
      FROM aggregated
    `;

    const result = await this.db.execute(snapshotQuery);
    const row = result[0] as any;

    // Optional time series data
    let dataPoints: UserEngagementDataPoint[] | undefined;
    if (options.includeTimeSeries) {
      dataPoints = await this.getEngagementTimeSeries(options);
    }

    return {
      totalUsers: row?.total_users || 0,
      activeUsers: row?.active_users || 0,
      inactiveUsers: row?.inactive_users || 0,
      usersWithCards: row?.users_with_cards || 0,
      usersWithCollections: row?.users_with_collections || 0,
      usersWithConnections: row?.users_with_connections || 0,
      usersWithFollows: row?.users_with_follows || 0,
      usersWithContributions: row?.users_with_contributions || 0,
      activationRate: parseFloat(row?.activation_rate || '0'),
      avgActionsPerActiveUser: parseFloat(
        row?.avg_actions_per_active_user || '0',
      ),
      dataPoints: dataPoints && dataPoints.length > 0 ? dataPoints : undefined,
    };
  }

  private async getEngagementTimeSeries(
    options: UserEngagementStatsOptions,
  ): Promise<UserEngagementDataPoint[]> {
    const { interval = 'day', limit = 30 } = options;

    const timeSeriesQuery = sql`
      WITH user_first_activity AS (
        SELECT
          u.id AS user_id,
          u.linked_at,
          LEAST(
            COALESCE((SELECT MIN(created_at) FROM ${cards} WHERE author_id = u.id), '9999-12-31'::timestamp),
            COALESCE((SELECT MIN(created_at) FROM ${collections} WHERE author_id = u.id), '9999-12-31'::timestamp),
            COALESCE((SELECT MIN(created_at) FROM ${connections} WHERE curator_id = u.id), '9999-12-31'::timestamp),
            COALESCE((SELECT MIN(created_at) FROM ${follows} WHERE follower_id = u.id), '9999-12-31'::timestamp),
            COALESCE((SELECT MIN(added_at) FROM ${collectionCards} WHERE added_by = u.id), '9999-12-31'::timestamp)
          ) AS first_action_at
        FROM ${users} u
      ),
      period_stats AS (
        SELECT
          date_trunc(${interval}, first_action_at) AS period,
          COUNT(*) FILTER (WHERE first_action_at < '9999-12-31'::timestamp) AS newly_activated
        FROM user_first_activity
        WHERE first_action_at < '9999-12-31'::timestamp
        GROUP BY period
      ),
      cumulative AS (
        SELECT
          period,
          newly_activated,
          SUM(newly_activated) OVER (ORDER BY period) AS cumulative_active
        FROM period_stats
      )
      SELECT
        period::text AS date,
        newly_activated::int AS newly_activated_users,
        cumulative_active::int AS cumulative_active_users
      FROM cumulative
      ORDER BY period DESC
      LIMIT ${limit}
    `;

    const result = await this.db.execute(timeSeriesQuery);
    return result
      .map((row: any) => ({
        date: row.date,
        newlyActivatedUsers: row.newly_activated_users || 0,
        cumulativeActiveUsers: row.cumulative_active_users || 0,
        activeUsers: row.newly_activated_users || 0, // Users activated in this period
      }))
      .reverse(); // Reverse to get chronological order
  }

  // Future stat methods can be added here
  // async getUserActivityStats(options: UserActivityStatsOptions): Promise<UserActivityStatsDTO> { ... }
}
