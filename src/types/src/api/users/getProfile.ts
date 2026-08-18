import { z } from 'zod';
import { UserSchema } from '../../entities/user';

export const GetProfileParamsSchema = z.object({
  identifier: z.string(),
  includeStats: z.boolean().optional(),
});
export type GetProfileParams = z.infer<typeof GetProfileParamsSchema>;

export const GetProfileResponseSchema = UserSchema.extend({
  /**
   * Only set on the my-profile endpoint: false when the server no longer
   * holds an ATProto OAuth session for this user (PDS writes will fail and
   * the user must re-authenticate via the OAuth flow).
   */
  atprotoSessionValid: z.boolean().optional(),
});
export type GetProfileResponse = z.infer<typeof GetProfileResponseSchema>;
