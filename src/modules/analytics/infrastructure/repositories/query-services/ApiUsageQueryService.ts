import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import {
  AnalyticsWeekOptions,
  ApiUsageDataPoint,
  ApiUsageSourceTotals,
  ApiUsageStatsDTO,
} from '../../../domain/IProductAnalyticsQueryRepository';
import {
  resolveWeekRange,
  enumerateWeekStarts,
  weekStartKey,
} from './weekRange';
import { EXCLUDED_ANALYTICS_USER_IDS } from './excludedUsers';

const TOP_ENDPOINTS_LIMIT = 10;

interface WeeklyRow {
  week_start: string | Date;
  source: string;
  users: number;
  calls: number;
}

interface TotalsRow {
  source: string;
  users: number;
  calls: number;
}

interface EndpointRow {
  source: string;
  method: string;
  endpoint: string;
  users: number;
  calls: number;
}

/**
 * Aggregates api_request_logs (one row per authenticated non-webapp API call)
 * into per-client-source usage stats: a dense weekly series plus period totals
 * with each source's most-called endpoints.
 */
export class ApiUsageQueryService {
  constructor(private db: PostgresJsDatabase) {}

  async getApiUsageStats(
    options: AnalyticsWeekOptions,
  ): Promise<ApiUsageStatsDTO> {
    const range = resolveWeekRange(options.endWeek, options.weeks, new Date());

    const lowerCondition = range.lowerBound
      ? sql`created_at >= ${range.lowerBound.toISOString()}`
      : sql`TRUE`;
    const excludedUsersCondition =
      EXCLUDED_ANALYTICS_USER_IDS.length > 0
        ? sql`user_did NOT IN (${sql.join(
            EXCLUDED_ANALYTICS_USER_IDS.map((id) => sql`${id}`),
            sql`, `,
          )})`
        : sql`TRUE`;
    const baseWhere = sql`${lowerCondition}
      AND created_at < ${range.upperBoundExclusive.toISOString()}
      AND ${excludedUsersCondition}`;

    const weeklyRows = (await this.db.execute(sql`
      SELECT
        date_trunc('week', created_at) AS week_start,
        source,
        COUNT(DISTINCT user_did)::int AS users,
        COUNT(*)::int AS calls
      FROM api_request_logs
      WHERE ${baseWhere}
      GROUP BY week_start, source
      ORDER BY week_start, calls DESC, source
    `)) as unknown as WeeklyRow[];

    const totalsRows = (await this.db.execute(sql`
      SELECT
        source,
        COUNT(DISTINCT user_did)::int AS users,
        COUNT(*)::int AS calls
      FROM api_request_logs
      WHERE ${baseWhere}
      GROUP BY source
      ORDER BY calls DESC, source
    `)) as unknown as TotalsRow[];

    const endpointRows = (await this.db.execute(sql`
      SELECT source, method, endpoint, users, calls
      FROM (
        SELECT
          source,
          method,
          endpoint,
          COUNT(DISTINCT user_did)::int AS users,
          COUNT(*)::int AS calls,
          ROW_NUMBER() OVER (
            PARTITION BY source
            ORDER BY COUNT(*) DESC, endpoint, method
          ) AS rank
        FROM api_request_logs
        WHERE ${baseWhere}
        GROUP BY source, method, endpoint
      ) ranked
      WHERE rank <= ${TOP_ENDPOINTS_LIMIT}
      ORDER BY source, calls DESC, endpoint, method
    `)) as unknown as EndpointRow[];

    // Gap-fill the weekly series onto the dense week list.
    const byWeek = new Map<string, WeeklyRow[]>();
    for (const row of weeklyRows) {
      const key = weekStartKey(row.week_start);
      const rows = byWeek.get(key) ?? [];
      rows.push(row);
      byWeek.set(key, rows);
    }

    const firstRowWeekStart =
      weeklyRows.length > 0 ? new Date(weeklyRows[0]!.week_start) : null;
    const weekStarts = enumerateWeekStarts(range, firstRowWeekStart);

    const dataPoints: ApiUsageDataPoint[] = weekStarts.map((weekStart) => ({
      weekStart,
      sources: (byWeek.get(weekStart) ?? []).map((row) => ({
        source: row.source,
        users: row.users,
        calls: row.calls,
      })),
    }));

    const endpointsBySource = new Map<string, EndpointRow[]>();
    for (const row of endpointRows) {
      const rows = endpointsBySource.get(row.source) ?? [];
      rows.push(row);
      endpointsBySource.set(row.source, rows);
    }

    const totals: ApiUsageSourceTotals[] = totalsRows.map((row) => ({
      source: row.source,
      users: row.users,
      calls: row.calls,
      topEndpoints: (endpointsBySource.get(row.source) ?? []).map((e) => ({
        method: e.method,
        endpoint: e.endpoint,
        calls: e.calls,
        users: e.users,
      })),
    }));

    const periodStart =
      dataPoints[0]?.weekStart ?? range.endWeekStart.toISOString();
    const periodEnd =
      dataPoints[dataPoints.length - 1]?.weekStart ??
      range.endWeekStart.toISOString();

    return { dataPoints, totals, periodStart, periodEnd };
  }
}
