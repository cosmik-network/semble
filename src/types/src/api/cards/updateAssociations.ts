import { z } from 'zod';

export const UpdateUrlCardAssociationsRequestSchema = z.object({
  cardId: z.string(),
  note: z.string().optional(),
  addToCollections: z.array(z.string()).optional(),
  removeFromCollections: z.array(z.string()).optional(),
  viaCardId: z
    .string()
    .optional()
    .describe(
      'The ID of the card that led to saving this URL. If included, the author of the viaCard will be notified.',
    ),
});
export type UpdateUrlCardAssociationsRequest = z.infer<
  typeof UpdateUrlCardAssociationsRequestSchema
>;

export const UpdateUrlCardAssociationsResponseSchema = z.object({
  urlCardId: z.string(),
  noteCardId: z.string().optional(),
  addedToCollections: z.array(z.string()),
  removedFromCollections: z.array(z.string()),
});
export type UpdateUrlCardAssociationsResponse = z.infer<
  typeof UpdateUrlCardAssociationsResponseSchema
>;
