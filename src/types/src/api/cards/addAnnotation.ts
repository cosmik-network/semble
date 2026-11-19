import { z } from 'zod';
import { TextQuoteSelectorSchema } from '../../entities/card';

export const AddAnnotationToLibraryRequestSchema = z.object({
  url: z.string(),
  selectors: z.array(TextQuoteSelectorSchema).min(1).max(4),
  note: z.string().optional(),
  collectionIds: z.array(z.string()).optional(),
  viaCardId: z.string().optional(),
});
export type AddAnnotationToLibraryRequest = z.infer<
  typeof AddAnnotationToLibraryRequestSchema
>;

export const AddAnnotationToLibraryResponseSchema = z.object({
  annotationCardId: z.string(),
});
export type AddAnnotationToLibraryResponse = z.infer<
  typeof AddAnnotationToLibraryResponseSchema
>;
