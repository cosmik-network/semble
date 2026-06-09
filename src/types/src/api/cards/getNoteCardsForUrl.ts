import { z } from 'zod';
import {
  PaginatedCardSortedParamsSchema,
  PaginationSchema,
  CardSortingSchema,
} from '../../entities/common';
import { UserSchema } from '../../entities/user';

export const GetNoteCardsForUrlParamsSchema =
  PaginatedCardSortedParamsSchema.extend({
    url: z.string(),
  });
export type GetNoteCardsForUrlParams = z.infer<
  typeof GetNoteCardsForUrlParamsSchema
>;

export const GetNoteCardsForUrlResponseSchema = z.object({
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
export type GetNoteCardsForUrlResponse = z.infer<
  typeof GetNoteCardsForUrlResponseSchema
>;
