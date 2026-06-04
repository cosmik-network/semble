import { z } from 'zod';

export const LoginWithAppPasswordRequestSchema = z.object({
  identifier: z.string(),
  appPassword: z.string(),
});
export type LoginWithAppPasswordRequest = z.infer<
  typeof LoginWithAppPasswordRequestSchema
>;

export const LoginWithAppPasswordResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type LoginWithAppPasswordResponse = z.infer<
  typeof LoginWithAppPasswordResponseSchema
>;
