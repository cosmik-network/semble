import { z } from 'zod';
import { UserSchema } from '../../entities/user';

export const GetProfileParamsSchema = z.object({
  identifier: z.string(),
  includeStats: z.boolean().optional(),
});
export type GetProfileParams = z.infer<typeof GetProfileParamsSchema>;

export const GetProfileResponseSchema = UserSchema;
export type GetProfileResponse = z.infer<typeof GetProfileResponseSchema>;
