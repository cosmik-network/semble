import { z } from 'zod';

export const RemoveCardFromLibraryRequestSchema = z.object({
  cardId: z.string(),
});
export type RemoveCardFromLibraryRequest = z.infer<
  typeof RemoveCardFromLibraryRequestSchema
>;

export const RemoveCardFromLibraryResponseSchema = z.object({
  cardId: z.string(),
});
export type RemoveCardFromLibraryResponse = z.infer<
  typeof RemoveCardFromLibraryResponseSchema
>;
