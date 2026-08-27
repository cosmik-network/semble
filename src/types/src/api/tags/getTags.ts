import { z } from 'zod';

export const GetTagsParamsSchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().optional(),
});
export type GetTagsParams = z.infer<typeof GetTagsParamsSchema>;

export const TagSummarySchema = z.object({
  tag: z.string(),
  lastUsed: z.string(),
});
export type TagSummary = z.infer<typeof TagSummarySchema>;

export const GetTagsResponseSchema = z.object({
  tags: z.array(TagSummarySchema),
});
export type GetTagsResponse = z.infer<typeof GetTagsResponseSchema>;
