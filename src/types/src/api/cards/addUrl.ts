import { z } from 'zod';

export const AddUrlToLibraryRequestSchema = z.object({
  url: z.string(),
  note: z.string().optional(),
  collectionIds: z.array(z.string()).optional(),
  viaCardId: z.string().optional(),
});
export type AddUrlToLibraryRequest = z.infer<
  typeof AddUrlToLibraryRequestSchema
>;

export const AddUrlToLibraryResponseSchema = z.object({
  urlCardId: z.string(),
  noteCardId: z.string().optional(),
});
export type AddUrlToLibraryResponse = z.infer<
  typeof AddUrlToLibraryResponseSchema
>;
