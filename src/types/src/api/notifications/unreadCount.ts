import { z } from 'zod';

export const GetUnreadNotificationCountResponseSchema = z.object({
  unreadCount: z.number(),
});
export type GetUnreadNotificationCountResponse = z.infer<
  typeof GetUnreadNotificationCountResponseSchema
>;
