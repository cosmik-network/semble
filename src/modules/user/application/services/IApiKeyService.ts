import { Result } from 'src/shared/core/Result';
import { ApiKeyRecord } from '../../domain/repositories/IApiKeyRepository';

export interface ApiKeyMaterial {
  id: string;
  token: string;
  prefix: string;
  tokenHash: string;
}

export interface IApiKeyService {
  /**
   * Generate a fresh API key (id + plaintext token + prefix + hash).
   * The plaintext token is only available here — only the hash is persisted.
   */
  generate(): ApiKeyMaterial;

  /**
   * Hash a presented token using the same algorithm as `generate`.
   * Used by the auth middleware to look up a key by its hash.
   */
  hashToken(token: string): string;

  /**
   * Resolve a plaintext API key token to its stored record.
   * Returns ok(null) if the token does not match an active key.
   * Implementations are expected to verify revocation and expiry.
   */
  verify(token: string): Promise<Result<ApiKeyRecord | null>>;
}
