import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql, SQL } from 'drizzle-orm';
import {
  OnboardingArrayDimension,
  OnboardingDimensionCountsRaw,
  OnboardingMilestoneDimension,
  OnboardingStatsRaw,
  OnboardingValueStatRaw,
} from '../../../domain/IProductAnalyticsQueryRepository';
import { resolveWeekRange } from './weekRange';
import { EXCLUDED_ANALYTICS_USER_IDS } from './excludedUsers';

// TODO: set to the actual onboarding feature launch date before relying on
// the "total" counts — everything before this date is excluded.
export const ONBOARDING_LAUNCH_DATE = '2026-08-01T00:00:00Z';

/** Cap on ranked per-value lists so untrusted free-text can't blow up responses. */
const VALUE_STATS_LIMIT = 200;

// Column allowlists — the ONLY strings ever passed to sql.raw below.
const ARRAY_DIMENSION_COLUMNS: Record<OnboardingArrayDimension, string> = {
  topicsSelected: 'topics_selected',
  linksSuggested: 'links_suggested',
  linksSelected: 'links_selected',
  suggestedAccounts: 'suggested_accounts',
  suggestedCollections: 'suggested_collections',
  followedAccounts: 'followed_accounts',
  followedCollections: 'followed_collections',
  firstCards: 'first_cards',
  intention: 'intention',
  referralSource: 'referral_source',
};

const MILESTONE_COLUMNS: Record<OnboardingMilestoneDimension, string> = {
  pwaClicked: 'pwa_clicked',
  iosShortcutClicked: 'ios_shortcut_clicked',
  browserExtensionClicked: 'browser_extension_clicked',
  mcpClicked: 'mcp_clicked',
  saveModalGuideCompleted: 'save_modal_guide_completed',
  connectionCreationModalCompleted: 'connection_creation_modal_completed',
  semblePageNavigationCompleted: 'semble_page_navigation_completed',
};

const SINGLE_VALUE_COLUMNS = ['first_collection', 'first_connection'] as const;

interface ValueStatRow {
  value: string;
  total_user_count: number;
  weekly_user_count: number;
  weekly_user_ids: string[];
}

export class OnboardingStatsQueryService {
  constructor(private db: PostgresJsDatabase) {}

  async getWeeklyStats(options: {
    endWeek?: string;
  }): Promise<OnboardingStatsRaw> {
    const range = resolveWeekRange(options.endWeek, 1, new Date());
    return this.getStats({
      cohortWeekStart: range.endWeekStart,
      cohortWeekEnd: range.upperBoundExclusive,
    });
  }

  async getSummaryStats(): Promise<OnboardingStatsRaw> {
    return this.getStats(null);
  }

  /**
   * `week` null => summary mode: all weekly counts are 0 and all weekly id
   * lists empty; per-value stats are not restricted to a cohort week.
   */
  private async getStats(
    week: { cohortWeekStart: Date; cohortWeekEnd: Date } | null,
  ): Promise<OnboardingStatsRaw> {
    const inWeekExpr = week
      ? sql`(us.linked_at >= ${week.cohortWeekStart.toISOString()} AND us.linked_at < ${week.cohortWeekEnd.toISOString()})`
      : sql`FALSE`;

    const excludedUsersCondition =
      EXCLUDED_ANALYTICS_USER_IDS.length > 0
        ? sql`us.id NOT IN (${sql.join(
            EXCLUDED_ANALYTICS_USER_IDS.map((id) => sql`${id}`),
            sql`, `,
          )})`
        : sql`TRUE`;

    // Users since launch, one row each, with their onboarding state (if any).
    const cohortCte = sql`
      SELECT us.id, ${inWeekExpr} AS in_week, os.*
      FROM users us
      LEFT JOIN onboarding_state os ON os.user_id = us.id
      WHERE us.linked_at >= ${ONBOARDING_LAUNCH_DATE}
        AND ${excludedUsersCondition}
    `;

    const [countsRow, stateRows, valueStats, singleValueRows] =
      await Promise.all([
        this.fetchDimensionCounts(cohortCte),
        this.fetchStateBreakdown(cohortCte),
        this.fetchAllValueStats(
          inWeekExpr,
          excludedUsersCondition,
          week !== null,
        ),
        week
          ? this.fetchWeeklySingleValues(week, excludedUsersCondition)
          : Promise.resolve([]),
      ]);

    const dimensions = {} as OnboardingStatsRaw['dimensions'];
    for (const key of Object.keys(
      ARRAY_DIMENSION_COLUMNS,
    ) as OnboardingArrayDimension[]) {
      dimensions[key] = {
        ...this.countsFromRow(countsRow, ARRAY_DIMENSION_COLUMNS[key]),
        stats: valueStats[key],
      };
    }

    const milestones = {} as OnboardingStatsRaw['milestones'];
    for (const key of Object.keys(
      MILESTONE_COLUMNS,
    ) as OnboardingMilestoneDimension[]) {
      milestones[key] = this.countsFromRow(countsRow, MILESTONE_COLUMNS[key]);
    }

    return {
      cohortWeekStart: week ? week.cohortWeekStart.toISOString() : null,
      totalNewUserCount: (countsRow.total_new_users as number) ?? 0,
      weeklyNewUsersCount: (countsRow.weekly_new_users as number) ?? 0,
      onboardingState: stateRows,
      dimensions,
      firstCollection: {
        ...this.countsFromRow(countsRow, 'first_collection'),
        weeklyValues: singleValueRows
          .filter((r) => r.firstCollection)
          .map((r) => ({ userId: r.userId, value: r.firstCollection! })),
      },
      firstConnection: {
        ...this.countsFromRow(countsRow, 'first_connection'),
        weeklyValues: singleValueRows
          .filter((r) => r.firstConnection)
          .map((r) => ({ userId: r.userId, value: r.firstConnection! })),
      },
      milestones,
    };
  }

