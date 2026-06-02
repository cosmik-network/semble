import { Result, ok, err } from 'src/shared/core/Result';
import { IAppPasswordSessionService } from '../../application/IAppPasswordSessionService';
import { AtpSessionData } from '@atproto/api';

export class FakeAppPasswordSessionService implements IAppPasswordSessionService {
  async getSession(did: string): Promise<Result<AtpSessionData>> {
    try {
      // Use mock data from environment variables
      const mockDid = process.env.BSKY_DID || 'did:plc:mock123';
      const mockHandle = process.env.BSKY_HANDLE || 'mock.bsky.social';
      const mockAccessToken =
        process.env.MOCK_ACCESS_TOKEN || 'mock-access-token-123';
      const mockRefreshToken =
        process.env.MOCK_REFRESH_TOKEN || 'mock-refresh-token-456';

      const mockSession: AtpSessionData = {
        did: mockDid,
        handle: mockHandle,
        accessJwt: mockAccessToken,
        refreshJwt: mockRefreshToken,
        active: true,
      };

      return ok(mockSession);
    } catch (error: any) {
      return err(error);
    }
  }

  async createSession(
    identifier: string,
    appPassword: string,
  ): Promise<Result<AtpSessionData>> {
    try {
      // Use mock data from environment variables
      const mockDid = process.env.BSKY_DID || 'did:plc:mock123';
      const mockHandle = process.env.BSKY_HANDLE || 'mock.bsky.social';
      const mockAccessToken =
        process.env.MOCK_ACCESS_TOKEN || 'mock-access-token-123';
      const mockRefreshToken =
        process.env.MOCK_REFRESH_TOKEN || 'mock-refresh-token-456';

      // Simulate successful session creation with any identifier/password
      const mockSession: AtpSessionData = {
        did: mockDid,
        handle: mockHandle,
        accessJwt: mockAccessToken,
        refreshJwt: mockRefreshToken,
        active: true,
      };

      return ok(mockSession);
    } catch (error: any) {
      return err(error);
    }
  }
}
