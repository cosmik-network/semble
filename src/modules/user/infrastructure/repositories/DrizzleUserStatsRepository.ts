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
    // Main snapshot query - optimized to use CTEs and LEFT JOINs instead of correlated subqueries
    const snapshotQuery = sql`
      WITH user_cards AS (
        SELECT author_id, COUNT(*) as card_count
        FROM ${cards}
        WHERE type = 'URL'
        GROUP BY author_id
      ),
      user_collections AS (
        SELECT author_id, COUNT(*) as collection_count
        FROM ${collections}
        GROUP BY author_id
      ),
      user_connections AS (
        SELECT curator_id, COUNT(*) as connection_count
        FROM ${connections}
        GROUP BY curator_id
      ),
      user_follows AS (
        SELECT follower_id, COUNT(*) as follow_count
        FROM ${follows}
        GROUP BY follower_id
      ),
      user_contributions AS (
        SELECT added_by, COUNT(*) as contribution_count
        FROM ${collectionCards}
        GROUP BY added_by
      ),
      user_activity AS (
        SELECT
          u.id AS user_id,
          COALESCE(uc.card_count, 0) > 0 AS has_cards,
          COALESCE(ucol.collection_count, 0) > 0 AS has_collections,
          COALESCE(ucon.connection_count, 0) > 0 AS has_connections,
          COALESCE(uf.follow_count, 0) > 0 AS has_follows,
          COALESCE(ucontr.contribution_count, 0) > 0 AS has_contributions,
          COALESCE(uc.card_count, 0) + COALESCE(ucol.collection_count, 0) +
          COALESCE(ucon.connection_count, 0) + COALESCE(uf.follow_count, 0) AS total_actions
        FROM ${users} u
        LEFT JOIN user_cards uc ON u.id = uc.author_id
        LEFT JOIN user_collections ucol ON u.id = ucol.author_id
        LEFT JOIN user_connections ucon ON u.id = ucon.curator_id
        LEFT JOIN user_follows uf ON u.id = uf.follower_id
        LEFT JOIN user_contributions ucontr ON u.id = ucontr.added_by
      )
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
        COALESCE(AVG(total_actions) FILTER (WHERE total_actions > 0), 0)::numeric AS avg_actions_per_active_user,
        CASE
          WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (
            WHERE has_cards OR has_collections OR has_connections
                  OR has_follows OR has_contributions
          )::numeric / COUNT(*)::numeric)
          ELSE 0
        END AS activation_rate,
        COUNT(*)::int - COUNT(*) FILTER (
          WHERE has_cards OR has_collections OR has_connections
                OR has_follows OR has_contributions
        )::int AS inactive_users
      FROM user_activity
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

    // Optimized version using UNION ALL instead of multiple MIN subqueries
    const timeSeriesQuery = sql`
      WITH all_user_actions AS (
        SELECT author_id as user_id, created_at
        FROM ${cards}
        WHERE type = 'URL'
        UNION ALL
        SELECT author_id as user_id, created_at
        FROM ${collections}
        UNION ALL
        SELECT curator_id as user_id, created_at
        FROM ${connections}
        UNION ALL
        SELECT follower_id as user_id, created_at
        FROM ${follows}
        UNION ALL
        SELECT added_by as user_id, added_at as created_at
        FROM ${collectionCards}
      ),
      user_first_activity AS (
        SELECT
          u.id AS user_id,
          u.linked_at,
          MIN(aua.created_at) AS first_action_at
        FROM ${users} u
        LEFT JOIN all_user_actions aua ON u.id = aua.user_id
        GROUP BY u.id, u.linked_at
      ),
      period_stats AS (
        SELECT
          date_trunc(${interval}, first_action_at) AS period,
          COUNT(*) as newly_activated
        FROM user_first_activity
        WHERE first_action_at IS NOT NULL
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

    // Optimized query: pre-aggregate each table before joining
    const activityQuery = sql`
      WITH card_counts AS (
        SELECT
          date_trunc(${interval}, created_at) AS period,
          COUNT(*)::int AS count
        FROM ${cards}
        WHERE type = 'URL' AND created_at IS NOT NULL
        GROUP BY period
      ),
      collection_counts AS (
        SELECT
          date_trunc(${interval}, created_at) AS period,
          COUNT(*)::int AS count
        FROM ${collections}
        WHERE created_at IS NOT NULL
        GROUP BY period
      ),
      connection_counts AS (
        SELECT
          date_trunc(${interval}, created_at) AS period,
          COUNT(*)::int AS count
        FROM ${connections}
        WHERE created_at IS NOT NULL
        GROUP BY period
      ),
      follow_counts AS (
        SELECT
          date_trunc(${interval}, created_at) AS period,
          COUNT(*)::int AS count
        FROM ${follows}
        WHERE created_at IS NOT NULL
        GROUP BY period
      ),
      all_periods AS (
        SELECT period FROM card_counts
        UNION
        SELECT period FROM collection_counts
        UNION
        SELECT period FROM connection_counts
        UNION
        SELECT period FROM follow_counts
      )
      SELECT
        ap.period::text AS date,
        COALESCE(cc.count, 0) AS cards_created,
        COALESCE(col.count, 0) AS collections_created,
        COALESCE(con.count, 0) AS connections_created,
        COALESCE(fc.count, 0) AS follows_created,
        COALESCE(cc.count, 0) + COALESCE(col.count, 0) +
        COALESCE(con.count, 0) + COALESCE(fc.count, 0) AS total_actions
      FROM all_periods ap
      LEFT JOIN card_counts cc ON ap.period = cc.period
      LEFT JOIN collection_counts col ON ap.period = col.period
      LEFT JOIN connection_counts con ON ap.period = con.period
      LEFT JOIN follow_counts fc ON ap.period = fc.period
      ORDER BY ap.period DESC
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

    // Optimized query for URL cards: use incremental aggregation with window functions
    const urlCardsQuery = sql`
      WITH all_cards AS (
        SELECT
          COALESCE(url_type, 'unspecified') AS url_type,
          created_at
        FROM ${cards}
        WHERE type = 'URL' AND created_at IS NOT NULL
      ),
      all_periods AS (
        SELECT DISTINCT date_trunc(${interval}, created_at) AS period
        FROM all_cards
      ),
      all_types AS (
        SELECT DISTINCT url_type
        FROM all_cards
      ),
      period_type_grid AS (
        SELECT p.period, t.url_type
        FROM all_periods p
        CROSS JOIN all_types t
      ),
      period_counts AS (
        SELECT
          date_trunc(${interval}, created_at) AS period,
          url_type,
          COUNT(*)::int AS period_count
        FROM all_cards
        GROUP BY 1, 2
      ),
      cumulative_counts AS (
        SELECT
          ptg.period,
          ptg.url_type,
          SUM(COALESCE(pc.period_count, 0)) OVER (
            PARTITION BY ptg.url_type
            ORDER BY ptg.period
          ) AS cumulative_count
        FROM period_type_grid ptg
        LEFT JOIN period_counts pc ON ptg.period = pc.period AND ptg.url_type = pc.url_type
      ),
      url_card_aggregated AS (
        SELECT
          period::text AS date,
          jsonb_object_agg(url_type, cumulative_count) AS by_type,
          SUM(cumulative_count)::int AS total
        FROM cumulative_counts
        GROUP BY period
        ORDER BY period DESC
        LIMIT ${limit}
      )
      SELECT * FROM url_card_aggregated
    `;

    // Optimized query for collections: use incremental aggregation with window functions
    const collectionsQuery = sql`
      WITH all_collections AS (
        SELECT
          access_type,
          created_at
        FROM ${collections}
        WHERE created_at IS NOT NULL
      ),
      all_periods AS (
        SELECT DISTINCT date_trunc(${interval}, created_at) AS period
        FROM all_collections
      ),
      all_access_types AS (
        SELECT DISTINCT access_type
        FROM all_collections
      ),
      period_type_grid AS (
        SELECT p.period, t.access_type
        FROM all_periods p
        CROSS JOIN all_access_types t
      ),
      period_counts AS (
        SELECT
          date_trunc(${interval}, created_at) AS period,
          access_type,
          COUNT(*)::int AS period_count
        FROM all_collections
        GROUP BY 1, 2
      ),
      cumulative_counts AS (
        SELECT
          ptg.period,
          ptg.access_type,
          SUM(COALESCE(pc.period_count, 0)) OVER (
            PARTITION BY ptg.access_type
            ORDER BY ptg.period
          ) AS cumulative_count
        FROM period_type_grid ptg
        LEFT JOIN period_counts pc ON ptg.period = pc.period AND ptg.access_type = pc.access_type
      ),
      collection_aggregated AS (
        SELECT
          period::text AS date,
          jsonb_object_agg(access_type, cumulative_count) AS by_access_type,
          SUM(cumulative_count)::int AS total
        FROM cumulative_counts
        GROUP BY period
        ORDER BY period DESC
        LIMIT ${limit}
      )
      SELECT * FROM collection_aggregated
    `;

    // Optimized query for connections: use incremental aggregation with window functions
    const connectionsQuery = sql`
      WITH all_connections AS (
        SELECT
          COALESCE(connection_type, 'unspecified') AS connection_type,
          created_at
        FROM ${connections}
        WHERE created_at IS NOT NULL
      ),
      all_periods AS (
        SELECT DISTINCT date_trunc(${interval}, created_at) AS period
        FROM all_connections
      ),
      all_types AS (
        SELECT DISTINCT connection_type
        FROM all_connections
      ),
      period_type_grid AS (
        SELECT p.period, t.connection_type
        FROM all_periods p
        CROSS JOIN all_types t
      ),
      period_counts AS (
        SELECT
          date_trunc(${interval}, created_at) AS period,
          connection_type,
          COUNT(*)::int AS period_count
        FROM all_connections
        GROUP BY 1, 2
      ),
      cumulative_counts AS (
        SELECT
          ptg.period,
          ptg.connection_type,
          SUM(COALESCE(pc.period_count, 0)) OVER (
            PARTITION BY ptg.connection_type
            ORDER BY ptg.period
          ) AS cumulative_count
        FROM period_type_grid ptg
        LEFT JOIN period_counts pc ON ptg.period = pc.period AND ptg.connection_type = pc.connection_type
      ),
      connection_aggregated AS (
        SELECT
          period::text AS date,
          jsonb_object_agg(connection_type, cumulative_count) AS by_type,
          SUM(cumulative_count)::int AS total
        FROM cumulative_counts
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
