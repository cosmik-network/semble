import {
  NodeSavedSession,
  NodeSavedSessionStore,
} from '@atproto/oauth-client-node';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { authSession } from '../repositories/schema/authSession.sql';

// Transient failures here have outsized consequences upstream in
// @atproto/oauth-client: a get() error is silently coerced to undefined and
// surfaces as "The session was deleted by another process", and a set() error
// triggers active revocation of the token at the PDS. Retry briefly and log
// loudly before letting an error escape.
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [100, 300];

async function withRetry<T>(
  operation: string,
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.error(
        `[DrizzleSessionStore] ${operation} failed for DID ${key} (attempt ${attempt}/${MAX_ATTEMPTS})`,
        error,
      );
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1]),
        );
      }
    }
  }
  console.error(
    `[DrizzleSessionStore] ${operation} exhausted retries for DID ${key} — propagating error`,
  );
  throw lastError;
}

export class DrizzleSessionStore implements NodeSavedSessionStore {
  constructor(private db: PostgresJsDatabase) {}

  async get(key: string): Promise<NodeSavedSession | undefined> {
    return withRetry('get', key, async () => {
      const result = await this.db
        .select()
        .from(authSession)
        .where(eq(authSession.key, key))
        .limit(1);

      if (result.length === 0) return undefined;
      if (!result[0]) return undefined;

      return JSON.parse(result[0].session) as NodeSavedSession;
    });
  }

  async set(key: string, val: NodeSavedSession): Promise<void> {
    const session = JSON.stringify(val);

    return withRetry('set', key, async () => {
      // Use transaction to ensure atomic operation
      await this.db.transaction(async (tx) => {
        // First try to update existing record with row-level lock
        const existing = await tx
          .select()
          .from(authSession)
          .where(eq(authSession.key, key))
          .for('update')
          .limit(1);

        if (existing.length > 0) {
          // Update existing session
          await tx
            .update(authSession)
            .set({ session })
            .where(eq(authSession.key, key));
        } else {
          // Insert new session
          await tx.insert(authSession).values({ key, session });
        }
      });
    });
  }

  async del(key: string): Promise<void> {
    return withRetry('del', key, async () => {
      // Use transaction to ensure atomic deletion
      await this.db.transaction(async (tx) => {
        await tx.delete(authSession).where(eq(authSession.key, key));
      });
    });
  }
}
