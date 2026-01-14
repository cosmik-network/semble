import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { Result, err, ok } from 'src/shared/core/Result';
import {
  IOAuthProcessor,
  AuthResult,
} from '../../../user/application/services/IOAuthProcessor';
import { OAuthCallbackDTO } from '@semble/types';

export class AtProtoOAuthProcessor implements IOAuthProcessor {
  private client: NodeOAuthClient;

  constructor(client: NodeOAuthClient) {
    this.client = client;
  }

  async generateAuthUrl(handle: string): Promise<Result<string>> {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const url = await this.client.authorize(handle, {
          scope: this.client.clientMetadata.scope,
        });
        return ok(url.toString());
      } catch (error: any) {
        // If it's a client metadata error and we have retries left, wait and retry
        if (error.error === 'invalid_client_metadata' && attempt < maxRetries) {
          console.log(
            `OAuth client metadata fetch failed (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay}ms...`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * attempt),
          );
          continue;
        }

        // If it's the final attempt or a different error, return the error
        return err(error);
      }
    }

    // This should never be reached, but TypeScript requires it
    return err(new Error('Unexpected error in generateAuthUrl'));
  }

  async processCallback(params: OAuthCallbackDTO): Promise<Result<AuthResult>> {
    try {
      // Convert params to URLSearchParams
      const searchParams = new URLSearchParams();
      searchParams.append('code', params.code);
      searchParams.append('state', params.state);
      searchParams.append('iss', params.iss);

      const { session } = await this.client.callback(searchParams);

      return ok({
        did: session.did,
      });
    } catch (error: any) {
      return err(error);
    }
  }
}
