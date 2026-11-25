import { z } from 'zod';
import { UrlCardSchema, AnnotationCardSchema } from '../../entities/card';
import { CollectionSchema } from '../../entities/collection';

export const GetUrlStatusForMyLibraryParamsSchema = z.object({
  url: z.string(),
});
export type GetUrlStatusForMyLibraryParams = z.infer<
  typeof GetUrlStatusForMyLibraryParamsSchema
>;

export const GetUrlStatusForMyLibraryResponseSchema = z.object({
  card: UrlCardSchema.optional(),
  collections: z.array(CollectionSchema).optional(),
});
export type GetUrlStatusForMyLibraryResponse = z.infer<
  typeof GetUrlStatusForMyLibraryResponseSchema
>;

export const GetAnnotationStatusForMyLibraryParamsSchema = z.object({
  url: z.string(),
  exact: z.string(),
});
export type GetAnnotationStatusForMyLibraryParams = z.infer<
  typeof GetAnnotationStatusForMyLibraryParamsSchema
>;

export const GetAnnotationStatusForMyLibraryResponseSchema = z.object({
  card: AnnotationCardSchema.optional(),
  collections: z.array(CollectionSchema).optional(),
  // Whether the viewer has a connection where a passage-matching card is an
  // endpoint — the annotation analog of the URL card's urlIsConnected
  isConnected: z.boolean().optional(),
});
export type GetAnnotationStatusForMyLibraryResponse = z.infer<
  typeof GetAnnotationStatusForMyLibraryResponseSchema
>;
