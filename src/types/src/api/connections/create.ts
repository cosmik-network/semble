import { z } from 'zod';
import { ConnectionTypeSchema } from '../../entities/connection';

export const CreateConnectionRequestSchema = z.object({
  sourceType: z.enum(['URL', 'CARD']),
  sourceValue: z.string(),
  targetType: z.enum(['URL', 'CARD']),
  targetValue: z.string(),
  connectionType: ConnectionTypeSchema.optional(),
  note: z.string().optional(),
});
export type CreateConnectionRequest = z.infer<
  typeof CreateConnectionRequestSchema
>;

export const CreateConnectionResponseSchema = z.object({
  connectionId: z.string(),
});
export type CreateConnectionResponse = z.infer<
  typeof CreateConnectionResponseSchema
>;
