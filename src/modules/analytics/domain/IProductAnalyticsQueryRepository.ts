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

// API usage (per-client-source request analytics over api_request_logs)

export interface ApiUsageSourceWeekly {
  source: string; // 'mcp' | 'extension' | 'api' | future client identifiers
  users: number; // distinct users who called this week via this source
  calls: number; // total requests this week via this source
}

export interface ApiUsageDataPoint {
  weekStart: string; // ISO date of the week's Monday (date_trunc('week'))
  sources: ApiUsageSourceWeekly[]; // sorted by calls desc; empty when no traffic
}

export interface ApiUsageEndpointStat {
  method: string;
  endpoint: string; // route pattern, e.g. /xrpc/cards/:id
  calls: number;
  users: number;
}

export interface ApiUsageSourceTotals {
  source: string;
  users: number; // distinct users over the whole period
  calls: number; // total requests over the whole period
  topEndpoints: ApiUsageEndpointStat[]; // top 10 by calls desc
}

export interface ApiUsageStatsDTO {
  dataPoints: ApiUsageDataPoint[]; // chronological, oldest -> newest, dense (gap-filled)
  totals: ApiUsageSourceTotals[]; // sorted by calls desc
  periodStart: string;
  periodEnd: string;
}

// Onboarding stats (single weekly signup cohort, or all-time summary)

/** onboarding_state text[] columns broken down per stored value. */
export type OnboardingArrayDimension =
  | 'topicsSelected'
  | 'linksSuggested'
  | 'linksSelected'
  | 'suggestedAccounts'
  | 'suggestedCollections'
  | 'followedAccounts'
  | 'followedCollections'
  | 'firstCards'
  | 'intention'
  | 'referralSource';

/** onboarding_state nullable timestamp columns counted by presence. */
export type OnboardingMilestoneDimension =
  | 'pwaClicked'
  | 'iosShortcutClicked'
  | 'browserExtensionClicked'
  | 'mcpClicked'
  | 'saveModalGuideCompleted'
  | 'connectionCreationModalCompleted'
  | 'semblePageNavigationCompleted';

export interface OnboardingDimensionCountsRaw {
  /** Users since the onboarding launch date with a non-empty value. */
  totalUserCount: number;
  /** Subset who signed up in the cohort week (0 in summary mode). */
  weeklyUserCount: number;
  /** DIDs of the cohort-week users (empty in summary mode). */
  weeklyUserIds: string[];
}

export interface OnboardingValueStatRaw extends OnboardingDimensionCountsRaw {
  /** Raw stored string: topic, URL, DID, or UUID depending on the dimension. */
  value: string;
}

/** A cohort-week user's first_collection / first_connection value. */
export interface OnboardingSingleValueRaw {
  userId: string;
  value: string;
}

export interface OnboardingStatsRaw {
  /** ISO Monday of the cohort week; null in summary mode. */
  cohortWeekStart: string | null;
  totalNewUserCount: number;
  weeklyNewUsersCount: number;
  onboardingState: Array<{ state: string } & OnboardingDimensionCountsRaw>;
  dimensions: Record<
    OnboardingArrayDimension,
    OnboardingDimensionCountsRaw & { stats: OnboardingValueStatRaw[] }
  >;
  firstCollection: OnboardingDimensionCountsRaw & {
    weeklyValues: OnboardingSingleValueRaw[];
  };
  firstConnection: OnboardingDimensionCountsRaw & {
    weeklyValues: OnboardingSingleValueRaw[];
  };
  milestones: Record<
    OnboardingMilestoneDimension,
    OnboardingDimensionCountsRaw
  >;
}

/**
 * Read-only query repository for product-analytics dashboards.
 *
 * WAC and activation-funnel return a dense weekly series. A "current vs prior
 * week" comparison is just `weeks: 2` (the caller picks the last two points).
 *
 * Funnel rungs are counted INDEPENDENTLY against each weekly signup cohort —
 * they are not monotonically nested. Percentages are derived by the caller
 * from these absolute counts.
 *
 * The onboarding methods return ID-based raw stats (DIDs / UUIDs / raw
 * strings); hydration to profiles/collections/connections happens in the
 * application layer (OnboardingStatsComposer). In weekly mode, per-value
 * breakdowns include only values present in the cohort week, but each value's
 * totalUserCount still spans all users since the onboarding launch date.
 */
export interface IProductAnalyticsQueryRepository {
  getWacStats(options: AnalyticsWeekOptions): Promise<WacStatsDTO>;
  getApiUsageStats(options: AnalyticsWeekOptions): Promise<ApiUsageStatsDTO>;
  getActivationFunnelStats(
    options: AnalyticsWeekOptions,
  ): Promise<ActivationFunnelStatsDTO>;
  getOnboardingWeeklyStatsRaw(options: {
    endWeek?: string;
  }): Promise<OnboardingStatsRaw>;
  getOnboardingSummaryStatsRaw(): Promise<OnboardingStatsRaw>;
}
