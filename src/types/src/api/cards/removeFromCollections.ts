import { z } from 'zod';

export const RemoveCardFromCollectionRequestSchema = z.object({
  cardId: z.string(),
  collectionIds: z.array(z.string()),
});
export type RemoveCardFromCollectionRequest = z.infer<
  typeof RemoveCardFromCollectionRequestSchema
>;

export const RemoveCardFromCollectionResponseSchema = z.object({
  cardId: z.string(),
});
export type RemoveCardFromCollectionResponse = z.infer<
  typeof RemoveCardFromCollectionResponseSchema
>;
