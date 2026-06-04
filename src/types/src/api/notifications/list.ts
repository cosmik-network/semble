import { z } from 'zod';
import {
  PaginatedSortedParamsSchema,
  PaginationSchema,
} from '../../entities/common';
import { NotificationItemSchema } from '../../entities/notification';

export const GetMyNotificationsParamsSchema =
  PaginatedSortedParamsSchema.extend({
    unreadOnly: z.boolean().optional(),
  });
export type GetMyNotificationsParams = z.infer<
  typeof GetMyNotificationsParamsSchema
>;

export const GetMyNotificationsResponseSchema = z.object({
  notifications: z.array(NotificationItemSchema),
  pagination: PaginationSchema,
  unreadCount: z.number(),
});
export type GetMyNotificationsResponse = z.infer<
  typeof GetMyNotificationsResponseSchema
>;
