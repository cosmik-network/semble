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

export const notificationsContract = c.router({
  myNotifications: {
    method: 'GET',
    path: paths.myNotifications,
    query: CoercedPaginatedSortedQuery.extend({
      unreadOnly: z.coerce.boolean().optional(),
    }),
    responses: { 200: GetMyNotificationsResponseSchema },
  },
  unreadCount: {
    method: 'GET',
    path: paths.unreadCount,
    query: z.object({}),
    responses: { 200: GetUnreadNotificationCountResponseSchema },
  },
  markRead: {
    method: 'POST',
    path: paths.markRead,
    body: MarkNotificationsAsReadRequestSchema,
    responses: { 200: MarkNotificationsAsReadResponseSchema },
  },
  markAllRead: {
    method: 'POST',
    path: paths.markAllRead,
    body: z.object({}),
    responses: { 200: MarkAllNotificationsAsReadResponseSchema },
  },
});
