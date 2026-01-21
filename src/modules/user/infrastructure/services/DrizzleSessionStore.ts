import {
  NodeSavedSession,
  NodeSavedSessionStore,
} from '@atproto/oauth-client-node';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, sql } from 'drizzle-orm';
import { authSession } from '../repositories/schema/authSession.sql';

export class DrizzleSessionStore implements NodeSavedSessionStore {
  constructor(private db: PostgresJsDatabase) {}

  async get(key: string): Promise<NodeSavedSession | undefined> {
    const result = await this.db
      .select()
      .from(authSession)
      .where(eq(authSession.key, key))
      .limit(1);

    if (result.length === 0) return undefined;
    if (!result[0]) return undefined;

    return JSON.parse(result[0].session) as NodeSavedSession;
  }

  async set(key: string, val: NodeSavedSession): Promise<void> {
    const session = JSON.stringify(val);

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
  }

  async del(key: string): Promise<void> {
    // Use transaction to ensure atomic deletion
    await this.db.transaction(async (tx) => {
      await tx.delete(authSession).where(eq(authSession.key, key));
    });
  }
}
