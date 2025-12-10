import { Router } from 'express';
import { GetMyNotificationsController } from '../controllers/GetMyNotificationsController';
import { GetUnreadNotificationCountController } from '../controllers/GetUnreadNotificationCountController';
import { MarkNotificationsAsReadController } from '../controllers/MarkNotificationsAsReadController';
import { MarkAllNotificationsAsReadController } from '../controllers/MarkAllNotificationsAsReadController';
import { AuthMiddleware } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export function createNotificationRoutes(
  authMiddleware: AuthMiddleware,
  getMyNotificationsController: GetMyNotificationsController,
  getUnreadNotificationCountController: GetUnreadNotificationCountController,
  markNotificationsAsReadController: MarkNotificationsAsReadController,
  markAllNotificationsAsReadController: MarkAllNotificationsAsReadController,
): Router {
  const router = Router();

  // GET /api/notifications - Get my notifications
  router.get('/', authMiddleware.ensureAuthenticated(), (req, res) =>
    getMyNotificationsController.execute(req, res),
  );

  // GET /api/notifications/unread-count - Get unread notification count
  router.get('/unread-count', authMiddleware.ensureAuthenticated(), (req, res) =>
    getUnreadNotificationCountController.execute(req, res),
  );

  // POST /api/notifications/mark-read - Mark notifications as read
  router.post('/mark-read', authMiddleware.ensureAuthenticated(), (req, res) =>
    markNotificationsAsReadController.execute(req, res),
  );

  // POST /api/notifications/mark-all-read - Mark all notifications as read
  router.post('/mark-all-read', authMiddleware.ensureAuthenticated(), (req, res) =>
    markAllNotificationsAsReadController.execute(req, res),
  );

  return router;
}
