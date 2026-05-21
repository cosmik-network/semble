import { IRouter } from 'express';
import { GetMyNotificationsController } from '../controllers/GetMyNotificationsController';
import { GetUnreadNotificationCountController } from '../controllers/GetUnreadNotificationCountController';
import { MarkNotificationsAsReadController } from '../controllers/MarkNotificationsAsReadController';
import { MarkAllNotificationsAsReadController } from '../controllers/MarkAllNotificationsAsReadController';
import { AuthMiddleware } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { routes } from '@semble/types';

export function registerNotificationRoutes(
  app: IRouter,
  authMiddleware: AuthMiddleware,
  getMyNotificationsController: GetMyNotificationsController,
  getUnreadNotificationCountController: GetUnreadNotificationCountController,
  markNotificationsAsReadController: MarkNotificationsAsReadController,
  markAllNotificationsAsReadController: MarkAllNotificationsAsReadController,
): void {
  app.get(
    routes.notifications.myNotifications.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => getMyNotificationsController.execute(req, res),
  );

  app.get(
    routes.notifications.unreadCount.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => getUnreadNotificationCountController.execute(req, res),
  );

  app.post(
    routes.notifications.markRead.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => markNotificationsAsReadController.execute(req, res),
  );

  app.post(
    routes.notifications.markAllRead.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => markAllNotificationsAsReadController.execute(req, res),
  );
}
