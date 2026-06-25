import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import {
  AnalyticsWeekOptions,
  WacStatsDTO,
  WacDataPoint,
} from '../../../domain/IProductAnalyticsQueryRepository';
import {
  resolveWeekRange,
  enumerateWeekStarts,
  weekStartKey,
} from './weekRange';

interface WacRow {
  week_start: string | Date;
  collection_or_connection: number;
  collection_add: number;
  connection: number;
  others_collection_add: number;
}

export class WacQueryService {
  constructor(private db: PostgresJsDatabase) {}

  async getWacStats(options: AnalyticsWeekOptions): Promise<WacStatsDTO> {
    const range = resolveWeekRange(options.endWeek, options.weeks, new Date());

    const lowerCondition = range.lowerBound
      ? sql`ts >= ${range.lowerBound.toISOString()}`
      : sql`TRUE`;

    const query = sql`
      WITH activity AS (
        SELECT
          cc.added_by AS user_id,
          cc.added_at AS ts,
          (col.author_id <> cc.added_by) AS is_others_collection,
          'collection'::text AS kind
        FROM collection_cards cc
        JOIN collections col ON col.id = cc.collection_id
        UNION ALL
        SELECT
          cn.curator_id AS user_id,
          cn.created_at AS ts,
          false AS is_others_collection,
          'connection'::text AS kind
        FROM connections cn
      )
      SELECT
        date_trunc('week', ts) AS week_start,
        COUNT(DISTINCT user_id)::int AS collection_or_connection,
        COUNT(DISTINCT user_id) FILTER (WHERE kind = 'collection')::int AS collection_add,
        COUNT(DISTINCT user_id) FILTER (WHERE kind = 'connection')::int AS connection,
        COUNT(DISTINCT user_id) FILTER (WHERE is_others_collection)::int AS others_collection_add
      FROM activity
      WHERE ${lowerCondition}
        AND ts < ${range.upperBoundExclusive.toISOString()}
      GROUP BY week_start
      ORDER BY week_start
    `;

    const rows = (await this.db.execute(query)) as unknown as WacRow[];

    // Index sparse rows by normalized week-start key.
    const byWeek = new Map<string, WacRow>();
    for (const row of rows) {
      byWeek.set(weekStartKey(row.week_start), row);
    }

    const firstRowWeekStart =
      rows.length > 0 ? new Date(rows[0]!.week_start) : null;
    const weekStarts = enumerateWeekStarts(range, firstRowWeekStart);

    const dataPoints: WacDataPoint[] = weekStarts.map((weekStart) => {
      const row = byWeek.get(weekStart);
      return {
        weekStart,
        collectionOrConnection: row?.collection_or_connection ?? 0,
        collectionAdd: row?.collection_add ?? 0,
        connection: row?.connection ?? 0,
        othersCollectionAdd: row?.others_collection_add ?? 0,
      };
    });

    const periodStart =
      dataPoints[0]?.weekStart ?? range.endWeekStart.toISOString();
    const periodEnd =
      dataPoints[dataPoints.length - 1]?.weekStart ??
      range.endWeekStart.toISOString();

    return { dataPoints, periodStart, periodEnd };
  }
}
