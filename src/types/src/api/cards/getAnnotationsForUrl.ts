import { z } from 'zod';
import {
  PaginatedCardSortedParamsSchema,
  PaginationSchema,
  CardSortingSchema,
} from '../../entities/common';
import { AnnotationViewSchema } from '../../entities/card';

export const GetAnnotationsForUrlParamsSchema =
  PaginatedCardSortedParamsSchema.extend({
    url: z.string(),
  });
export type GetAnnotationsForUrlParams = z.infer<
  typeof GetAnnotationsForUrlParamsSchema
>;

export const GetAnnotationsForUrlResponseSchema = z.object({
  // One entry per unique passage (url + normalized exact text), not per card
  annotations: z.array(AnnotationViewSchema),
  pagination: PaginationSchema,
  sorting: CardSortingSchema,
});
export type GetAnnotationsForUrlResponse = z.infer<
  typeof GetAnnotationsForUrlResponseSchema
>;
