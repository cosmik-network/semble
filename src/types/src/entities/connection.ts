import { z } from 'zod';
import { UserSchema } from './user';
import { UrlMetadataSchema } from './url';

export const ConnectionTypeSchema = z.enum([
  'SUPPORTS',
  'OPPOSES',
  'ADDRESSES',
  'HELPFUL',
  'LEADS_TO',
  'RELATED',
  'SUPPLEMENT',
  'EXPLAINER',
]);
export type ConnectionType = z.infer<typeof ConnectionTypeSchema>;

export const UrlViewSchema = z.object({
  url: z.string(),
  metadata: UrlMetadataSchema,
  urlLibraryCount: z.number(),
  urlInLibrary: z.boolean().optional(),
  urlConnectionCount: z.number().optional(),
  urlIsConnected: z.boolean().optional(),
});
export type UrlView = z.infer<typeof UrlViewSchema>;

export const ConnectionWithSourceAndTargetSchema = z.object({
  connection: z.object({
    id: z.string(),
    type: z.string().optional(),
    note: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    curator: UserSchema,
  }),
  source: UrlViewSchema,
  target: UrlViewSchema,
});
export type ConnectionWithSourceAndTarget = z.infer<
  typeof ConnectionWithSourceAndTargetSchema
>;
