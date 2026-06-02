import { IRouter } from 'express';
import { GetMyNotificationsController } from '../controllers/GetMyNotificationsController';
import { GetUnreadNotificationCountController } from '../controllers/GetUnreadNotificationCountController';
import { MarkNotificationsAsReadController } from '../controllers/MarkNotificationsAsReadController';
import { MarkAllNotificationsAsReadController } from '../controllers/MarkAllNotificationsAsReadController';
import { AuthMiddleware } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { routes } from '@semble/types';
import { notificationsContract } from '@semble/contract';
import {
  validateBody,
  validateQuery,
} from '../../../../../shared/infrastructure/http/middleware/validateContract';

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
    validateQuery(notificationsContract.myNotifications.query),
    (req, res) => getMyNotificationsController.execute(req, res),
  );

  app.get(
    routes.notifications.unreadCount.path,
    authMiddleware.ensureAuthenticated(),
    validateQuery(notificationsContract.unreadCount.query),
    (req, res) => getUnreadNotificationCountController.execute(req, res),
  );

  app.post(
    routes.notifications.markRead.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(notificationsContract.markRead.body),
    (req, res) => markNotificationsAsReadController.execute(req, res),
  );

  app.post(
    routes.notifications.markAllRead.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(notificationsContract.markAllRead.body),
    (req, res) => markAllNotificationsAsReadController.execute(req, res),
  );
}
