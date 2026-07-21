import { Result, err, ok } from 'src/shared/core/Result';
import {
  IOAuthProcessor,
  AuthResult,
} from '../../../user/application/services/IOAuthProcessor';
import { OAuthCallbackDTO, paths } from '@semble/types';
import { ITokenService } from '../../../user/application/services/ITokenService';
import { configService } from 'src/shared/infrastructure/config';

export class FakeAtProtoOAuthProcessor implements IOAuthProcessor {
  constructor(private tokenService: ITokenService) {}

  async generateAuthUrl(
    handle?: string,
    appState?: string,
  ): Promise<Result<string>> {
    try {
      // Encode the handle + appState in the state parameter so we can decode
      // both later (the real atproto lib round-trips a separate state string,
      // but the mock reuses the OAuth `state` param for handle transport).
      const state = this.encodeState(handle || '', appState);
      const baseUrl = configService.getAtProtoConfig().baseUrl;
      const mockUrl = `${baseUrl}/api${paths.oauthCallback}?code=mockCode&state=${state}&iss=mockIssuer`;
      return ok(mockUrl);
    } catch (error: any) {
      return err(error);
    }
  }

  async processCallback(params: OAuthCallbackDTO): Promise<Result<AuthResult>> {
    try {
      // Decode handle + appState from the state parameter
      const { handle, appState } = this.decodeState(params.state);

      // Get mock data based on handle
      const mockData = this.getMockDataForHandle(handle);

      return ok({
        did: mockData.did,
        handle: mockData.handle,
        appState,
      });
    } catch (error: any) {
      return err(error);
    }
  }

  private encodeState(handle: string, appState?: string): string {
    // Base64 encode a JSON payload carrying both handle and appState.
    return Buffer.from(JSON.stringify({ handle, appState })).toString('base64');
  }

  private decodeState(state: string): { handle: string; appState?: string } {
    try {
      const decoded = Buffer.from(state, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      return { handle: parsed.handle, appState: parsed.appState };
    } catch (error) {
      // If decoding fails, default to the first account
      return {
        handle: process.env.BSKY_HANDLE_1 || 'alice.bsky.social',
      };
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
