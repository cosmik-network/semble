import { z } from 'zod';
import {
  PaginationParamsSchema,
  PaginationSchema,
} from '../../entities/common';
import { ContributorUserSchema } from '../../entities/user';

export const GetCollectionContributorsParamsSchema =
  PaginationParamsSchema.extend({
    collectionId: z.string(),
  });
export type GetCollectionContributorsParams = z.infer<
  typeof GetCollectionContributorsParamsSchema
>;

export const GetCollectionContributorsResponseSchema = z.object({
  users: z.array(ContributorUserSchema),
  pagination: PaginationSchema,
});
export type GetCollectionContributorsResponse = z.infer<
  typeof GetCollectionContributorsResponseSchema
>;
