export interface ApiKey {
  id: string;
  /** Human-readable label given by the user */
  name: string;
  /** First ~12 chars of the token (e.g. "sk_ab12cd34"). Full token is never stored after creation. */
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
}

/** Returned only at creation time. The full token is never retrievable again. */
export interface NewApiKey extends ApiKey {
  token: string;
}
