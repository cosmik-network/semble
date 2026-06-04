import { z } from 'zod';

export const AddCardToLibraryRequestSchema = z.object({
  cardId: z.string(),
  collectionIds: z.array(z.string()).optional(),
});
export type AddCardToLibraryRequest = z.infer<
  typeof AddCardToLibraryRequestSchema
>;

export const AddCardToLibraryResponseSchema = z.object({
  cardId: z.string(),
});
export type AddCardToLibraryResponse = z.infer<
  typeof AddCardToLibraryResponseSchema
>;
