import { TokenPair } from '@semble/types';

/**
 * One-time code store for the Capacitor (native) OAuth handoff.
 *
 * The OAuth callback runs server-side and produces a TokenPair, but the native
 * client can't receive it directly (redirect_uri is fixed to the backend, and
 * putting tokens in a redirect URL leaks them into logs/history). Instead the
 * callback stores the TokenPair here under a short-lived, single-use opaque
 * code and redirects to a deep link carrying only that code. The native client
 * then exchanges the code for the TokenPair via the exchangeToken endpoint.
 *
 * Must be backed by shared storage (Redis) — the callback and the exchange
 * request can hit different server instances in production.
 */
export interface INativeAuthCodeStore {
  /** Store a TokenPair and return the opaque single-use code. */
  create(tokenPair: TokenPair): Promise<string>;
  /** Atomically fetch-and-delete the TokenPair for a code, or null if missing/expired/used. */
  consume(code: string): Promise<TokenPair | null>;
}
