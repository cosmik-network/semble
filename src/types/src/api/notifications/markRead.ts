import { z } from 'zod';

export const MarkNotificationsAsReadRequestSchema = z.object({
  notificationIds: z.array(z.string()),
});
export type MarkNotificationsAsReadRequest = z.infer<
  typeof MarkNotificationsAsReadRequestSchema
>;

export const MarkNotificationsAsReadResponseSchema = z.object({
  markedCount: z.number(),
});
export type MarkNotificationsAsReadResponse = z.infer<
  typeof MarkNotificationsAsReadResponseSchema
>;

export const MarkAllNotificationsAsReadResponseSchema = z.object({
  markedCount: z.number(),
});
export type MarkAllNotificationsAsReadResponse = z.infer<
  typeof MarkAllNotificationsAsReadResponseSchema
>;
