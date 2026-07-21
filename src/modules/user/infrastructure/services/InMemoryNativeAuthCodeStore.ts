import { randomBytes } from 'crypto';
import { TokenPair } from '@semble/types';
import { INativeAuthCodeStore } from '../../application/services/INativeAuthCodeStore';

const TTL_MS = 120_000;
const CODE_BYTES = 32;

/**
 * In-memory single-use code store for local dev / tests (mock persistence).
 * Not safe across multiple instances — production must use the Redis store.
 */
export class InMemoryNativeAuthCodeStore implements INativeAuthCodeStore {
  private store = new Map<
    string,
    { tokenPair: TokenPair; expiresAt: number }
  >();

  async create(tokenPair: TokenPair): Promise<string> {
    const code = randomBytes(CODE_BYTES).toString('base64url');
    this.store.set(code, { tokenPair, expiresAt: Date.now() + TTL_MS });
    return code;
  }

  async consume(code: string): Promise<TokenPair | null> {
    const entry = this.store.get(code);
    // Single-use: delete on read regardless of outcome.
    this.store.delete(code);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) return null;
    return entry.tokenPair;
  }
}
