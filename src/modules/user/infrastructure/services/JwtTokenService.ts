import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Result, err, ok } from 'src/shared/core/Result';
import { ITokenService } from '../../application/services/ITokenService';
import { TokenPair } from '@semble/types';
import { ITokenRepository } from '../../domain/repositories/ITokenRepository';

const ENABLE_AUTH_LOGGING = true;

export class JwtTokenService implements ITokenService {
  constructor(
    private tokenRepository: ITokenRepository,
    private jwtSecret: string,
    private accessTokenExpiresIn: number = 3600, // 1 hour
    private refreshTokenExpiresIn: number = 2592000, // 30 days
  ) {}

  async generateToken(did: string): Promise<Result<TokenPair>> {
    try {
      // Generate access token
      const accessToken = jwt.sign(
        { did, iat: Math.floor(Date.now() / 1000) },
        this.jwtSecret,
        { expiresIn: this.accessTokenExpiresIn },
      );

      // Generate refresh token
      const refreshToken = uuidv4();
      const tokenId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + this.refreshTokenExpiresIn * 1000,
      );

      // Store refresh token
      const saveResult = await this.tokenRepository.saveRefreshToken({
        tokenId,
        userDid: did,
        refreshToken,
        issuedAt: now,
        expiresAt,
        revoked: false,
      });

      if (saveResult.isErr()) {
        return err(saveResult.error);
      }

      return ok({
        accessToken,
        refreshToken,
        expiresIn: this.accessTokenExpiresIn,
      });
    } catch (error: any) {
      return err(error);
    }
  }

  async validateToken(token: string): Promise<Result<string | null>> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { did: string };
      return ok(decoded.did);
    } catch (error: any) {
      if (ENABLE_AUTH_LOGGING) {
        console.log(
          `[JwtTokenService] Token validation failed: ${error.message}`,
        );
      }
      return ok(null); // Token is invalid or expired
    }
  }

  async refreshToken(refreshToken: string): Promise<Result<TokenPair | null>> {
    try {
      if (ENABLE_AUTH_LOGGING) {
        const tokenPreview = '...' + refreshToken.slice(-8);
        console.log(
          `[JwtTokenService] Starting refresh for token: ${tokenPreview}`,
        );
      }

      // First, find the token to get the userDid
      const findResult =
        await this.tokenRepository.findRefreshToken(refreshToken);

      if (findResult.isErr()) {
        if (ENABLE_AUTH_LOGGING) {
          console.log(
            `[JwtTokenService] Database error finding token: ${findResult.error.message}`,
          );
        }
        return err(findResult.error);
      }

      const tokenData = findResult.unwrap();
      if (!tokenData) {
        if (ENABLE_AUTH_LOGGING) {
          console.log(`[JwtTokenService] Token not found in database`);
        }
        return ok(null);
      }

      // Generate new tokens with the correct DID
      const accessToken = jwt.sign(
        { did: tokenData.userDid, type: 'access' },
        this.jwtSecret,
        { expiresIn: this.accessTokenExpiresIn },
      );

      const newRefreshToken = jwt.sign({ type: 'refresh' }, this.jwtSecret, {
        expiresIn: this.refreshTokenExpiresIn,
      });

      const tokenId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + this.refreshTokenExpiresIn * 1000,
      );

      // Perform atomic refresh operation
      const atomicResult =
        await this.tokenRepository.atomicRefreshTokenOperation(refreshToken, {
          tokenId,
          userDid: tokenData.userDid,
          refreshToken: newRefreshToken,
          issuedAt: now,
          expiresAt,
          revoked: false,
        });

      if (atomicResult.isErr()) {
        if (ENABLE_AUTH_LOGGING) {
          console.log(
            `[JwtTokenService] Atomic refresh failed: ${atomicResult.error.message}`,
          );
        }
        return err(atomicResult.error);
      }

      const result = atomicResult.unwrap();
      if (!result) {
        if (ENABLE_AUTH_LOGGING) {
          console.log(
            `[JwtTokenService] Token expired or already used in concurrent refresh`,
          );
        }
        return ok(null);
      }

      if (ENABLE_AUTH_LOGGING) {
        console.log(`[JwtTokenService] Token refresh completed successfully`);
      }

      return ok({
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.accessTokenExpiresIn,
      });
    } catch (error: any) {
      if (ENABLE_AUTH_LOGGING) {
        console.log(
          `[JwtTokenService] Unexpected error during refresh: ${error.message}`,
        );
      }
      return err(error);
    }
  }

  async revokeToken(refreshToken: string): Promise<Result<void>> {
    try {
      const revokeResult =
        await this.tokenRepository.revokeRefreshToken(refreshToken);

      if (revokeResult.isErr()) {
        return err(revokeResult.error);
      }

      return ok(undefined);
    } catch (error: any) {
      return err(error);
    }
  }
}
