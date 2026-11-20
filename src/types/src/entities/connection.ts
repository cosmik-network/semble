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

/**
 * A connection involving an annotation card: `annotationCardId` is the
 * matching annotation card endpoint, and `other` is the opposite endpoint.
 * CARD-typed endpoints are resolved to their card's URL for display;
 * `cardId` is set only when the other endpoint is a card.
 */
export const AnnotationConnectionViewSchema = z.object({
  connection: z.object({
    id: z.string(),
    type: z.string().optional(),
    note: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    curator: UserSchema,
  }),
  annotationCardId: z.string(),
  other: UrlViewSchema.extend({
    type: z.enum(['URL', 'CARD']),
    cardId: z.string().optional(),
  }),
});
export type AnnotationConnectionView = z.infer<
  typeof AnnotationConnectionViewSchema
>;

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
