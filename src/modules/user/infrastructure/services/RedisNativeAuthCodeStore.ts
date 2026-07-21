import Redis from 'ioredis';
import { randomBytes } from 'crypto';
import { TokenPair, TokenPairSchema } from '@semble/types';
import { INativeAuthCodeStore } from '../../application/services/INativeAuthCodeStore';

const KEY_PREFIX = 'nativeauth:';
// Short TTL: the code is redeemed immediately after the deep link opens.
const TTL_SECONDS = 120;
// 32 bytes of entropy, url-safe so it survives being placed in a deep link.
const CODE_BYTES = 32;

export class RedisNativeAuthCodeStore implements INativeAuthCodeStore {
  constructor(private redis: Redis) {}

  async create(tokenPair: TokenPair): Promise<string> {
    const code = randomBytes(CODE_BYTES).toString('base64url');
    await this.redis.setex(
      KEY_PREFIX + code,
      TTL_SECONDS,
      JSON.stringify(tokenPair),
    );
    return code;
  }

  async consume(code: string): Promise<TokenPair | null> {
    const key = KEY_PREFIX + code;

    // Atomic fetch-and-delete so a code can only ever be redeemed once, even
    // under concurrent requests. GETDEL requires Redis >= 6.2; fall back to a
    // MULTI/EXEC pipeline otherwise.
    let raw: string | null;
    if (typeof (this.redis as any).getdel === 'function') {
      raw = await (this.redis as any).getdel(key);
    } else {
      const [[, value]] = (await this.redis
        .multi()
        .get(key)
        .del(key)
        .exec()) as [[Error | null, string | null], [Error | null, number]];
      raw = value;
    }

    if (!raw) return null;

    try {
      return TokenPairSchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }
}
