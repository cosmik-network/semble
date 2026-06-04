import { z } from 'zod';

export const ApiKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  createdAt: z.coerce.date(),
  lastUsedAt: z.coerce.date().nullable(),
  expiresAt: z.coerce.date().nullable(),
});
export type ApiKey = z.infer<typeof ApiKeySchema>;

export const NewApiKeySchema = ApiKeySchema.extend({
  token: z.string(),
});
export type NewApiKey = z.infer<typeof NewApiKeySchema>;

export const ListApiKeysResponseSchema = z.object({
  keys: z.array(ApiKeySchema),
});
export type ListApiKeysResponse = z.infer<typeof ListApiKeysResponseSchema>;

export const CreateApiKeyRequestSchema = z.object({
  name: z.string().min(1).max(100),
});
export type CreateApiKeyRequest = z.infer<typeof CreateApiKeyRequestSchema>;

export const CreateApiKeyResponseSchema = NewApiKeySchema;
export type CreateApiKeyResponse = z.infer<typeof CreateApiKeyResponseSchema>;

export const UpdateApiKeyRequestSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
});
export type UpdateApiKeyRequest = z.infer<typeof UpdateApiKeyRequestSchema>;

export const UpdateApiKeyResponseSchema = ApiKeySchema;
export type UpdateApiKeyResponse = z.infer<typeof UpdateApiKeyResponseSchema>;

export const RevokeApiKeyRequestSchema = z.object({
  id: z.string(),
});
export type RevokeApiKeyRequest = z.infer<typeof RevokeApiKeyRequestSchema>;

export const RevokeApiKeyResponseSchema = z.object({
  success: z.boolean(),
});
export type RevokeApiKeyResponse = z.infer<typeof RevokeApiKeyResponseSchema>;
