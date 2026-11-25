import { z } from 'zod';

export const UrlMetadataSchema = z.object({
  url: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  author: z.string().optional(),
  publishedDate: z.string().optional(),
  siteName: z.string().optional(),
  imageUrl: z.string().optional(),
  type: z.string().optional(),
  retrievedAt: z.string().optional(),
  doi: z.string().optional(),
  isbn: z.string().optional(),
});
export type UrlMetadata = z.infer<typeof UrlMetadataSchema>;

const ConnectionStatsSchema = z
  .object({ total: z.number() })
  .catchall(z.number());

export const UrlAggregateStatsSchema = z.object({
  libraryCount: z.number(),
  noteCount: z.number(),
  collectionCount: z.number(),
  // Unique annotations (url + normalized exact text) on the URL — what its
  // Annotations tab lists. Many users saving the same passage count once.
  annotationCount: z.number(),
  connections: z.object({
    all: ConnectionStatsSchema,
    incoming: ConnectionStatsSchema,
    outgoing: ConnectionStatsSchema,
  }),
});
export type UrlAggregateStats = z.infer<typeof UrlAggregateStatsSchema>;
