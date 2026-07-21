import { z } from 'zod';

export const InitiateOAuthSignInRequestSchema = z.object({
  handle: z.string().optional(),
  // When 'native', the OAuth callback hands the resulting tokens back to a
  // Capacitor client via a one-time code + deep link instead of setting cookies.
  client: z.enum(['native']).optional(),
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

// Native (Capacitor) token handoff: exchange a one-time code from the deep link
// for the actual TokenPair. See CompleteOAuthSignInController's native branch.
export const ExchangeAuthCodeRequestSchema = z.object({
  code: z.string(),
});
export type ExchangeAuthCodeRequest = z.infer<
  typeof ExchangeAuthCodeRequestSchema
>;

export const ExchangeAuthCodeResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type ExchangeAuthCodeResponse = z.infer<
  typeof ExchangeAuthCodeResponseSchema
>;
