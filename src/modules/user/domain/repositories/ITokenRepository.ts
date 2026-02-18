import { Result } from 'src/shared/core/Result';

export interface RefreshToken {
  tokenId: string;
  userDid: string;
  refreshToken: string;
  issuedAt: Date;
  expiresAt: Date;
  revoked: boolean;
}

export interface ITokenRepository {
  saveRefreshToken(token: RefreshToken): Promise<Result<void>>;
  findRefreshToken(refreshToken: string): Promise<Result<RefreshToken | null>>;
  revokeRefreshToken(refreshToken: string): Promise<Result<void>>;
  atomicRefreshTokenOperation(
    oldRefreshToken: string,
    newToken: RefreshToken,
  ): Promise<Result<RefreshToken | null>>;
}
