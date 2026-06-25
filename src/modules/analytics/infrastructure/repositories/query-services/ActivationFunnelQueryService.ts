import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import {
  AnalyticsWeekOptions,
  ActivationFunnelStatsDTO,
  ActivationFunnelDataPoint,
} from '../../../domain/IProductAnalyticsQueryRepository';
import {
  resolveWeekRange,
  enumerateWeekStarts,
  weekStartKey,
} from './weekRange';

interface FunnelRow {
  cohort_week_start: string | Date;
  signups: number;
  saved_url_card_7d: number;
  curated_14d: number;
  notified_30d: number;
}

export class ActivationFunnelQueryService {
  constructor(private db: PostgresJsDatabase) {}

  async getActivationFunnelStats(
    options: AnalyticsWeekOptions,
  ): Promise<ActivationFunnelStatsDTO> {
    const range = resolveWeekRange(options.endWeek, options.weeks, new Date());

    const lowerCondition = range.lowerBound
      ? sql`linked_at >= ${range.lowerBound.toISOString()}`
      : sql`TRUE`;

    const query = sql`
      WITH cohort AS (
        SELECT
          id AS user_id,
          linked_at,
          date_trunc('week', linked_at) AS cohort_week
        FROM users
        WHERE ${lowerCondition}
          AND linked_at < ${range.upperBoundExclusive.toISOString()}
      ),
      r1 AS (
        SELECT DISTINCT c.user_id
        FROM cohort c
        WHERE EXISTS (
          SELECT 1 FROM cards ca
          WHERE ca.author_id = c.user_id
            AND ca.type = 'URL'
            AND ca.created_at >= c.linked_at
            AND ca.created_at < c.linked_at + interval '7 days'
        )
      ),
      r2 AS (
        SELECT DISTINCT c.user_id
        FROM cohort c
        WHERE EXISTS (
          SELECT 1 FROM collection_cards cc
          WHERE cc.added_by = c.user_id
            AND cc.added_at >= c.linked_at
            AND cc.added_at < c.linked_at + interval '14 days'
        ) OR EXISTS (
          SELECT 1 FROM connections cn
          WHERE cn.curator_id = c.user_id
            AND cn.created_at >= c.linked_at
            AND cn.created_at < c.linked_at + interval '14 days'
        )
      ),
      r3 AS (
        SELECT DISTINCT c.user_id
        FROM cohort c
        WHERE EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.recipient_user_id = c.user_id
            AND n.created_at >= c.linked_at
            AND n.created_at < c.linked_at + interval '30 days'
        )
      )
      SELECT
        c.cohort_week AS cohort_week_start,
        COUNT(DISTINCT c.user_id)::int AS signups,
        COUNT(DISTINCT r1.user_id)::int AS saved_url_card_7d,
        COUNT(DISTINCT r2.user_id)::int AS curated_14d,
        COUNT(DISTINCT r3.user_id)::int AS notified_30d
      FROM cohort c
      LEFT JOIN r1 ON r1.user_id = c.user_id
      LEFT JOIN r2 ON r2.user_id = c.user_id
      LEFT JOIN r3 ON r3.user_id = c.user_id
      GROUP BY c.cohort_week
      ORDER BY c.cohort_week
    `;

    const rows = (await this.db.execute(query)) as unknown as FunnelRow[];

    const byWeek = new Map<string, FunnelRow>();
    for (const row of rows) {
      byWeek.set(weekStartKey(row.cohort_week_start), row);
    }

    const firstRowWeekStart =
      rows.length > 0 ? new Date(rows[0]!.cohort_week_start) : null;
    const weekStarts = enumerateWeekStarts(range, firstRowWeekStart);

    const dataPoints: ActivationFunnelDataPoint[] = weekStarts.map(
      (cohortWeekStart) => {
        const row = byWeek.get(cohortWeekStart);
        return {
          cohortWeekStart,
          signups: row?.signups ?? 0,
          savedUrlCard7d: row?.saved_url_card_7d ?? 0,
          curated14d: row?.curated_14d ?? 0,
          notified30d: row?.notified_30d ?? 0,
        };
      },
    );

    const periodStart =
      dataPoints[0]?.cohortWeekStart ?? range.endWeekStart.toISOString();
    const periodEnd =
      dataPoints[dataPoints.length - 1]?.cohortWeekStart ??
      range.endWeekStart.toISOString();

    return { dataPoints, periodStart, periodEnd };
  }
}
