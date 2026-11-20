import { z } from 'zod';
import { UserSchema } from './user';
import { UrlMetadataSchema } from './url';
import { CollectionSchema } from './collection';

// W3C Web Annotation text quote selector — identifies a passage by quoting
// it, with optional surrounding context for disambiguation
export const TextQuoteSelectorSchema = z.object({
  type: z.literal('TextQuoteSelector'),
  exact: z.string().min(1),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
});
export type TextQuoteSelector = z.infer<typeof TextQuoteSelectorSchema>;

export const UrlCardSchema = z.object({
  id: z.string(),
  type: z.literal('URL'),
  url: z.string(),
  uri: z.string().optional(),
  cardContent: UrlMetadataSchema,
  libraryCount: z.number(),
  urlLibraryCount: z.number(),
  urlInLibrary: z.boolean().optional(),
  urlConnectionCount: z.number().optional(),
  urlIsConnected: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: UserSchema,
  note: z
    .object({
      id: z.string(),
      text: z.string(),
    })
    .optional(),
});
export type UrlCard = z.infer<typeof UrlCardSchema>;

export const UrlCardWithCollectionsSchema = UrlCardSchema.extend({
  collections: z.array(CollectionSchema),
});
export type UrlCardWithCollections = z.infer<
  typeof UrlCardWithCollectionsSchema
>;

export const UrlCardWithLibrariesSchema = UrlCardSchema.extend({
  libraries: z.array(UserSchema),
});
export type UrlCardWithLibraries = z.infer<typeof UrlCardWithLibrariesSchema>;

export const UrlCardWithCollectionsAndLibrariesSchema = UrlCardSchema.extend({
  collections: z.array(CollectionSchema),
  libraries: z.array(UserSchema),
});
export type UrlCardWithCollectionsAndLibraries = z.infer<
  typeof UrlCardWithCollectionsAndLibrariesSchema
>;

// An annotation card — a passage (text quote selector) on a URL with an
// optional note. Anchors to the URL; no parent card.
export const AnnotationCardSchema = z.object({
  id: z.string(),
  type: z.literal('ANNOTATION'),
  url: z.string(),
  uri: z.string().optional(),
  libraryCount: z.number(),
  selectors: z.array(TextQuoteSelectorSchema),
  note: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: UserSchema,
});
export type AnnotationCard = z.infer<typeof AnnotationCardSchema>;

// Discriminated union of card types returned by card list endpoints. The
// `type` literal narrows: consumers expecting a URL card get compile-time
// safety on URL-specific fields (cardContent, urlLibraryCount, ...) after
// checking `card.type === 'URL'`.
export const CardItemSchema = z.discriminatedUnion('type', [
  UrlCardSchema,
  AnnotationCardSchema,
]);
export type CardItem = z.infer<typeof CardItemSchema>;

export const isUrlCard = (card: CardItem): card is UrlCard =>
  card.type === 'URL';
export const isAnnotationCard = (card: CardItem): card is AnnotationCard =>
  card.type === 'ANNOTATION';
