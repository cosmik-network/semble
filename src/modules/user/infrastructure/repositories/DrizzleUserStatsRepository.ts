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
  DailyActivityStatsDTO,
  DailyActivityStatsOptions,
  DailyActivityDataPoint,
  ContentBreakdownStatsDTO,
  ContentBreakdownStatsOptions,
  ContentBreakdownDataPoint,
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
          EXISTS(SELECT 1 FROM ${cards} WHERE author_id = u.id AND type = 'URL') AS has_cards,
          EXISTS(SELECT 1 FROM ${collections} WHERE author_id = u.id) AS has_collections,
          EXISTS(SELECT 1 FROM ${connections} WHERE curator_id = u.id) AS has_connections,
          EXISTS(SELECT 1 FROM ${follows} WHERE follower_id = u.id) AS has_follows,
          EXISTS(SELECT 1 FROM ${collectionCards} WHERE added_by = u.id) AS has_contributions,
          (
            (SELECT COUNT(*) FROM ${cards} WHERE author_id = u.id AND type = 'URL') +
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
            COALESCE((SELECT MIN(created_at) FROM ${cards} WHERE author_id = u.id AND type = 'URL'), '9999-12-31'::timestamp),
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

  async getDailyActivityStats(
    options: DailyActivityStatsOptions,
  ): Promise<DailyActivityStatsDTO> {
    const { interval, limit } = options;

    // Query for content creation over time
    const activityQuery = sql`
      WITH date_periods AS (
        SELECT DISTINCT date_trunc(${interval}, created_at) AS period
        FROM (
          SELECT created_at FROM ${cards} WHERE type = 'URL'
          UNION ALL
          SELECT created_at FROM ${collections}
          UNION ALL
          SELECT created_at FROM ${connections}
          UNION ALL
          SELECT created_at FROM ${follows}
        ) all_dates
        WHERE created_at IS NOT NULL
      ),
      activity_counts AS (
        SELECT
          dp.period,
          COALESCE(COUNT(DISTINCT c.id), 0)::int AS cards_created,
          COALESCE(COUNT(DISTINCT col.id), 0)::int AS collections_created,
          COALESCE(COUNT(DISTINCT con.id), 0)::int AS connections_created,
          COALESCE(COUNT(DISTINCT f.follower_id || '-' || f.target_id || '-' || f.target_type), 0)::int AS follows_created
        FROM date_periods dp
        LEFT JOIN ${cards} c ON date_trunc(${interval}, c.created_at) = dp.period AND c.type = 'URL'
        LEFT JOIN ${collections} col ON date_trunc(${interval}, col.created_at) = dp.period
        LEFT JOIN ${connections} con ON date_trunc(${interval}, con.created_at) = dp.period
        LEFT JOIN ${follows} f ON date_trunc(${interval}, f.created_at) = dp.period
        GROUP BY dp.period
      )
      SELECT
        period::text AS date,
        cards_created,
        collections_created,
        connections_created,
        follows_created,
        (cards_created + collections_created + connections_created + follows_created) AS total_actions
      FROM activity_counts
      ORDER BY period DESC
      LIMIT ${limit}
    `;

    const result = await this.db.execute(activityQuery);

    // Calculate totals
    let totals = {
      cardsCreated: 0,
      collectionsCreated: 0,
      connectionsCreated: 0,
      followsCreated: 0,
      totalActions: 0,
    };

    const dataPoints: DailyActivityDataPoint[] = result
      .map((row: any) => {
        const point = {
          date: row.date,
          cardsCreated: row.cards_created || 0,
          collectionsCreated: row.collections_created || 0,
          connectionsCreated: row.connections_created || 0,
          followsCreated: row.follows_created || 0,
          totalActions: row.total_actions || 0,
        };

        // Accumulate totals
        totals.cardsCreated += point.cardsCreated;
        totals.collectionsCreated += point.collectionsCreated;
        totals.connectionsCreated += point.connectionsCreated;
        totals.followsCreated += point.followsCreated;
        totals.totalActions += point.totalActions;

        return point;
      })
      .reverse(); // Reverse to get chronological order

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
      totals,
      periodStart,
      periodEnd,
    };
  }

  async getContentBreakdownStats(
    options: ContentBreakdownStatsOptions,
  ): Promise<ContentBreakdownStatsDTO> {
    const { interval, limit } = options;

    // Query for URL cards breakdown by type over time
    const urlCardsQuery = sql`
      WITH periods AS (
        SELECT DISTINCT date_trunc(${interval}, created_at) AS period
        FROM ${cards}
        WHERE type = 'URL' AND created_at IS NOT NULL
      ),
      url_card_counts AS (
        SELECT
          p.period,
          COALESCE(c.url_type, 'unspecified') AS url_type,
          COUNT(c.id) AS count
        FROM periods p
        CROSS JOIN LATERAL (
          SELECT * FROM ${cards}
          WHERE type = 'URL'
            AND created_at <= p.period + interval '1 ${interval}'
        ) c
        GROUP BY p.period, c.url_type
      ),
      url_card_aggregated AS (
        SELECT
          period::text AS date,
          jsonb_object_agg(url_type, count) AS by_type,
          SUM(count)::int AS total
        FROM url_card_counts
        GROUP BY period
        ORDER BY period DESC
        LIMIT ${limit}
      )
      SELECT * FROM url_card_aggregated
    `;

    // Query for collections breakdown by access type over time
    const collectionsQuery = sql`
      WITH periods AS (
        SELECT DISTINCT date_trunc(${interval}, created_at) AS period
        FROM ${collections}
        WHERE created_at IS NOT NULL
      ),
      collection_counts AS (
        SELECT
          p.period,
          col.access_type,
          COUNT(col.id) AS count
        FROM periods p
        CROSS JOIN LATERAL (
          SELECT * FROM ${collections}
          WHERE created_at <= p.period + interval '1 ${interval}'
        ) col
        GROUP BY p.period, col.access_type
      ),
      collection_aggregated AS (
        SELECT
          period::text AS date,
          jsonb_object_agg(access_type, count) AS by_access_type,
          SUM(count)::int AS total
        FROM collection_counts
        GROUP BY period
        ORDER BY period DESC
        LIMIT ${limit}
      )
      SELECT * FROM collection_aggregated
    `;

    // Query for connections breakdown by type over time
    const connectionsQuery = sql`
      WITH periods AS (
        SELECT DISTINCT date_trunc(${interval}, created_at) AS period
        FROM ${connections}
        WHERE created_at IS NOT NULL
      ),
      connection_counts AS (
        SELECT
          p.period,
          COALESCE(con.connection_type, 'unspecified') AS connection_type,
          COUNT(con.id) AS count
        FROM periods p
        CROSS JOIN LATERAL (
          SELECT * FROM ${connections}
          WHERE created_at <= p.period + interval '1 ${interval}'
        ) con
        GROUP BY p.period, con.connection_type
      ),
      connection_aggregated AS (
        SELECT
          period::text AS date,
          jsonb_object_agg(connection_type, count) AS by_type,
          SUM(count)::int AS total
        FROM connection_counts
        GROUP BY period
        ORDER BY period DESC
        LIMIT ${limit}
      )
      SELECT * FROM connection_aggregated
    `;

    // Execute all queries in parallel
    const [urlCardsResult, collectionsResult, connectionsResult] =
      await Promise.all([
        this.db.execute(urlCardsQuery),
        this.db.execute(collectionsQuery),
        this.db.execute(connectionsQuery),
      ]);

    // Create maps for easy lookup
    const urlCardsMap = new Map(
      urlCardsResult.map((row: any) => [row.date, row]),
    );
    const collectionsMap = new Map(
      collectionsResult.map((row: any) => [row.date, row]),
    );
    const connectionsMap = new Map(
      connectionsResult.map((row: any) => [row.date, row]),
    );

    // Get all unique dates and sort them
    const allDates = new Set([
      ...urlCardsMap.keys(),
      ...collectionsMap.keys(),
      ...connectionsMap.keys(),
    ]);
    const sortedDates = Array.from(allDates).sort();

    // Build data points
    const dataPoints: ContentBreakdownDataPoint[] = sortedDates.map((date) => {
      const urlCardData = urlCardsMap.get(date);
      const collectionData = collectionsMap.get(date);
      const connectionData = connectionsMap.get(date);

      return {
        date,
        urlCards: {
          total: urlCardData?.total || 0,
          byType: urlCardData?.by_type || {},
        },
        collections: {
          total: collectionData?.total || 0,
          byAccessType: collectionData?.by_access_type || {},
        },
        connections: {
          total: connectionData?.total || 0,
          byType: connectionData?.by_type || {},
        },
      };
    });

    // Get current totals (the most recent data point or fetch separately if needed)
    const currentUrlCards = urlCardsResult[0] as any;
    const currentCollections = collectionsResult[0] as any;
    const currentConnections = connectionsResult[0] as any;

    const currentTotals = {
      urlCards: {
        total: currentUrlCards?.total || 0,
        byType: currentUrlCards?.by_type || {},
      },
      collections: {
        total: currentCollections?.total || 0,
        byAccessType: currentCollections?.by_access_type || {},
      },
      connections: {
        total: currentConnections?.total || 0,
        byType: currentConnections?.by_type || {},
      },
    };

    // Determine period range
    const periodStart = sortedDates[0] || new Date().toISOString();
    const periodEnd =
      sortedDates[sortedDates.length - 1] || new Date().toISOString();

    return {
      dataPoints,
      currentTotals,
      periodStart,
      periodEnd,
    };
  }
}
