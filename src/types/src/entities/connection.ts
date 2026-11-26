import { z } from 'zod';
import { UserSchema } from './user';
import { UrlMetadataSchema } from './url';
import { AnnotationCardSchema } from './card';

export const ConnectionTypeSchema = z.enum([
  'SUPPORTS',
  'OPPOSES',
  'ADDRESSES',
  'HELPFUL',
  'LEADS_TO',
  'RELATED',
  'SUPPLEMENT',
  'EXPLAINER',
  'SAME_AS',
  'REFERENCES',
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

/**
 * Connection endpoints as a discriminated union on `type` — the same pattern
 * as CardItemSchema for card lists. URL endpoints carry link metadata and
 * entity counts; CARD endpoints carry the referenced annotation card in
 * full, the same shape card-list endpoints return.
 */
export const UrlConnectionEndpointSchema = UrlViewSchema.extend({
  type: z.literal('URL'),
});
export type UrlConnectionEndpoint = z.infer<typeof UrlConnectionEndpointSchema>;

export const CardConnectionEndpointSchema = z.object({
  type: z.literal('CARD'),
  card: AnnotationCardSchema,
});
export type CardConnectionEndpoint = z.infer<
  typeof CardConnectionEndpointSchema
>;

export const ConnectionEndpointViewSchema = z.discriminatedUnion('type', [
  UrlConnectionEndpointSchema,
  CardConnectionEndpointSchema,
]);
export type ConnectionEndpointView = z.infer<
  typeof ConnectionEndpointViewSchema
>;

export const isUrlEndpoint = (
  endpoint: ConnectionEndpointView,
): endpoint is UrlConnectionEndpoint => endpoint.type === 'URL';
export const isCardEndpoint = (
  endpoint: ConnectionEndpointView,
): endpoint is CardConnectionEndpoint => endpoint.type === 'CARD';

// A connection whose endpoints can be URLs or cards — used by endpoints
// that return card connections (e.g. a user's connection list)
export const ConnectionWithEndpointsSchema = z.object({
  connection: z.object({
    id: z.string(),
    type: z.string().optional(),
    note: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  source: ConnectionEndpointViewSchema,
  target: ConnectionEndpointViewSchema,
});
export type ConnectionWithEndpoints = z.infer<
  typeof ConnectionWithEndpointsSchema
>;

// Same, plus the curator who made the connection — read paths that show
// who connected what (e.g. a URL's connection list)
export const ConnectionWithEndpointsAndCuratorSchema =
  ConnectionWithEndpointsSchema.extend({
    connection: ConnectionWithEndpointsSchema.shape.connection.extend({
      curator: UserSchema,
    }),
  });
export type ConnectionWithEndpointsAndCurator = z.infer<
  typeof ConnectionWithEndpointsAndCuratorSchema
>;
