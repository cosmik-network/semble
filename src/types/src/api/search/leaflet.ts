import { z } from 'zod';
import { UrlViewSchema } from '../../entities/connection';

export const SearchLeafletDocsForUrlParamsSchema = z.object({
  url: z.string(),
  limit: z.number().optional(),
  cursor: z.string().optional(),
});
export type SearchLeafletDocsForUrlParams = z.infer<
  typeof SearchLeafletDocsForUrlParamsSchema
>;

export const SearchLeafletDocsForUrlResponseSchema = z.object({
  urls: z.array(UrlViewSchema),
  cursor: z.string().optional(),
  total: z.number(),
});
export type SearchLeafletDocsForUrlResponse = z.infer<
  typeof SearchLeafletDocsForUrlResponseSchema
>;
