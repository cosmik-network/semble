import { z } from 'zod';
import { UserSchema } from '../../entities/user';

export const GetLibrariesForCardResponseSchema = z.object({
  cardId: z.string(),
  users: z.array(UserSchema),
  totalCount: z.number(),
});
export type GetLibrariesForCardResponse = z.infer<
  typeof GetLibrariesForCardResponseSchema
>;
