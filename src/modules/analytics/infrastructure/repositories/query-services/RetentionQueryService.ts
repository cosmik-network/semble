import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql, SQL } from 'drizzle-orm';
import {
  AnalyticsWeekOptions,
  RetentionStatsDTO,
  RetentionCohortDataPoint,
  RetentionWeekCell,
  RetentionSegmentBy,
  RetentionSegmentsStatsDTO,
  RetentionSegmentDataPoint,
  RetentionSegmentWeekCell,
} from '../../../domain/IProductAnalyticsQueryRepository';
import {
  resolveWeekRange,
  enumerateWeekStarts,
  weekStartKey,
  startOfIsoWeekUTC,
} from './weekRange';
import { EXCLUDED_ANALYTICS_USER_IDS } from './excludedUsers';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface CohortSizeRow {
  cohort_week_start: string | Date;
  cohort_size: number;
}

interface RetentionCellRow {
  cohort_week_start: string | Date;
  week_offset: number;
  active_users: number;
  curating_users: number;
}

interface SegmentSizeRow {
  segment: string;
  cohort_week_start: string | Date;
  user_count: number;
}

interface SegmentCellRow {
  segment: string;
  week_offset: number;
  active_users: number;
  curating_users: number;
}

const RETENTION_SEGMENT_BY_VALUES: readonly RetentionSegmentBy[] = [
  'onboardingState',
  'notifiedFirstWeek',
];

export function isRetentionSegmentBy(
  value: string,
): value is RetentionSegmentBy {
  return (RETENTION_SEGMENT_BY_VALUES as readonly string[]).includes(value);
}

/**
 * Weekly signup-cohort retention, calendar-week anchored: a user's activity
 * week is date_trunc('week', ts) and weekOffset = (activity week - cohort
 * week) in weeks. Offset 0 (the signup week itself) is the activation
 * funnel's job and is omitted. Cells exist only for fully COMPLETED calendar
 * weeks (relative to now), so every reported cell is final regardless of the
 * endWeek/weeks cohort selection.
 */
export class RetentionQueryService {
  constructor(private db: PostgresJsDatabase) {}

