import { z } from 'zod';
import { PostViewSchema } from '../../entities/search';

export const SearchBskyPostsForUrlParamsSchema = z.object({
  q: z.string(),
  sort: z.string().optional(),
  since: z.string().optional(),
  until: z.string().optional(),
  mentions: z.string().optional(),
  author: z.string().optional(),
  lang: z.string().optional(),
  domain: z.string().optional(),
  url: z.string().optional(),
  tag: z.array(z.string()).optional(),
  limit: z.number().optional(),
  cursor: z.string().optional(),
});
export type SearchBskyPostsForUrlParams = z.infer<
  typeof SearchBskyPostsForUrlParamsSchema
>;

export const SearchBskyPostsForUrlResponseSchema = z.object({
  cursor: z.string().optional(),
  hitsTotal: z.number().optional(),
  posts: z.array(PostViewSchema),
});
export type SearchBskyPostsForUrlResponse = z.infer<
  typeof SearchBskyPostsForUrlResponseSchema
>;
