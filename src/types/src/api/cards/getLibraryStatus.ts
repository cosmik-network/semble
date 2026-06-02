import { z } from 'zod';
import { UrlCardSchema } from '../../entities/card';
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
