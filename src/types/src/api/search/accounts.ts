import { z } from 'zod';
import { ProfileViewSchema } from '../../entities/search';

export const SearchAtProtoAccountsParamsSchema = z.object({
  term: z.string().optional(),
  q: z.string().optional(),
  limit: z.number().optional(),
  cursor: z.string().optional(),
});
export type SearchAtProtoAccountsParams = z.infer<
  typeof SearchAtProtoAccountsParamsSchema
>;

export const SearchAtProtoAccountsResponseSchema = z.object({
  cursor: z.string().optional(),
  actors: z.array(ProfileViewSchema),
});
export type SearchAtProtoAccountsResponse = z.infer<
  typeof SearchAtProtoAccountsResponseSchema
>;
