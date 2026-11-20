import { z } from 'zod';
import {
  PaginatedCardSortedParamsSchema,
  PaginationSchema,
  CardSortingSchema,
} from '../../entities/common';
import { UserSchema } from '../../entities/user';

/**
 * Annotation matching is url + normalized exact text of the TextQuoteSelector
 * (the same key the backend uses for "same passage" matching), so the query
 * takes the selector's exact text directly rather than a serialized selector.
 */
export const GetNotesForAnnotationParamsSchema =
  PaginatedCardSortedParamsSchema.extend({
    url: z.string(),
    exact: z.string(),
  });
export type GetNotesForAnnotationParams = z.infer<
  typeof GetNotesForAnnotationParamsSchema
>;

export const GetNotesForAnnotationResponseSchema = z.object({
  notes: z.array(
    z.object({
      id: z.string(),
      note: z.string(),
      author: UserSchema,
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  pagination: PaginationSchema,
  sorting: CardSortingSchema,
});
export type GetNotesForAnnotationResponse = z.infer<
  typeof GetNotesForAnnotationResponseSchema
>;
