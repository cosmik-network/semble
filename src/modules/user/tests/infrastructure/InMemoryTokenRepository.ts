import { Result, ok, err } from 'src/shared/core/Result';
import {
  ITokenRepository,
  RefreshToken,
} from '../../domain/repositories/ITokenRepository';

export class InMemoryTokenRepository implements ITokenRepository {
  private static instance: InMemoryTokenRepository;
  private tokens: Map<string, RefreshToken> = new Map();

  private constructor() {}

  public static getInstance(): InMemoryTokenRepository {
    if (!InMemoryTokenRepository.instance) {
      InMemoryTokenRepository.instance = new InMemoryTokenRepository();
    }
    return InMemoryTokenRepository.instance;
  }

  async saveRefreshToken(token: RefreshToken): Promise<Result<void>> {
    try {
      this.tokens.set(token.refreshToken, token);
      return ok(undefined);
    } catch (error: any) {
      return err(error);
    }
  }

  async findRefreshToken(
    refreshToken: string,
  ): Promise<Result<RefreshToken | null>> {
    try {
      const token = this.tokens.get(refreshToken);
      if (!token || token.revoked) {
        return ok(null);
      }
      return ok(token);
    } catch (error: any) {
      return err(error);
    }
  }

  async revokeRefreshToken(refreshToken: string): Promise<Result<void>> {
    try {
      const token = this.tokens.get(refreshToken);
      if (token) {
        token.revoked = true;
        this.tokens.set(refreshToken, token);
      }
      return ok(undefined);
    } catch (error: any) {
      return err(error);
    }
  }

  async atomicRefreshTokenOperation(
    oldRefreshToken: string,
    newToken: RefreshToken,
  ): Promise<Result<RefreshToken | null>> {
    try {
      // Find old token
      const oldToken = this.tokens.get(oldRefreshToken);
      if (!oldToken || oldToken.revoked) {
        return ok(null);
      }

      // Check if expired
      const now = new Date();
      if (now > oldToken.expiresAt) {
        oldToken.revoked = true;
        this.tokens.set(oldRefreshToken, oldToken);
        return ok(null);
      }

      // Save new token
      this.tokens.set(newToken.refreshToken, newToken);

      // Revoke old token
      oldToken.revoked = true;
      this.tokens.set(oldRefreshToken, oldToken);

      return ok({ ...oldToken, revoked: false });
    } catch (error: any) {
      return err(error);
    }
  }

  // Helper method for testing
  clear(): void {
    this.tokens.clear();
  }
}
