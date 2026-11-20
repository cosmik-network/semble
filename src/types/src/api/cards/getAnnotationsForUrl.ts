import { z } from 'zod';
import {
  PaginatedCardSortedParamsSchema,
  PaginationSchema,
  CardSortingSchema,
} from '../../entities/common';
import { AnnotationCardSchema } from '../../entities/card';

export const GetAnnotationsForUrlParamsSchema =
  PaginatedCardSortedParamsSchema.extend({
    url: z.string(),
  });
export type GetAnnotationsForUrlParams = z.infer<
  typeof GetAnnotationsForUrlParamsSchema
>;

export const GetAnnotationsForUrlResponseSchema = z.object({
  annotations: z.array(AnnotationCardSchema),
  pagination: PaginationSchema,
  sorting: CardSortingSchema,
});
export type GetAnnotationsForUrlResponse = z.infer<
  typeof GetAnnotationsForUrlResponseSchema
>;
