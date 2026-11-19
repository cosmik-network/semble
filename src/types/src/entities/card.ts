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
