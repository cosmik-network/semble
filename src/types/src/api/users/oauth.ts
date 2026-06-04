import { z } from 'zod';

export const InitiateOAuthSignInRequestSchema = z.object({
  handle: z.string().optional(),
});
export type InitiateOAuthSignInRequest = z.infer<
  typeof InitiateOAuthSignInRequestSchema
>;

export const InitiateOAuthSignInResponseSchema = z.object({
  authUrl: z.string(),
});
export type InitiateOAuthSignInResponse = z.infer<
  typeof InitiateOAuthSignInResponseSchema
>;

export const CompleteOAuthSignInRequestSchema = z.object({
  code: z.string(),
  state: z.string(),
  iss: z.string(),
});
export type CompleteOAuthSignInRequest = z.infer<
  typeof CompleteOAuthSignInRequestSchema
>;

export const CompleteOAuthSignInResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type CompleteOAuthSignInResponse = z.infer<
  typeof CompleteOAuthSignInResponseSchema
>;
