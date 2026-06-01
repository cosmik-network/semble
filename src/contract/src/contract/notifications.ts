import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  paths,
  GetMyNotificationsResponseSchema,
  GetUnreadNotificationCountResponseSchema,
  MarkNotificationsAsReadRequestSchema,
  MarkNotificationsAsReadResponseSchema,
  MarkAllNotificationsAsReadResponseSchema,
} from '@semble/types';
import { CoercedPaginatedSortedQuery } from './shared';

const c = initContract();

export const notificationsContract = c.router(
  {
    myNotifications: {
      method: 'GET',
      path: paths.myNotifications,
      query: CoercedPaginatedSortedQuery.extend({
        unreadOnly: z.coerce.boolean().optional(),
      }),
      responses: { 200: GetMyNotificationsResponseSchema },
      summary: 'List my notifications',
      description:
        "Returns the authenticated user's notifications, optionally filtered to unread only.",
    },
    unreadCount: {
      method: 'GET',
      path: paths.unreadCount,
      query: z.object({}),
      responses: { 200: GetUnreadNotificationCountResponseSchema },
      summary: 'Get unread notification count',
      description:
        'Returns the number of unread notifications for the authenticated user.',
    },
    markRead: {
      method: 'POST',
      path: paths.markRead,
      body: MarkNotificationsAsReadRequestSchema,
      responses: { 200: MarkNotificationsAsReadResponseSchema },
      summary: 'Mark notifications as read',
      description: 'Marks one or more notifications as read by ID.',
    },
    markAllRead: {
      method: 'POST',
      path: paths.markAllRead,
      body: z.object({}),
      responses: { 200: MarkAllNotificationsAsReadResponseSchema },
      summary: 'Mark all notifications as read',
      description:
        "Marks all of the authenticated user's notifications as read.",
    },
  },
  { strictStatusCodes: true },
);
