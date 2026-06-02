import { z } from 'zod';

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['USER', 'URL', 'COLLECTION', 'NOTE']),
  label: z.string(),
  metadata: z.record(z.string(), z.any()),
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.enum([
    'USER_FOLLOWS_USER',
    'USER_FOLLOWS_COLLECTION',
    'USER_AUTHORED_URL',
    'NOTE_REFERENCES_URL',
    'COLLECTION_CONTAINS_URL',
    'URL_CONNECTS_URL',
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
