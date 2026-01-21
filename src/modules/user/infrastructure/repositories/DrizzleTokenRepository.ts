import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql } from 'drizzle-orm';
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
      const tokenPreview = '...' + token.refreshToken.slice(-8);
      console.log(
        `[DrizzleTokenRepository] Saving new refresh token: ${tokenPreview} for user: ${token.userDid}, expiresAt: ${token.expiresAt.toISOString()}`,
      );

      await this.db.insert(authRefreshTokens).values({
        tokenId: token.tokenId,
        userDid: token.userDid,
        refreshToken: token.refreshToken,
        issuedAt: token.issuedAt,
        expiresAt: token.expiresAt,
        revoked: token.revoked,
      });

      console.log(
        `[DrizzleTokenRepository] Successfully saved refresh token: ${tokenPreview}`,
      );
      return ok(undefined);
    } catch (error: any) {
      console.log(
        `[DrizzleTokenRepository] Failed to save refresh token: ${error.message}`,
      );
      return err(error);
    }
  }

  async findRefreshToken(
    refreshToken: string,
  ): Promise<Result<RefreshToken | null>> {
    try {
      const tokenPreview = '...' + refreshToken.slice(-8);
      console.log(
        `[DrizzleTokenRepository] Searching for token: ${tokenPreview}`,
      );

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

      console.log(
        `[DrizzleTokenRepository] Query returned ${result.length} results`,
      );

      if (result.length === 0) {
        // Check if token exists but is revoked
        const revokedResult = await this.db
          .select()
          .from(authRefreshTokens)
          .where(eq(authRefreshTokens.refreshToken, refreshToken))
          .limit(1);

        if (revokedResult.length > 0) {
          console.log(
            `[DrizzleTokenRepository] Token exists but is revoked: ${tokenPreview}`,
          );
        } else {
          console.log(
            `[DrizzleTokenRepository] Token does not exist in database: ${tokenPreview}`,
          );
        }

        return ok(null);
      }

      const token = result[0]!;
      console.log(
        `[DrizzleTokenRepository] Token found - userDid: ${token.userDid}, revoked: ${token.revoked}, expiresAt: ${token.expiresAt.toISOString()}`,
      );

      return ok({ ...token, revoked: token.revoked === true });
    } catch (error: any) {
      console.log(`[DrizzleTokenRepository] Database error: ${error.message}`);
      return err(error);
    }
  }

  async revokeRefreshToken(refreshToken: string): Promise<Result<void>> {
    try {
      const tokenPreview = '...' + refreshToken.slice(-8);
      console.log(
        `[DrizzleTokenRepository] Revoking refresh token: ${tokenPreview}`,
      );

      const result = await this.db
        .update(authRefreshTokens)
        .set({ revoked: true })
        .where(eq(authRefreshTokens.refreshToken, refreshToken));

      console.log(
        `[DrizzleTokenRepository] Successfully revoked refresh token: ${tokenPreview}`,
      );
      return ok(undefined);
    } catch (error: any) {
      console.log(
        `[DrizzleTokenRepository] Failed to revoke refresh token: ${error.message}`,
      );
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
      const tokenPreview = '...' + oldRefreshToken.slice(-8);
      console.log(
        `[DrizzleTokenRepository] Starting atomic refresh for token: ${tokenPreview}`,
      );

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
          console.log(
            `[DrizzleTokenRepository] Token not found or already revoked: ${tokenPreview}`,
          );
          return ok(null);
        }

        const oldToken = result[0]!;

        // Check if token is expired
        const now = new Date();
        if (now > oldToken.expiresAt) {
          // Revoke expired token
          await tx
            .update(authRefreshTokens)
            .set({ revoked: true })
            .where(eq(authRefreshTokens.refreshToken, oldRefreshToken));

          console.log(
            `[DrizzleTokenRepository] Token expired and revoked: ${tokenPreview}`,
          );
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

        // Revoke old token
        await tx
          .update(authRefreshTokens)
          .set({ revoked: true })
          .where(eq(authRefreshTokens.refreshToken, oldRefreshToken));

        console.log(
          `[DrizzleTokenRepository] Atomic refresh completed successfully`,
        );

        return ok({ ...oldToken, revoked: false });
      });
    } catch (error: any) {
      console.log(
        `[DrizzleTokenRepository] Atomic refresh failed: ${error.message}`,
      );
      return err(error);
    }
  }
}
