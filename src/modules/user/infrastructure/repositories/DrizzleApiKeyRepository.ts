import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, eq, desc } from 'drizzle-orm';
import { Result, err, ok } from 'src/shared/core/Result';
import {
  ApiKeyRecord,
  IApiKeyRepository,
} from '../../domain/repositories/IApiKeyRepository';
import { apiKeys } from './schema/apiKey.sql';

function rowToRecord(row: typeof apiKeys.$inferSelect): ApiKeyRecord {
  return {
    id: row.id,
    userDid: row.userDid,
    name: row.name,
    prefix: row.prefix,
    tokenHash: row.tokenHash,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt ?? null,
    expiresAt: row.expiresAt ?? null,
    revoked: row.revoked,
  };
}

export class DrizzleApiKeyRepository implements IApiKeyRepository {
  constructor(private db: PostgresJsDatabase) {}

  async save(key: ApiKeyRecord): Promise<Result<void>> {
    try {
      await this.db.insert(apiKeys).values({
        id: key.id,
        userDid: key.userDid,
        name: key.name,
        prefix: key.prefix,
        tokenHash: key.tokenHash,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        revoked: key.revoked,
      });
      return ok(undefined);
    } catch (error: any) {
      return err(error);
    }
  }

  async listByUser(userDid: string): Promise<Result<ApiKeyRecord[]>> {
    try {
      const rows = await this.db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.userDid, userDid), eq(apiKeys.revoked, false)))
        .orderBy(desc(apiKeys.createdAt));
      return ok(rows.map(rowToRecord));
    } catch (error: any) {
      return err(error);
    }
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<Result<ApiKeyRecord | null>> {
    try {
      const rows = await this.db
        .select()
        .from(apiKeys)
        .where(
          and(eq(apiKeys.tokenHash, tokenHash), eq(apiKeys.revoked, false)),
        )
        .limit(1);
      const row = rows[0];
      return ok(row ? rowToRecord(row) : null);
    } catch (error: any) {
      return err(error);
    }
  }

  async findByIdForUser(
    id: string,
    userDid: string,
  ): Promise<Result<ApiKeyRecord | null>> {
    try {
      const rows = await this.db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.id, id), eq(apiKeys.userDid, userDid)))
        .limit(1);
      const row = rows[0];
      return ok(row ? rowToRecord(row) : null);
    } catch (error: any) {
      return err(error);
    }
  }

  async updateName(
    id: string,
    userDid: string,
    name: string,
  ): Promise<Result<ApiKeyRecord | null>> {
    try {
      const updated = await this.db
        .update(apiKeys)
        .set({ name })
        .where(
          and(
            eq(apiKeys.id, id),
            eq(apiKeys.userDid, userDid),
            eq(apiKeys.revoked, false),
          ),
        )
        .returning();
      const row = updated[0];
      return ok(row ? rowToRecord(row) : null);
    } catch (error: any) {
      return err(error);
    }
  }

  async touchLastUsed(id: string, when: Date): Promise<Result<void>> {
    try {
      await this.db
        .update(apiKeys)
        .set({ lastUsedAt: when })
        .where(eq(apiKeys.id, id));
      return ok(undefined);
    } catch (error: any) {
      return err(error);
    }
  }

  async revoke(id: string, userDid: string): Promise<Result<boolean>> {
    try {
      const updated = await this.db
        .update(apiKeys)
        .set({ revoked: true })
        .where(
          and(
            eq(apiKeys.id, id),
            eq(apiKeys.userDid, userDid),
            eq(apiKeys.revoked, false),
          ),
        )
        .returning({ id: apiKeys.id });
      return ok(updated.length > 0);
    } catch (error: any) {
      return err(error);
    }
  }
}
