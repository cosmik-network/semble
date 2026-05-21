import { z } from 'zod';
import { CollectionAccessTypeSchema } from '../../entities/common';

export const UpdateCollectionRequestSchema = z.object({
  collectionId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  accessType: CollectionAccessTypeSchema.optional(),
});
export type UpdateCollectionRequest = z.infer<
  typeof UpdateCollectionRequestSchema
>;

export const UpdateCollectionResponseSchema = z.object({
  collectionId: z.string(),
});
export type UpdateCollectionResponse = z.infer<
  typeof UpdateCollectionResponseSchema
>;
