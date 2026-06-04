import { z } from 'zod';

export const DeleteCollectionRequestSchema = z.object({
  collectionId: z.string(),
});
export type DeleteCollectionRequest = z.infer<
  typeof DeleteCollectionRequestSchema
>;

export const DeleteCollectionResponseSchema = z.object({
  collectionId: z.string(),
});
export type DeleteCollectionResponse = z.infer<
  typeof DeleteCollectionResponseSchema
>;