  /**
   * One round-trip producing, per dimension column, a
   * {total, weekly, weekly_ids} triple plus the overall signup counts.
   */
  private async fetchDimensionCounts(
    cohortCte: SQL,
  ): Promise<Record<string, unknown>> {
    const presenceConditions: Array<{ column: string; condition: SQL }> = [
      ...Object.values(ARRAY_DIMENSION_COLUMNS).map((column) => ({
        column,
        condition: sql`cardinality(${sql.raw(column)}) > 0`,
      })),
      ...Object.values(MILESTONE_COLUMNS).map((column) => ({
        column,
        condition: sql`${sql.raw(column)} IS NOT NULL`,
      })),
      ...SINGLE_VALUE_COLUMNS.map((column) => ({
        column,
        condition: sql`(${sql.raw(column)} IS NOT NULL AND btrim(${sql.raw(column)}) <> '')`,
      })),
    ];

    const tripleSelects = presenceConditions.map(
      ({ column, condition }) => sql`
        COUNT(*) FILTER (WHERE ${condition})::int AS ${sql.raw(`${column}_total`)},
        COUNT(*) FILTER (WHERE in_week AND ${condition})::int AS ${sql.raw(`${column}_weekly`)},
        COALESCE(array_agg(id) FILTER (WHERE in_week AND ${condition}), '{}') AS ${sql.raw(`${column}_weekly_ids`)}`,
    );

    const query = sql`
      WITH u AS (${cohortCte})
      SELECT
        COUNT(*)::int AS total_new_users,
        COUNT(*) FILTER (WHERE in_week)::int AS weekly_new_users,
        ${sql.join(tripleSelects, sql`, `)}
      FROM u
    `;

    const rows = (await this.db.execute(query)) as unknown as Array<
      Record<string, unknown>
    >;
    return rows[0] ?? {};
  }

  private countsFromRow(
    row: Record<string, unknown>,
    column: string,
  ): OnboardingDimensionCountsRaw {
    return {
      totalUserCount: (row[`${column}_total`] as number) ?? 0,
      weeklyUserCount: (row[`${column}_weekly`] as number) ?? 0,
      weeklyUserIds: (row[`${column}_weekly_ids`] as string[]) ?? [],
    };
  }

  private async fetchStateBreakdown(
    cohortCte: SQL,
  ): Promise<OnboardingStatsRaw['onboardingState']> {
    // Users with no onboarding row count as NOT_STARTED.
    const query = sql`
      WITH u AS (${cohortCte})
      SELECT
        COALESCE(onboarding_state, 'NOT_STARTED') AS state,
        COUNT(*)::int AS total_user_count,
        COUNT(*) FILTER (WHERE in_week)::int AS weekly_user_count,
        COALESCE(array_agg(id) FILTER (WHERE in_week), '{}') AS weekly_user_ids
      FROM u
      GROUP BY 1
      ORDER BY total_user_count DESC, state
    `;

    const rows = (await this.db.execute(query)) as unknown as Array<{
      state: string;
      total_user_count: number;
      weekly_user_count: number;
      weekly_user_ids: string[];
    }>;

    return rows.map((row) => ({
      state: row.state,
      totalUserCount: row.total_user_count ?? 0,
      weeklyUserCount: row.weekly_user_count ?? 0,
      weeklyUserIds: row.weekly_user_ids ?? [],
    }));
  }

