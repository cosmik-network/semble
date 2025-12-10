import { Result, err, ok } from 'src/shared/core/Result';
import {
  IOAuthProcessor,
  AuthResult,
} from '../../../user/application/services/IOAuthProcessor';
import { OAuthCallbackDTO } from '@semble/types';
import { ITokenService } from '../../../user/application/services/ITokenService';

export class FakeAtProtoOAuthProcessor implements IOAuthProcessor {
  constructor(private tokenService: ITokenService) {}

  async generateAuthUrl(handle?: string): Promise<Result<string>> {
    try {
      // Include the handle in the mock URL so we can identify which account to use
      const mockUrl = `http://127.0.0.1:3000/api/users/oauth/callback?code=mockCode&state=mockState&iss=mockIssuer&handle=${encodeURIComponent(handle || '')}`;
      return ok(mockUrl);
    } catch (error: any) {
      return err(error);
    }
  }

  async processCallback(params: OAuthCallbackDTO): Promise<Result<AuthResult>> {
    try {
      // Extract handle from the callback params or use a default
      const handle = (params as any).handle || this.getHandleFromState(params.state);
      
      // Get mock data based on handle
      const mockData = this.getMockDataForHandle(handle);
      
      return ok({
        did: mockData.did,
        handle: mockData.handle,
      });
    } catch (error: any) {
      return err(error);
    }
  }

  private getHandleFromState(state: string): string {
    // In a real implementation, you'd decode the state to get the original handle
    // For mock, we'll default to the first account
    return process.env.BSKY_HANDLE_1 || 'alice.bsky.social';
  }

  private getMockDataForHandle(handle?: string): { did: string; handle: string } {
    // Default to first account if no handle provided
    if (!handle) {
      return {
        did: process.env.BSKY_DID_1 || 'did:plc:mock123',
        handle: process.env.BSKY_HANDLE_1 || 'alice.bsky.social',
      };
    }

    // Check if handle matches account 2
    const handle2 = process.env.BSKY_HANDLE_2 || 'bob.bsky.social';
    if (handle === handle2 || handle.includes('bob')) {
      return {
        did: process.env.BSKY_DID_2 || 'did:plc:mock456',
        handle: handle2,
      };
    }

    // Default to account 1
    return {
      did: process.env.BSKY_DID_1 || 'did:plc:mock123',
      handle: process.env.BSKY_HANDLE_1 || 'alice.bsky.social',
    };
  }
}
