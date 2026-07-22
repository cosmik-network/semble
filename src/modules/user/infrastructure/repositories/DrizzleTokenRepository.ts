import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { Result, err, ok } from 'src/shared/core/Result';
import {
  ITokenRepository,
  RefreshToken,
} from '../../domain/repositories/ITokenRepository';
import { authRefreshTokens } from './schema/authToken.sql';

export class DrizzleTokenRepository implements ITokenRepository {
  constructor(private db: PostgresJsDatabase) {}

  async saveRefreshToken(token: RefreshToken): Promise<Result<void>> {
    try {
      await this.db.insert(authRefreshTokens).values({
        tokenId: token.tokenId,
        userDid: token.userDid,
        refreshToken: token.refreshToken,
        issuedAt: token.issuedAt,
        expiresAt: token.expiresAt,
        revoked: token.revoked,
      });

      return ok(undefined);
    } catch (error: any) {
      return err(error);
    }
  }

  async findRefreshToken(
    refreshToken: string,
  ): Promise<Result<RefreshToken | null>> {
    try {
      const result = await this.db
        .select()
        .from(authRefreshTokens)
        .where(
          and(
            eq(authRefreshTokens.refreshToken, refreshToken),
            eq(authRefreshTokens.revoked, false),
          ),
        )
        .limit(1);

      if (result.length === 0) {
        return ok(null);
      }

      const token = result[0]!;

      return ok({ ...token, revoked: token.revoked === true });
    } catch (error: any) {
      return err(error);
    }
  }

  async revokeRefreshToken(refreshToken: string): Promise<Result<void>> {
    try {
      await this.db
        .update(authRefreshTokens)
        .set({ revoked: true })
        .where(eq(authRefreshTokens.refreshToken, refreshToken));

      return ok(undefined);
    } catch (error: any) {
      return err(error);
    }
  }

  /**
   * Atomically finds a refresh token with row-level lock, saves a new token, and revokes the old one.
   * This prevents concurrent refresh operations from creating duplicate tokens.
   */
  async atomicRefreshTokenOperation(
    oldRefreshToken: string,
    newToken: RefreshToken,
  ): Promise<Result<RefreshToken | null>> {
    try {
      return await this.db.transaction(async (tx) => {
        // Find and lock the old token for update
        const result = await tx
          .select()
          .from(authRefreshTokens)
          .where(
            and(
              eq(authRefreshTokens.refreshToken, oldRefreshToken),
              eq(authRefreshTokens.revoked, false),
            ),
          )
          .for('update')
          .limit(1);

        if (result.length === 0) {
          return ok(null);
        }

        const oldToken = result[0]!;

        // Check if token is expired
        const now = new Date();
        if (now > oldToken.expiresAt) {
          // Revoke expired token (by primary key - avoids re-scanning by refresh_token)
          await tx
            .update(authRefreshTokens)
            .set({ revoked: true })
            .where(eq(authRefreshTokens.tokenId, oldToken.tokenId));

          return ok(null);
        }

        // Insert new refresh token
        await tx.insert(authRefreshTokens).values({
          tokenId: newToken.tokenId,
          userDid: newToken.userDid,
          refreshToken: newToken.refreshToken,
          issuedAt: newToken.issuedAt,
          expiresAt: newToken.expiresAt,
          revoked: newToken.revoked,
        });

        // Revoke old token (by primary key - avoids re-scanning by refresh_token)
        await tx
          .update(authRefreshTokens)
          .set({ revoked: true })
          .where(eq(authRefreshTokens.tokenId, oldToken.tokenId));

        return ok({ ...oldToken, revoked: false });
      });
    } catch (error: any) {
      return err(error);
    }
  }
}
