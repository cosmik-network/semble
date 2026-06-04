import { z } from 'zod';
import { CollectionAccessTypeSchema } from '../../entities/common';

export const CreateCollectionRequestSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  accessType: CollectionAccessTypeSchema.optional(),
});
export type CreateCollectionRequest = z.infer<
  typeof CreateCollectionRequestSchema
>;

export const CreateCollectionResponseSchema = z.object({
  collectionId: z.string(),
});
export type CreateCollectionResponse = z.infer<
  typeof CreateCollectionResponseSchema
>;
