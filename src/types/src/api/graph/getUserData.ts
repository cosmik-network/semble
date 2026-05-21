import { z } from 'zod';
import { GetGraphDataParamsSchema } from './getData';

export const GetUserGraphDataParamsSchema = GetGraphDataParamsSchema.extend({
  identifier: z.string(),
});
export type GetUserGraphDataParams = z.infer<
  typeof GetUserGraphDataParamsSchema
>;
