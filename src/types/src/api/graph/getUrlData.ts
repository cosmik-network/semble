import { z } from 'zod';

export const GetUrlGraphDataParamsSchema = z.object({
  url: z.string(),
  depth: z.number().optional(),
});
export type GetUrlGraphDataParams = z.infer<typeof GetUrlGraphDataParamsSchema>;
