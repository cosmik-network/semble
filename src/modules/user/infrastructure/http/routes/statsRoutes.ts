import { Router } from 'express';
import { GetUserStatsController } from '../controllers/GetUserStatsController';
import { StatsApiKeyMiddleware } from '../middleware/StatsApiKeyMiddleware';

export const createStatsRoutes = (
  router: Router,
  statsApiKeyMiddleware: StatsApiKeyMiddleware,
  getUserStatsController: GetUserStatsController,
) => {
  // All stats routes require API key authentication
  router.use(statsApiKeyMiddleware.ensureAuthenticated());

  // Get statistics based on type query parameter
  // Example: GET /api/stats?type=growth&interval=day&limit=30
  router.get('/', (req, res) => getUserStatsController.execute(req, res));

  // Future stats routes can be added here
  // router.get('/users/activity', ...)
  // router.get('/users/engagement', ...)
  // router.get('/content/metrics', ...)

  return router;
};
