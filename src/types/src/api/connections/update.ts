import { z } from 'zod';
import { ConnectionTypeSchema } from '../../entities/connection';

export const UpdateConnectionRequestSchema = z.object({
  connectionId: z.string(),
  connectionType: ConnectionTypeSchema.optional(),
  note: z.string().optional(),
  removeNote: z.boolean().optional(),
  swap: z.boolean().optional(),
});
export type UpdateConnectionRequest = z.infer<
  typeof UpdateConnectionRequestSchema
>;

export const UpdateConnectionResponseSchema = z.object({
  connectionId: z.string(),
});
export type UpdateConnectionResponse = z.infer<
  typeof UpdateConnectionResponseSchema
>;
