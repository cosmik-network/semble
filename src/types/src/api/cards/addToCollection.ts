import { z } from 'zod';

export const AddCardToCollectionRequestSchema = z.object({
  cardId: z.string(),
  collectionIds: z.array(z.string()),
});
export type AddCardToCollectionRequest = z.infer<
  typeof AddCardToCollectionRequestSchema
>;

export const AddCardToCollectionResponseSchema = z.object({
  cardId: z.string(),
});
export type AddCardToCollectionResponse = z.infer<
  typeof AddCardToCollectionResponseSchema
>;
