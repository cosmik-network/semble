import { z } from 'zod';

export const UpdateAnnotationAssociationsRequestSchema = z.object({
  cardId: z.string(),
  note: z.string().optional(),
  addToCollections: z.array(z.string()).optional(),
  removeFromCollections: z.array(z.string()).optional(),
  viaCardId: z
    .string()
    .optional()
    .describe(
      'The ID of the card that led to saving this annotation. If included, the author of the viaCard will be notified.',
    ),
});
export type UpdateAnnotationAssociationsRequest = z.infer<
  typeof UpdateAnnotationAssociationsRequestSchema
>;

export const UpdateAnnotationAssociationsResponseSchema = z.object({
  annotationCardId: z.string(),
  addedToCollections: z.array(z.string()),
  removedFromCollections: z.array(z.string()),
});
export type UpdateAnnotationAssociationsResponse = z.infer<
  typeof UpdateAnnotationAssociationsResponseSchema
>;
