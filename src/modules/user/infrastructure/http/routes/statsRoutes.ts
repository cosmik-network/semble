import { Router, Request, Response } from 'express';
import { GetUserStatsController } from '../controllers/GetUserStatsController';
import { StatsApiKeyMiddleware } from '../middleware/StatsApiKeyMiddleware';
import { IProductAnalyticsQueryRepository } from '../../../../analytics/domain/IProductAnalyticsQueryRepository';
import { OnboardingStatsComposer } from '../../../../analytics/application/OnboardingStatsComposer';

export const createStatsRoutes = (
  router: Router,
  statsApiKeyMiddleware: StatsApiKeyMiddleware,
  getUserStatsController: GetUserStatsController,
  productAnalyticsQueryRepository: IProductAnalyticsQueryRepository,
  onboardingStatsComposer: OnboardingStatsComposer,
) => {
  // All stats routes require API key authentication
  router.use(statsApiKeyMiddleware.ensureAuthenticated());

  // Get statistics based on type query parameter
  // Example: GET /api/stats?type=growth&interval=day&limit=30
  router.get('/', (req, res) => getUserStatsController.execute(req, res));

  // ---------------------------------------------------------------------------
  // Product analytics endpoints
  //
  // These are wired directly (no controller/use-case layer) since they are
  // read-only dashboard queries that delegate straight to the query repository.
  // Both return a dense, chronological weekly series (gap-filled), so a
  // "current vs prior week" view is just `weeks=2` and the caller compares the
  // last two data points.
  //
  // Shared query parameters (both endpoints):
  //   endWeek?  ISO date string (e.g. "2026-06-15"). Resolved to the ISO week
  //             (Mon–Sun, UTC) it falls in; that becomes the most recent week in
  //             the series. Omitted => the most recent COMPLETED week (the
  //             current in-progress week is excluded).
  //   weeks?    Integer number of weeks of history ending at (and including) the
  //             end week. e.g. 2 = current + prior, 12 / 26 / 52 for graphs.
  //             0 or omitted => all-time (no lower bound). Must be >= 0.
  // ---------------------------------------------------------------------------

  /**
   * GET /api/stats/wac — Weekly Active Curators
   *
   * Query params: endWeek?, weeks?  (see shared params above)
   *
   * Response: WacStatsDTO
   *   {
   *     dataPoints: Array<{
   *       weekStart: string;               // ISO date of the week's Monday
   *       collectionOrConnection: number;  // distinct users who added a card to a
   *                                        //   collection OR created a connection
   *       collectionAdd: number;           // distinct users who added a card to any collection
   *       connection: number;              // distinct users who created a connection
   *       othersCollectionAdd: number;     // distinct users who added a card to SOMEONE
   *                                        //   ELSE'S collection
   *     }>;                                // chronological, oldest -> newest, gap-filled
   *     periodStart: string;               // ISO week-start of the first data point
   *     periodEnd: string;                 // ISO week-start of the last data point
   *   }
   */
  router.get('/wac', async (req: Request, res: Response) => {
    try {
      const { endWeek, weeks } = parseAnalyticsQuery(req);
      const result = await productAnalyticsQueryRepository.getWacStats({
        endWeek,
        weeks,
      });
      return res.status(200).json(result);
    } catch (error: any) {
      return res
        .status(400)
        .json({ message: error?.message ?? 'Failed to load WAC stats' });
    }
  });

  /**
   * GET /api/stats/activation-funnel — weekly signup-cohort activation funnel
   *
   * Query params: endWeek?, weeks?  (see shared params above). Here the weeks
   * select signup-cohort weeks; rung counts may include actions taken AFTER the
   * cohort week (within each rung's 7/14/30-day window from each user's signup).
   *
   * Each rung is counted INDEPENDENTLY against the signup cohort (rungs are not
   * nested). Derive percentages client-side as rung / signups.
   *
   * Response: ActivationFunnelStatsDTO
   *   {
   *     dataPoints: Array<{
   *       cohortWeekStart: string;  // ISO date of the signup week's Monday
   *       signups: number;          // rung 0: users who signed up that week
   *       savedUrlCard7d: number;   // rung 1: saved a URL card within 7d of signup
   *       curated14d: number;       // rung 2: added to a collection OR connected within 14d
   *       notified30d: number;      // rung 3: received a notification within 30d
   *     }>;                         // chronological, oldest -> newest, gap-filled
   *     periodStart: string;        // ISO cohort-week-start of the first data point
   *     periodEnd: string;          // ISO cohort-week-start of the last data point
   *   }
   */
  router.get('/activation-funnel', async (req: Request, res: Response) => {
    try {
      const { endWeek, weeks } = parseAnalyticsQuery(req);
      const result =
        await productAnalyticsQueryRepository.getActivationFunnelStats({
          endWeek,
          weeks,
        });
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({
        message: error?.message ?? 'Failed to load activation funnel stats',
      });
    }
  });

  /**
   * GET /api/stats/api-usage — non-webapp API usage per client source
   *
   * Aggregates api_request_logs (one row per authenticated API-key / bearer-JWT
   * call; webapp cookie traffic is never logged). Sources are the client's
   * self-declared X-Semble-Client header ('mcp', plugin names, ...) or inferred:
   * 'api' for generic API-key consumers, 'extension' for bearer-JWT clients.
   *
   * Query params: endWeek?, weeks?  (see shared params above)
   *
   * Response: ApiUsageStatsDTO
   *   {
   *     dataPoints: Array<{
   *       weekStart: string;              // ISO date of the week's Monday
   *       sources: Array<{                // sorted by calls desc (ties: source asc)
   *         source: string;
   *         users: number;                // distinct users that week
   *         calls: number;                // total requests that week
   *       }>;
   *     }>;                               // chronological, oldest -> newest, gap-filled
   *     totals: Array<{                   // whole-period, sorted by calls desc
   *       source: string;
   *       users: number;
   *       calls: number;
   *       topEndpoints: Array<{           // top 10 by calls desc
   *         method: string;
   *         endpoint: string;             // route pattern, e.g. /xrpc/cards/:id
   *         calls: number;
   *         users: number;
   *       }>;
   *     }>;
   *     periodStart: string;
   *     periodEnd: string;
   *   }
   */
  router.get('/api-usage', async (req: Request, res: Response) => {
    try {
      const { endWeek, weeks } = parseAnalyticsQuery(req);
      const result = await productAnalyticsQueryRepository.getApiUsageStats({
        endWeek,
        weeks,
      });
      return res.status(200).json(result);
    } catch (error: any) {
      return res
        .status(400)
        .json({ message: error?.message ?? 'Failed to load API usage stats' });
    }
  });

  // ---------------------------------------------------------------------------
  // Onboarding stats
  //
  // Stats over the onboarding_state table. All "total" counts consider only
  // users who signed up on/after ONBOARDING_LAUNCH_DATE (see
  // OnboardingStatsQueryService), minus internal accounts. Stored onboarding
  // values are untrusted client input: account values are DIDs, collection /
  // connection values are internal UUIDs; unresolvable ones are returned as
  // id-only stubs (counts stay truthful).
  // ---------------------------------------------------------------------------

  /**
   * GET /api/stats/onboarding/weekly — one weekly signup cohort, hydrated
   *
   * Query params:
   *   endWeek?  ISO date string; resolved to the ISO week (Mon–Sun, UTC) it
   *             falls in — that week is the cohort. Omitted => the most recent
   *             COMPLETED week.
   *
   * Response: OnboardingWeeklyStatsDTO. Each dimension carries
   * { totalUserCount, weeklyUserCount, weeklyUsers } where weeklyUsers are
   * minimal profiles of the cohort users. Per-value breakdowns (topics, links,
   * accounts, collections, …) include only values present in the cohort week,
   * but each value's totalUserCount spans all users since launch.
   */
  router.get('/onboarding/weekly', async (req: Request, res: Response) => {
    try {
      const { endWeek } = parseAnalyticsQuery(req);
      const result = await onboardingStatsComposer.getWeeklyStats({ endWeek });
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({
        message: error?.message ?? 'Failed to load onboarding weekly stats',
      });
    }
  });

  /**
   * GET /api/stats/onboarding/summary — all-time (since launch) totals
   *
   * Response: OnboardingSummaryStatsDTO. Aggregate counts only — ranked
   * per-value lists with totalUserCount, no per-user lists. Accounts and
   * collections in the ranked lists are still hydrated; firstCollections /
   * firstConnection are totals only (hydrating every user's first item is
   * unbounded).
   */
  router.get('/onboarding/summary', async (_req: Request, res: Response) => {
    try {
      const result = await onboardingStatsComposer.getSummaryStats();
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(400).json({
        message: error?.message ?? 'Failed to load onboarding summary stats',
      });
    }
  });

  return router;
};

/**
 * Parse and validate the shared analytics query params (endWeek, weeks).
 * Throws on invalid input so the route can return a 400.
 */
function parseAnalyticsQuery(req: Request): {
  endWeek?: string;
  weeks?: number;
} {
  const { endWeek, weeks } = req.query;

  let parsedEndWeek: string | undefined;
  if (endWeek !== undefined) {
    parsedEndWeek = String(endWeek);
    if (isNaN(new Date(parsedEndWeek).getTime())) {
      throw new Error('endWeek must be a valid date string');
    }
  }

  let parsedWeeks: number | undefined;
  if (weeks !== undefined) {
    parsedWeeks = parseInt(String(weeks), 10);
    if (isNaN(parsedWeeks) || parsedWeeks < 0) {
      throw new Error('weeks must be a non-negative integer');
    }
  }

  return { endWeek: parsedEndWeek, weeks: parsedWeeks };
}
