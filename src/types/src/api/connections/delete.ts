import { z } from 'zod';

export const DeleteConnectionRequestSchema = z.object({
  connectionId: z.string(),
});
export type DeleteConnectionRequest = z.infer<
  typeof DeleteConnectionRequestSchema
>;

export const DeleteConnectionResponseSchema = z.object({
  connectionId: z.string(),
});
export type DeleteConnectionResponse = z.infer<
  typeof DeleteConnectionResponseSchema
>;