  async getRetentionStats(
    options: AnalyticsWeekOptions,
  ): Promise<RetentionStatsDTO> {
    const now = new Date();
    const range = resolveWeekRange(options.endWeek, options.weeks, now);
    const activityUpperExclusive = this.activityUpperExclusive(range, now);

    const cohortCte = this.cohortCte(
      range.lowerBound,
      range.upperBoundExclusive,
    );

    const sizeQuery = sql`
      ${cohortCte}
      SELECT cohort_week AS cohort_week_start, COUNT(*)::int AS cohort_size
      FROM cohort
      GROUP BY cohort_week
      ORDER BY cohort_week
    `;

    const cellQuery = sql`
      ${cohortCte},
      ${this.activityCte(range.lowerBound, activityUpperExclusive)}
      SELECT
        c.cohort_week AS cohort_week_start,
        (extract(epoch FROM (date_trunc('week', a.ts) - c.cohort_week)) / 604800)::int AS week_offset,
        COUNT(DISTINCT a.user_id)::int AS active_users,
        COUNT(DISTINCT a.user_id) FILTER (WHERE a.is_curation)::int AS curating_users
      FROM cohort c
      JOIN activity a ON a.user_id = c.user_id
      WHERE date_trunc('week', a.ts) > c.cohort_week
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;

    const sizeRows = (await this.db.execute(
      sizeQuery,
    )) as unknown as CohortSizeRow[];
    const cellRows = (await this.db.execute(
      cellQuery,
    )) as unknown as RetentionCellRow[];

    const sizeByWeek = new Map<string, number>();
    for (const row of sizeRows) {
      sizeByWeek.set(weekStartKey(row.cohort_week_start), row.cohort_size);
    }
    const cellByKey = new Map<string, RetentionCellRow>();
    for (const row of cellRows) {
      cellByKey.set(
        `${weekStartKey(row.cohort_week_start)}|${row.week_offset}`,
        row,
      );
    }

    const firstRowWeekStart =
      sizeRows.length > 0 ? new Date(sizeRows[0]!.cohort_week_start) : null;
    const cohortWeekStarts = enumerateWeekStarts(range, firstRowWeekStart);

    const dataPoints: RetentionCohortDataPoint[] = cohortWeekStarts.map(
      (cohortWeekStart) => {
        const maxOffset = this.maxCompletedOffset(
          cohortWeekStart,
          activityUpperExclusive,
        );
        const weeks: RetentionWeekCell[] = [];
        for (let offset = 1; offset <= maxOffset; offset++) {
          const cell = cellByKey.get(`${cohortWeekStart}|${offset}`);
          weeks.push({
            weekOffset: offset,
            activeUsers: cell?.active_users ?? 0,
            curatingUsers: cell?.curating_users ?? 0,
          });
        }
        return {
          cohortWeekStart,
          cohortSize: sizeByWeek.get(cohortWeekStart) ?? 0,
          weeks,
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

  /**
   * Cohorts in the range are POOLED and split by a per-user segment; each
   * segment gets one aggregate retention curve. Because newer users haven't
   * been around long enough for the later offsets, each cell reports
   * eligibleUsers (segment users whose signup week is old enough for that
   * offset to be complete) — that is the rate denominator, not userCount.
   */
  async getRetentionSegmentsStats(
    options: AnalyticsWeekOptions & { segmentBy: RetentionSegmentBy },
  ): Promise<RetentionSegmentsStatsDTO> {
    const { segmentBy } = options;
    if (!isRetentionSegmentBy(segmentBy)) {
      throw new Error(
        `segmentBy must be one of: ${RETENTION_SEGMENT_BY_VALUES.join(', ')}`,
      );
    }

    const now = new Date();
    const range = resolveWeekRange(options.endWeek, options.weeks, now);
    const activityUpperExclusive = this.activityUpperExclusive(range, now);

    const cohortCte = this.segmentedCohortCte(
      segmentBy,
      range.lowerBound,
      range.upperBoundExclusive,
    );

    const sizeQuery = sql`
      ${cohortCte}
      SELECT segment, cohort_week AS cohort_week_start, COUNT(*)::int AS user_count
      FROM cohort
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;

    const cellQuery = sql`
      ${cohortCte},
      ${this.activityCte(range.lowerBound, activityUpperExclusive)}
      SELECT
        c.segment,
        (extract(epoch FROM (date_trunc('week', a.ts) - c.cohort_week)) / 604800)::int AS week_offset,
        COUNT(DISTINCT a.user_id)::int AS active_users,
        COUNT(DISTINCT a.user_id) FILTER (WHERE a.is_curation)::int AS curating_users
      FROM cohort c
      JOIN activity a ON a.user_id = c.user_id
      WHERE date_trunc('week', a.ts) > c.cohort_week
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;

    const sizeRows = (await this.db.execute(
      sizeQuery,
    )) as unknown as SegmentSizeRow[];
    const cellRows = (await this.db.execute(
      cellQuery,
    )) as unknown as SegmentCellRow[];

    // Oldest pooled cohort week: explicit lower bound, else earliest row.
    let oldestCohortMs: number | null = range.lowerBound?.getTime() ?? null;
    if (oldestCohortMs === null) {
      for (const row of sizeRows) {
        const ms = new Date(row.cohort_week_start).getTime();
        if (oldestCohortMs === null || ms < oldestCohortMs) {
          oldestCohortMs = ms;
        }
      }
    }
    const maxOffset =
      oldestCohortMs === null
        ? 0
        : this.maxCompletedOffset(
            new Date(oldestCohortMs).toISOString(),
            activityUpperExclusive,
          );

    // segment -> cohort-week sizes (for eligibility) and total user count.
    const segments = new Map<
      string,
      { userCount: number; cohorts: Array<{ weekMs: number; count: number }> }
    >();
    for (const row of sizeRows) {
      const entry = segments.get(row.segment) ?? { userCount: 0, cohorts: [] };
      entry.userCount += row.user_count;
      entry.cohorts.push({
        weekMs: new Date(row.cohort_week_start).getTime(),
        count: row.user_count,
      });
      segments.set(row.segment, entry);
    }

    const cellByKey = new Map<string, SegmentCellRow>();
    for (const row of cellRows) {
      cellByKey.set(`${row.segment}|${row.week_offset}`, row);
    }

    const lastCompleteWeekMs = activityUpperExclusive.getTime() - WEEK_MS;
    const dataPoints: RetentionSegmentDataPoint[] = Array.from(
      segments.entries(),
    ).map(([segment, entry]) => {
      const weeks: RetentionSegmentWeekCell[] = [];
      for (let offset = 1; offset <= maxOffset; offset++) {
        // Eligible = users whose cohort week + offset is still a completed week.
        const eligibleUsers = entry.cohorts.reduce(
          (total, cohort) =>
            cohort.weekMs + offset * WEEK_MS <= lastCompleteWeekMs
              ? total + cohort.count
              : total,
          0,
        );
        const cell = cellByKey.get(`${segment}|${offset}`);
        weeks.push({
          weekOffset: offset,
          eligibleUsers,
          activeUsers: cell?.active_users ?? 0,
          curatingUsers: cell?.curating_users ?? 0,
        });
      }
      return { segment, userCount: entry.userCount, weeks };
    });

    dataPoints.sort(
      (a, b) => b.userCount - a.userCount || a.segment.localeCompare(b.segment),
    );

    const firstRowWeekStart =
      oldestCohortMs !== null ? new Date(oldestCohortMs) : null;
    const cohortWeekStarts = enumerateWeekStarts(range, firstRowWeekStart);
    const periodStart = cohortWeekStarts[0] ?? range.endWeekStart.toISOString();
    const periodEnd =
      cohortWeekStarts[cohortWeekStarts.length - 1] ??
      range.endWeekStart.toISOString();

    return { segmentBy, dataPoints, periodStart, periodEnd };
  }

  /** Signup cohorts from users.linked_at, minus internal accounts. */
  private cohortCte(lowerBound: Date | null, upperBoundExclusive: Date): SQL {
    return sql`
      WITH cohort AS (
        SELECT
          id AS user_id,
          date_trunc('week', linked_at) AS cohort_week
        FROM users
        WHERE ${this.lowerConditionFor(sql`linked_at`, lowerBound)}
          AND linked_at < ${upperBoundExclusive.toISOString()}
          AND ${this.excludedUsersConditionFor(sql`id`)}
      )
    `;
  }

  /** Cohort CTE with a per-user segment label. */
  private segmentedCohortCte(
    segmentBy: RetentionSegmentBy,
    lowerBound: Date | null,
    upperBoundExclusive: Date,
  ): SQL {
    const segmentExpr =
      segmentBy === 'onboardingState'
        ? // No onboarding_state row (pre-launch signups) => 'NONE'.
          sql`COALESCE(os.onboarding_state, 'NONE')`
        : sql`CASE WHEN EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.recipient_user_id = u.id
              AND n.created_at >= u.linked_at
              AND n.created_at < u.linked_at + interval '7 days'
          ) THEN 'notified' ELSE 'not_notified' END`;

    const joinClause =
      segmentBy === 'onboardingState'
        ? sql`LEFT JOIN onboarding_state os ON os.user_id = u.id`
        : sql``;

    return sql`
      WITH cohort AS (
        SELECT
          u.id AS user_id,
          date_trunc('week', u.linked_at) AS cohort_week,
          ${segmentExpr} AS segment
        FROM users u
        ${joinClause}
        WHERE ${this.lowerConditionFor(sql`u.linked_at`, lowerBound)}
          AND u.linked_at < ${upperBoundExclusive.toISOString()}
          AND ${this.excludedUsersConditionFor(sql`u.id`)}
      )
    `;
  }

  /**
   * All activity that counts toward retention, as a UNION ALL so each branch's
   * time bounds hit the created_at/added_at indexes (see WacQueryService).
   * is_curation marks the stricter WAC tier (collection add / connection).
   * The join back to the cohort CTE handles user filtering, so no excluded-ids
   * predicate is needed here.
   */
  private activityCte(lowerBound: Date | null, upperExclusive: Date): SQL {
    const upperIso = upperExclusive.toISOString();
    return sql`
      activity AS (
        SELECT author_id AS user_id, created_at AS ts, false AS is_curation
        FROM cards
        WHERE ${this.lowerConditionFor(sql`created_at`, lowerBound)}
          AND created_at < ${upperIso}
        UNION ALL
        SELECT author_id, created_at, false
        FROM collections
        WHERE ${this.lowerConditionFor(sql`created_at`, lowerBound)}
          AND created_at < ${upperIso}
        UNION ALL
        SELECT added_by, added_at, true
        FROM collection_cards
        WHERE ${this.lowerConditionFor(sql`added_at`, lowerBound)}
          AND added_at < ${upperIso}
        UNION ALL
        SELECT curator_id, created_at, true
        FROM connections
        WHERE ${this.lowerConditionFor(sql`created_at`, lowerBound)}
          AND created_at < ${upperIso}
        UNION ALL
        SELECT follower_id, created_at, false
        FROM follows
        WHERE ${this.lowerConditionFor(sql`created_at`, lowerBound)}
          AND created_at < ${upperIso}
      )
    `;
  }

  /**
   * Exclusive upper bound on activity timestamps: strictly before the current
   * in-progress week (completed weeks only), and never past the requested end
   * week — so a historical endWeek reproduces the triangle as it stood then.
   * With endWeek omitted the two bounds coincide.
   */
  private activityUpperExclusive(
    range: { upperBoundExclusive: Date },
    now: Date,
  ): Date {
    return new Date(
      Math.min(
        startOfIsoWeekUTC(now).getTime(),
        range.upperBoundExclusive.getTime(),
      ),
    );
  }

  private lowerConditionFor(tsColumn: SQL, lowerBound: Date | null): SQL {
    return lowerBound
      ? sql`${tsColumn} >= ${lowerBound.toISOString()}`
      : sql`TRUE`;
  }

  private excludedUsersConditionFor(userIdColumn: SQL): SQL {
    return EXCLUDED_ANALYTICS_USER_IDS.length > 0
      ? sql`${userIdColumn} NOT IN (${sql.join(
          EXCLUDED_ANALYTICS_USER_IDS.map((id) => sql`${id}`),
          sql`, `,
        )})`
      : sql`TRUE`;
  }

  /** Highest weekOffset for which cohortWeek + offset is a completed week. */
  private maxCompletedOffset(
    cohortWeekStart: string,
    activityUpperExclusive: Date,
  ): number {
    const cohortMs = new Date(cohortWeekStart).getTime();
    return Math.max(
      0,
      Math.floor((activityUpperExclusive.getTime() - cohortMs) / WEEK_MS) - 1,
    );
  }
}
