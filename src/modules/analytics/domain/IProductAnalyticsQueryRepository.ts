// DTOs for Product Analytics (Weekly Active Curators + Activation Funnel)

export interface AnalyticsWeekOptions {
  /**
   * ISO date string. Resolved to the ISO week (Mon–Sun, UTC) it falls in and
   * used as the most recent week in the returned series.
   * Omitted => the most recent COMPLETED week (the current in-progress week is
   * excluded).
   */
  endWeek?: string;
  /**
   * Number of weeks of history ending at (and including) the end week.
   * 2 => current week + prior week (for a comparison view).
   * 0 (or undefined) => all-time (no lower bound).
   */
  weeks?: number;
}

// Weekly Active Curators (WAC)

export interface WacDataPoint {
  weekStart: string; // ISO date of the week's Monday (date_trunc('week'))
  collectionOrConnection: number; // distinct users who added-to-collection OR connected
  collectionAdd: number; // distinct users who added a card to any collection
  connection: number; // distinct users who created a connection
  othersCollectionAdd: number; // distinct users who added to SOMEONE ELSE'S collection
}

export interface WacStatsDTO {
  dataPoints: WacDataPoint[]; // chronological, oldest -> newest, dense (gap-filled)
  periodStart: string;
  periodEnd: string;
}

// Activation Funnel (weekly signup cohorts)

export interface ActivationFunnelDataPoint {
  cohortWeekStart: string; // ISO Monday of the signup week
  signups: number; // rung 0: users whose linked_at is in this week
  savedUrlCard7d: number; // rung 1: saved a type='URL' card within 7d of linked_at
  curated14d: number; // rung 2: collection-add OR connection within 14d
  notified30d: number; // rung 3: received a notification within 30d
}

export interface ActivationFunnelStatsDTO {
  dataPoints: ActivationFunnelDataPoint[]; // chronological, oldest -> newest, dense (gap-filled)
  periodStart: string;
  periodEnd: string;
}

/**
 * Read-only query repository for product-analytics dashboards.
 *
 * Both methods return a dense weekly series. A "current vs prior week"
 * comparison is just `weeks: 2` (the caller picks the last two points).
 *
 * Funnel rungs are counted INDEPENDENTLY against each weekly signup cohort —
 * they are not monotonically nested. Percentages are derived by the caller
 * from these absolute counts.
 */
export interface IProductAnalyticsQueryRepository {
  getWacStats(options: AnalyticsWeekOptions): Promise<WacStatsDTO>;
  getActivationFunnelStats(
    options: AnalyticsWeekOptions,
  ): Promise<ActivationFunnelStatsDTO>;
}
