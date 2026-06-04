import { z } from 'zod';

export const RefreshAccessTokenRequestSchema = z.object({
  refreshToken: z.string(),
});
export type RefreshAccessTokenRequest = z.infer<
  typeof RefreshAccessTokenRequestSchema
>;

export const RefreshAccessTokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type RefreshAccessTokenResponse = z.infer<
  typeof RefreshAccessTokenResponseSchema
>;

export const GenerateExtensionTokensRequestSchema = z.object({});
export type GenerateExtensionTokensRequest = z.infer<
  typeof GenerateExtensionTokensRequestSchema
>;

export const GenerateExtensionTokensResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type GenerateExtensionTokensResponse = z.infer<
  typeof GenerateExtensionTokensResponseSchema
>;