  private async fetchAllValueStats(
    inWeekExpr: SQL,
    excludedUsersCondition: SQL,
    weeklyMode: boolean,
  ): Promise<Record<OnboardingArrayDimension, OnboardingValueStatRaw[]>> {
    const keys = Object.keys(
      ARRAY_DIMENSION_COLUMNS,
    ) as OnboardingArrayDimension[];

    const results = await Promise.all(
      keys.map((key) =>
        this.fetchValueStatsForColumn(
          ARRAY_DIMENSION_COLUMNS[key],
          inWeekExpr,
          excludedUsersCondition,
          weeklyMode,
        ),
      ),
    );

    const out = {} as Record<
      OnboardingArrayDimension,
      OnboardingValueStatRaw[]
    >;
    keys.forEach((key, i) => {
      out[key] = results[i]!;
    });
    return out;
  }

  /**
   * Per-value breakdown of one text[] column. In weekly mode the HAVING clause
   * keeps only values selected by cohort-week users, while total_user_count
   * still spans all users since launch.
   */
  private async fetchValueStatsForColumn(
    column: string,
    inWeekExpr: SQL,
    excludedUsersCondition: SQL,
    weeklyMode: boolean,
  ): Promise<OnboardingValueStatRaw[]> {
    const query = sql`
      WITH u AS (
        SELECT us.id, ${inWeekExpr} AS in_week, os.${sql.raw(column)} AS vals
        FROM users us
        JOIN onboarding_state os ON os.user_id = us.id
        WHERE us.linked_at >= ${ONBOARDING_LAUNCH_DATE}
          AND ${excludedUsersCondition}
      ),
      exploded AS (
        SELECT id, in_week, v AS value
        FROM u, unnest(vals) AS v
        WHERE v IS NOT NULL AND btrim(v) <> ''
      )
      SELECT
        value,
        COUNT(DISTINCT id)::int AS total_user_count,
        COUNT(DISTINCT id) FILTER (WHERE in_week)::int AS weekly_user_count,
        COALESCE(array_agg(DISTINCT id) FILTER (WHERE in_week), '{}') AS weekly_user_ids
      FROM exploded
      GROUP BY value
      ${weeklyMode ? sql`HAVING COUNT(DISTINCT id) FILTER (WHERE in_week) > 0` : sql``}
      ORDER BY total_user_count DESC, value
      LIMIT ${VALUE_STATS_LIMIT}
    `;

    const rows = (await this.db.execute(query)) as unknown as ValueStatRow[];
    return rows.map((row) => ({
      value: row.value,
      totalUserCount: row.total_user_count ?? 0,
      weeklyUserCount: row.weekly_user_count ?? 0,
      weeklyUserIds: row.weekly_user_ids ?? [],
    }));
  }

  private async fetchWeeklySingleValues(
    week: { cohortWeekStart: Date; cohortWeekEnd: Date },
    excludedUsersCondition: SQL,
  ): Promise<
    Array<{
      userId: string;
      firstCollection: string | null;
      firstConnection: string | null;
    }>
  > {
    const query = sql`
      SELECT us.id AS user_id, os.first_collection, os.first_connection
      FROM users us
      JOIN onboarding_state os ON os.user_id = us.id
      WHERE us.linked_at >= ${week.cohortWeekStart.toISOString()}
        AND us.linked_at < ${week.cohortWeekEnd.toISOString()}
        AND ${excludedUsersCondition}
        AND (os.first_collection IS NOT NULL OR os.first_connection IS NOT NULL)
    `;

    const rows = (await this.db.execute(query)) as unknown as Array<{
      user_id: string;
      first_collection: string | null;
      first_connection: string | null;
    }>;

    return rows.map((row) => ({
      userId: row.user_id,
      firstCollection: row.first_collection,
      firstConnection: row.first_connection,
    }));
  }
}
