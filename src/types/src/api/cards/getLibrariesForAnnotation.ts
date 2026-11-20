import { z } from 'zod';
import {
  PaginatedCardSortedParamsSchema,
  PaginationSchema,
  CardSortingSchema,
} from '../../entities/common';
import { UserSchema } from '../../entities/user';
import { AnnotationCardSchema } from '../../entities/card';

export const GetLibrariesForAnnotationParamsSchema =
  PaginatedCardSortedParamsSchema.extend({
    url: z.string(),
    exact: z.string(),
  });
export type GetLibrariesForAnnotationParams = z.infer<
  typeof GetLibrariesForAnnotationParamsSchema
>;

export const GetLibrariesForAnnotationResponseSchema = z.object({
  libraries: z.array(
    z.object({
      user: UserSchema,
      card: AnnotationCardSchema,
    }),
  ),
  pagination: PaginationSchema,
  sorting: CardSortingSchema,
});
export type GetLibrariesForAnnotationResponse = z.infer<
  typeof GetLibrariesForAnnotationResponseSchema
>;
