import { z } from 'zod';
import {
  PaginatedSortedParamsSchema,
  PaginationSchema,
  CardSortingSchema,
} from '../../entities/common';
import { UserSchema } from '../../entities/user';
import { UrlCardSchema } from '../../entities/card';

export const GetLibrariesForUrlParamsSchema =
  PaginatedSortedParamsSchema.extend({
    url: z.string(),
  });
export type GetLibrariesForUrlParams = z.infer<
  typeof GetLibrariesForUrlParamsSchema
>;

export const GetLibrariesForUrlResponseSchema = z.object({
  libraries: z.array(
    z.object({
      user: UserSchema,
      card: UrlCardSchema,
    }),
  ),
  pagination: PaginationSchema,
  sorting: CardSortingSchema,
});
export type GetLibrariesForUrlResponse = z.infer<
  typeof GetLibrariesForUrlResponseSchema
>;
