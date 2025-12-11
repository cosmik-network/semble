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
      // Encode the handle in the state parameter so we can decode it later
      const state = this.encodeState(handle || '');
      const mockUrl = `http://127.0.0.1:3000/api/users/oauth/callback?code=mockCode&state=${state}&iss=mockIssuer`;
      return ok(mockUrl);
    } catch (error: any) {
      return err(error);
    }
  }

  async processCallback(params: OAuthCallbackDTO): Promise<Result<AuthResult>> {
    try {
      // Decode handle from the state parameter
      const handle = this.decodeState(params.state);

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

  private encodeState(handle: string): string {
    // Simple base64 encoding of the handle for the mock state
    return Buffer.from(handle).toString('base64');
  }

  private decodeState(state: string): string {
    try {
      // Decode the handle from the base64 state
      return Buffer.from(state, 'base64').toString('utf8');
    } catch (error) {
      // If decoding fails, default to the first account
      return process.env.BSKY_HANDLE_1 || 'alice.bsky.social';
    }
  }

  private getMockDataForHandle(handle?: string): {
    did: string;
    handle: string;
  } {
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
